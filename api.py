"""
JudolGuard FastAPI Backend
Endpoint: POST /predict — menerima fitur transaksi, return risk score + level
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import numpy as np
import os

app = FastAPI(
    title="JudolGuard API",
    description="Real-time gambling transaction risk scoring powered by Isolation Forest + XGBoost",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load models ──────────────────────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

try:
    isolation_forest = joblib.load(os.path.join(MODEL_DIR, "isolation_forest.pkl"))
    xgb_model        = joblib.load(os.path.join(MODEL_DIR, "xgb_judolguard.pkl"))
    print("✓ Models loaded successfully")
except Exception as e:
    print(f"✗ Model loading failed: {e}")
    isolation_forest = None
    xgb_model = None

# ── Schema ───────────────────────────────────────────────────────────────────
class TransactionFeatures(BaseModel):
    """
    Fitur yang sama persis dengan yang dipakai saat training XGBoost:
      - FEATURE_COLS = [temporal_shift, amount_vs_avg_7d, total_amount_7d]
      - anomaly_score dihitung otomatis dari Isolation Forest
    """
    temporal_shift:    float = Field(..., ge=-1.0, le=1.0,   description="Pergeseran pola waktu transaksi (-1 s/d 1)")
    amount_vs_avg_7d:  float = Field(..., ge=0.0,  le=50.0,  description="Rasio nominal vs rata-rata 7 hari (1=normal)")
    total_amount_7d:   float = Field(..., ge=0.0,             description="Total nominal transaksi 7 hari (juta Rp)")

    # Extra context fields (tidak dipakai model, hanya untuk response enrichment)
    night_ratio_7d:   float = Field(0.0, ge=0.0, le=1.0,    description="Rasio transaksi malam (0-1)")
    tx_count_24h:     float = Field(0.0, ge=0.0,             description="Jumlah transaksi 24 jam terakhir")
    burst_score:      float = Field(0.0, ge=0.0,             description="Skor lonjakan aktivitas mendadak")
    unique_recv_7d:   float = Field(0.0, ge=0.0,             description="Jumlah penerima unik 7 hari")
    qris_ratio_7d:    float = Field(0.0, ge=0.0, le=1.0,    description="Rasio transaksi via QRIS (0-1)")

class PredictionResponse(BaseModel):
    risk_score:       float
    risk_level:       str
    recommendation:   str
    anomaly_score:    float
    top_triggers:     list[str]
    confidence:       str

# ── Helpers ──────────────────────────────────────────────────────────────────
def assign_risk_level(score: float) -> str:
    if score <= 30:   return "Low"
    elif score <= 60: return "Medium"
    elif score <= 80: return "High"
    else:             return "Critical"

def assign_recommendation(level: str) -> str:
    recs = {
        "Low":      "Monitor pasif — tidak ada tindakan segera",
        "Medium":   "Kirim notifikasi edukasi ke nasabah",
        "High":     "Batasi nominal transfer harian, minta konfirmasi",
        "Critical": "Eskalasi ke tim compliance & flag ke OJK",
    }
    return recs.get(level, "")

def get_triggers(features: TransactionFeatures) -> list[str]:
    candidates = {
        "Aktivitas malam tinggi":  features.night_ratio_7d,
        "Pergeseran ke malam":     max(features.temporal_shift, 0),
        "Velocity burst":          min(features.burst_score / 5, 1.0),
        "Banyak penerima":         min(features.unique_recv_7d / 10, 1.0),
        "Frekuensi tinggi":        min(features.tx_count_24h / 20, 1.0),
        "Nominal tidak wajar":     min((features.amount_vs_avg_7d - 1) / 10, 1.0) if features.amount_vs_avg_7d > 1 else 0,
        "Penggunaan QRIS tinggi":  features.qris_ratio_7d,
    }
    top = sorted(candidates.items(), key=lambda x: x[1], reverse=True)[:3]
    return [t[0] for t in top if t[1] > 0.05]

# ── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "JudolGuard API is running 🛡️", "version": "1.0.0"}

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "isolation_forest": isolation_forest is not None,
        "xgb_model": xgb_model is not None,
    }

@app.post("/predict", response_model=PredictionResponse)
def predict(features: TransactionFeatures):
    if isolation_forest is None or xgb_model is None:
        raise HTTPException(status_code=503, detail="Models not loaded")

    # Step 1: Hitung anomaly_score via Isolation Forest
    X_base = np.array([[
        features.temporal_shift,
        features.amount_vs_avg_7d,
        features.total_amount_7d,
    ]])

    raw_scores = isolation_forest.score_samples(X_base)
    # Normalisasi ke [0,1] — pakai range training (approx: -0.6 to -0.1)
    anomaly_score = float(np.clip(1 - ((raw_scores[0] + 0.6) / 0.5), 0, 1))

    # Step 2: Prediksi XGBoost (FEATURE_COLS + anomaly_score)
    X_final = np.array([[
        features.temporal_shift,
        features.amount_vs_avg_7d,
        features.total_amount_7d,
        anomaly_score,
    ]])

    prob       = float(xgb_model.predict_proba(X_final)[0][1])
    risk_score = round(prob * 100, 1)
    risk_level = assign_risk_level(risk_score)

    return PredictionResponse(
        risk_score     = risk_score,
        risk_level     = risk_level,
        recommendation = assign_recommendation(risk_level),
        anomaly_score  = round(anomaly_score, 4),
        top_triggers   = get_triggers(features),
        confidence     = f"{prob:.1%}",
    )

@app.post("/predict/batch")
def predict_batch(transactions: list[TransactionFeatures]):
    """Prediksi batch hingga 100 transaksi sekaligus"""
    if len(transactions) > 100:
        raise HTTPException(status_code=400, detail="Max 100 transactions per batch")
    return [predict(t) for t in transactions]

# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
