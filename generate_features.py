"""
generate_features.py — Buat judolguard_features.csv dari judolguard_.csv
==========================================================================
judolguard_features.csv dipakai oleh main_api.py untuk:
  - GET /api/accounts/{account_id}  → timeline per hari
  - GET /api/network/{account_id}   → avg_unique_recv, avg_burst_score

Format output: satu baris per (account_id, day) — alias transaction-level
dengan kolom yang sama persis seperti yang di-query di main_api.py:
  day, tx_count_24h, night_ratio_7d, temporal_shift,
  burst_score, unique_recv_7d, amount
"""

import pandas as pd
import numpy as np

print("📂 Membaca judolguard_.csv...")
df = pd.read_csv("data/judolguard_.csv")
print(f"   Raw rows: {len(df):,}  |  Akun unik: {df['account_id'].nunique()}")

# ── Kolom yang dibutuhkan main_api.py untuk timeline ──────────────
TIMELINE_COLS = [
    "account_id", "day",
    "tx_count_24h", "night_ratio_7d", "temporal_shift",
    "burst_score", "unique_recv_7d", "amount"
]

# ── Ambil satu record per akun per hari (nilai terakhir dalam hari itu) ──
# Ini merepresentasikan "snapshot" kondisi akun di akhir hari
feat = (
    df.sort_values(["account_id", "day", "step"])
      .groupby(["account_id", "day"], as_index=False)
      .last()  # ambil record terakhir tiap hari sebagai daily snapshot
)[TIMELINE_COLS]

print(f"   Feature rows (account × day): {len(feat):,}")
print(f"   Sample:\n{feat.head(5).to_string(index=False)}")

# ── Simpan ────────────────────────────────────────────────────────
out_path = "data/judolguard_features.csv"
feat.to_csv(out_path, index=False)
print(f"\n✅ Tersimpan → {out_path}  ({len(feat):,} baris)")

# ── Verifikasi: cek akun yang ada di risk_scores juga ada di features ──
risk = pd.read_csv("data/risk_scores.csv")
overlap = set(risk["account_id"]) & set(feat["account_id"])
print(f"✅ Akun overlap (risk_scores ∩ features): {len(overlap)} dari {len(risk)} akun")
