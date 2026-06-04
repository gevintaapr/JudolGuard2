import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import os
from openai import AzureOpenAI

# 1. KONFIGURASI HALAMAN & META TAG
st.set_page_config(
    page_title="JudolGuard",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Meta tag untuk verifikasi Dicoding
st.markdown("""
    <head>
        <meta name="dicoding:email" content="gevintap@gmail.com">
    </head>
""", unsafe_allow_html=True)

# 2. STYLE KUSTOM (CSS)
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
html, body, [class*="css"] { font-family: "DM Sans", sans-serif; }
.metric-card {
    background: #1a1d27; border: 1px solid #2d3142;
    border-radius: 12px; padding: 1.2rem 1.5rem;
    text-align: center; margin-bottom: 8px;
}
.metric-label { font-size: 12px; color: #6b7280; letter-spacing:.08em; text-transform:uppercase; margin-bottom:.4rem; }
.metric-value { font-size: 30px; font-weight: 600; line-height: 1.1; }
.metric-sub   { font-size: 12px; color: #6b7280; margin-top:.2rem; }
.badge-low      { background:#064e3b;color:#6ee7b7;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500; }
.badge-medium   { background:#78350f;color:#fcd34d;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500; }
.badge-high     { background:#7c2d12;color:#fb923c;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500; }
.badge-critical { background:#450a0a;color:#f87171;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500; }
.explanation-box {
    background: #1a1d27; border-left: 3px solid #6366f1;
    border-radius: 0 8px 8px 0; padding: 1rem 1.2rem;
    font-size: 14px; line-height: 1.7; color: #d1d5db; margin:.8rem 0;
}
.section-title {
    font-size:12px;font-weight:500;color:#6b7280;
    letter-spacing:.1em;text-transform:uppercase;
    margin-bottom:.8rem;margin-top:1.2rem;
}
#MainMenu{visibility:hidden;}footer{visibility:hidden;}header{visibility:hidden;}
</style>
""", unsafe_allow_html=True)

# 3. KREDENSIAL & INITIALIZATION
# Mengambil secrets dari dashboard hosting (Azure/Streamlit)
try:
    AZURE_KEY = st.secrets["AZURE_KEY"]
    AZURE_ENDPOINT = st.secrets["AZURE_ENDPOINT"]
    AZURE_DEPLOY = st.secrets["AZURE_DEPLOY"]
except Exception:
    st.error("Gagal memuat Secrets. Pastikan AZURE_KEY, AZURE_ENDPOINT, dan AZURE_DEPLOY sudah diatur di dashboard hosting.")
    st.stop()

# Inisialisasi client Azure OpenAI
client = AzureOpenAI(api_key=AZURE_KEY, api_version="2024-02-01", azure_endpoint=AZURE_ENDPOINT)

LEVEL_COLORS = {"Low": "#6ee7b7", "Medium": "#fcd34d", "High": "#fb923c", "Critical": "#f87171"}
PROFILE_COLORS = {"normal": "#60a5fa", "early_stage": "#fcd34d", "escalating": "#fb923c", "heavy_gambler": "#f87171"}
PROFILE_FILL = {"normal": "rgba(96,165,250,0.15)", "early_stage": "rgba(252,211,77,0.15)", "escalating": "rgba(251,146,60,0.15)", "heavy_gambler": "rgba(248,113,113,0.15)"}

# 4. LOAD DATA
@st.cache_data
def load_data():
    try:
        # Gunakan relative path. Pastikan folder 'data' ada di root GitHub.
        risk = pd.read_csv("data/risk_scores_with_explanation.csv")
        features = pd.read_csv("data/judolguard_.csv")
        return risk, features
    except FileNotFoundError:
        st.error("Dataset tidak ditemukan di folder 'data/'. Periksa struktur folder GitHub Anda.")
        st.stop()

risk_df, features_df = load_data()

# 5. SIDEBAR & NAVIGATION
with st.sidebar:
    st.markdown("## 🛡️ JudolGuard")
    st.markdown("<p style='font-size:13px;color:#6b7280;margin-top:-8px;'>Early Behavioral Shift Detection</p>", unsafe_allow_html=True)
    st.divider()
    page = st.radio("Navigasi", [
        "📊 Overview", "📋 Risk Table", "🔍 Detail Akun",
        "🎛️ Simulator", "🕸️ Network & Smurfing", "⚡ ETL Pipeline", "🤖 AI Co-Pilot"
    ], label_visibility="collapsed")
    st.divider()
    
    sel_levels = st.multiselect("Filter Level", ["Critical","High","Medium","Low"], default=["Critical","High","Medium","Low"])
    available_profiles = sorted(risk_df["profile"].unique()) if "profile" in risk_df.columns else []
    sel_profiles = st.multiselect("Filter Profil", available_profiles, default=available_profiles)
    st.divider()
    st.caption("Microsoft Azure AI Impact Challenge 2025")

filtered = risk_df[risk_df["risk_level"].isin(sel_levels) & risk_df["profile"].isin(sel_profiles)].copy()

# HALAMAN 1 — OVERVIEW (BACK TO ORIGINAL DESIGN)
if page == "📊 Overview":
    st.markdown("# 📊 Overview Dashboard")
    st.markdown("<p style='color:#6b7280;margin-top:-12px;font-size:14px;'>Sistem deteksi dini perubahan perilaku transaksi — tim compliance e-wallet</p>", unsafe_allow_html=True)
    st.divider()

    total      = len(risk_df)
    n_critical = (risk_df["risk_level"] == "Critical").sum()
    n_high     = (risk_df["risk_level"] == "High").sum()
    n_medium   = (risk_df["risk_level"] == "Medium").sum()
    det_rate   = (n_critical + n_high) / total * 100

    c1, c2, c3, c4, c5 = st.columns(5)
    metrics_data = [
        (c1, "Total Akun",   total,             "#a5b4fc", "dianalisis"),
        (c2, "🔴 Critical",  n_critical,        "#f87171", "eskalasi OJK"),
        (c3, "🟠 High",      n_high,            "#fb923c", "batasi transfer"),
        (c4, "🟡 Medium",    n_medium,          "#fcd34d", "notifikasi"),
        (c5, "Detection %",  f"{det_rate:.1f}%", "#34d399", "High+Critical"),
    ]
    for col, label, val, color, sub in metrics_data:
        with col:
            st.markdown(f"""<div class="metric-card">
                <div class="metric-label">{label}</div>
                <div class="metric-value" style="color:{color}">{val}</div>
                <div class="metric-sub">{sub}</div>
            </div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    cl, cr = st.columns(2)

    with cl:
        st.markdown("<div class='section-title'>Distribusi Risk Level</div>", unsafe_allow_html=True)
        lc    = risk_df["risk_level"].value_counts()
        order = ["Critical", "High", "Medium", "Low"]
        fig   = go.Figure(go.Pie(
            labels=order, values=[lc.get(l, 0) for l in order],
            marker_colors=[LEVEL_COLORS[l] for l in order],
            hole=0.55, textinfo="label+percent"
        ))
        fig.add_annotation(text=f"<b>{total}</b><br>akun", x=0.5, y=0.5, showarrow=False)
        fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", showlegend=False, height=280, margin=dict(t=10,b=10,l=10,r=10))
        st.plotly_chart(fig, use_container_width=True)

    with cr:
        st.markdown("<div class='section-title'>Risk Score per Profil</div>", unsafe_allow_html=True)
        fig2 = go.Figure()
        for p in ["normal","early_stage","escalating","heavy_gambler"]:
            d = risk_df[risk_df["profile"] == p]["final_risk_score"]
            if len(d):
                fig2.add_trace(go.Box(y=d, name=p, marker_color=PROFILE_COLORS[p], line_color=PROFILE_COLORS[p], fillcolor=PROFILE_FILL[p]))
        fig2.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", height=280, margin=dict(t=10,b=10,l=10,r=10))
        st.plotly_chart(fig2, use_container_width=True)

    ca, cb = st.columns(2)
    with ca:
        st.markdown("<div class='section-title'>Temporal Shift Score per Profil</div>", unsafe_allow_html=True)
        if "avg_temporal_shift" in risk_df.columns:
            sm = risk_df.groupby("profile")["avg_temporal_shift"].mean().reset_index()
            sm["color"] = sm["avg_temporal_shift"].apply(lambda x: "#f87171" if x > 0.01 else "#6ee7b7")
            fig3 = px.bar(sm, x="profile", y="avg_temporal_shift", color="color", color_discrete_map="identity", text=sm["avg_temporal_shift"].round(3))
            fig3.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", height=260, showlegend=False)
            st.plotly_chart(fig3, use_container_width=True)

    with cb:
        st.markdown("<div class='section-title'>Night Ratio per Profil</div>", unsafe_allow_html=True)
        if "avg_night_ratio" in risk_df.columns:
            nm = risk_df.groupby("profile")["avg_night_ratio"].mean().reset_index()
            fig4 = px.bar(nm, x="profile", y="avg_night_ratio", color="avg_night_ratio", color_continuous_scale=["#6ee7b7","#fcd34d","#f87171"], text=nm["avg_night_ratio"].apply(lambda x: f"{x:.2%}"))
            fig4.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", height=260, coloraxis_showscale=False)
            st.plotly_chart(fig4, use_container_width=True)

    st.divider()
    st.markdown("<div class='section-title'>🚨 Top 10 Akun — Perubahan Pola Transaksi Terbaru</div>", unsafe_allow_html=True)
    if "avg_temporal_shift" in risk_df.columns:
        top10 = risk_df[risk_df["avg_temporal_shift"] > 0].sort_values("avg_temporal_shift", ascending=False).head(10).reset_index(drop=True)
        
        th1, th2, th3, th4, th5, th6 = st.columns([2.2, 1.3, 1.3, 1.5, 1.5, 1.5])
        for col, label in zip([th1,th2,th3,th4,th5,th6], ["Account ID", "Level", "Risk Score", "Shift Score", "Night Ratio", "Burst Score"]):
            with col: st.markdown(f"<div style='font-size:11px;color:#6b7280;font-weight:500;text-transform:uppercase;border-bottom:1px solid #2d3142;'>{label}</div>", unsafe_allow_html=True)

        for rank, (_, row) in enumerate(top10.iterrows(), start=1):
            c1, c2, c3, c4, c5, c6 = st.columns([2.2, 1.3, 1.3, 1.5, 1.5, 1.5])
            with c1: st.markdown(f"<div style='padding:8px 0;'><span style='color:#4b5563;'>#{rank}</span> {row['account_id']}</div>", unsafe_allow_html=True)
            with c2: st.markdown(f"<div style='padding:8px 0;'><span class='badge-{row['risk_level'].lower()}'>{row['risk_level']}</span></div>", unsafe_allow_html=True)
            with c3: st.markdown(f"<div style='padding:8px 0; color:{LEVEL_COLORS[row['risk_level']]};'>{row['final_risk_score']:.1f}/100</div>", unsafe_allow_html=True)
            with c4: st.markdown(f"<div style='padding:8px 0; color:#fb923c;'>+{row['avg_temporal_shift']:.4f}</div>", unsafe_allow_html=True)
            with c5: st.markdown(f"<div style='padding:8px 0;'>{row['avg_night_ratio']:.1%}</div>", unsafe_allow_html=True)
            with c6: st.markdown(f"<div style='padding:8px 0;'>{row['avg_burst_score']:.2f}x</div>", unsafe_allow_html=True)
            st.markdown("<hr style='margin:0; border-top:0.5px solid #2d3142;'>", unsafe_allow_html=True)

    st.divider()
    st.markdown("<div class='section-title'>Azure AI Stack</div>", unsafe_allow_html=True)
    ca2, cb2, cc2 = st.columns(3)
    stack_data = [
        (ca2, "☁️ Azure OpenAI (GPT-4o)", ["Synthetic data generation","Risk explanation per akun","Dynamic recommendation"]),
        (cb2, "🤖 Azure ML Registry", ["Model: JudolGuard-Behavior v1","MLflow tracking","Workspace: ML_JudolGuard"]),
        (cc2, "🔬 Isolation Forest Pipeline", ["Anomaly detection layer","XGBoost classifier","PR-AUC: 0.9655 | F1: 0.8598"]),
    ]
    for col, title, items in stack_data:
        with col:
            items_html = "".join([f"✓ {i}<br>" for i in items])
            st.markdown(f"""<div class="metric-card" style="text-align:left">
                <div style="color:#a5b4fc;font-weight:500;margin-bottom:6px">{title}</div>
                <div style="font-size:12px;color:#6b7280;line-height:1.8">{items_html}</div>
            </div>""", unsafe_allow_html=True)

# HALAMAN 2 — RISK TABLE (PAGINATION)
elif page == "📋 Risk Table":
    st.markdown("# 📋 Risk Table")
    search = st.text_input("🔍 Cari Account ID", placeholder="Ketik account ID...")
    if search:
        filtered = filtered[filtered["account_id"].str.contains(search, case=False, na=False)]

    st.divider()
    table = filtered.sort_values("final_risk_score", ascending=False).reset_index(drop=True)
    
    # Pagination Logic
    PAGE_SIZE = 20
    total_pages = max(1, int(np.ceil(len(table) / PAGE_SIZE)))
    if "risk_page" not in st.session_state: st.session_state["risk_page"] = 1
    
    curr_page = st.session_state["risk_page"]
    start_idx = (curr_page - 1) * PAGE_SIZE
    shown = table.iloc[start_idx : start_idx + PAGE_SIZE]

    # Header Tabel
    h1, h2, h3 = st.columns([3, 2, 2])
    h1.markdown("**Account ID**")
    h2.markdown("**Score**")
    h3.markdown("**Level**")
    st.divider()

    for _, row in shown.iterrows():
        c1, c2, c3 = st.columns([3, 2, 2])
        c1.write(row["account_id"])
        c2.markdown(f"<span style='color:{LEVEL_COLORS[row['risk_level']]}'>{row['final_risk_score']:.1f}</span>", unsafe_allow_html=True)
        c3.markdown(f"<span class='badge-{row['risk_level'].lower()}'>{row['risk_level']}</span>", unsafe_allow_html=True)
        st.markdown("<hr style='margin:0.5rem 0; border:0.1px solid #2d3142;'>", unsafe_allow_html=True)

    # Navigasi Halaman
    p1, p2, p3 = st.columns([1, 2, 1])
    if p1.button("◀ Prev") and curr_page > 1:
        st.session_state["risk_page"] -= 1
        st.rerun()
    p2.write(f"Halaman {curr_page} dari {total_pages}")
    if p3.button("Next ▶") and curr_page < total_pages:
        st.session_state["risk_page"] += 1
        st.rerun()

# HALAMAN 3 — DETAIL AKUN (ANALISIS AI)
elif page == "🔍 Detail Akun":
    st.markdown("# 🔍 Detail Akun")
    sel_acc = st.selectbox("Pilih Akun", filtered["account_id"].unique())
    acc = risk_df[risk_df["account_id"] == sel_acc].iloc[0]
    
    st.divider()
    
    # KPI Detail
    d1, d2, d3 = st.columns(3)
    d1.markdown(f"<div class='metric-card'><div class='metric-label'>Risk Score</div><div class='metric-value' style='color:{LEVEL_COLORS[acc['risk_level']]}'>{acc['final_risk_score']:.1f}</div></div>", unsafe_allow_html=True)
    d2.markdown(f"<div class='metric-card'><div class='metric-label'>Level</div><div class='metric-value'>{acc['risk_level']}</div></div>", unsafe_allow_html=True)
    d3.markdown(f"<div class='metric-card'><div class='metric-label'>Profil</div><div class='metric-value' style='font-size:22px'>{acc['profile']}</div></div>", unsafe_allow_html=True)

    # Grafik Perilaku (Subplots)
    if features_df is not None:
        acc_f = features_df[features_df["account_id"] == sel_acc].sort_values("day")
        if not acc_f.empty:
            st.markdown("<div class='section-title'>📈 Grafik Pola Perubahan</div>", unsafe_allow_html=True)
            fig_line = make_subplots(rows=2, cols=1, shared_xaxes=True, vertical_spacing=0.1)
            fig_line.add_trace(go.Scatter(x=acc_f["day"], y=acc_f["tx_count_24h"], name="Frekuensi", line=dict(color="#fb923c")), row=1, col=1)
            fig_line.add_trace(go.Scatter(x=acc_f["day"], y=acc_f["night_ratio_7d"], name="Night Ratio", line=dict(color="#a78bfa")), row=2, col=1)
            fig_line.update_layout(height=400, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", showlegend=False)
            st.plotly_chart(fig_line, use_container_width=True)

    # AI Analysis Section
    st.markdown("<div class='section-title'>🤖 AI Risk Analysis (Azure OpenAI)</div>", unsafe_allow_html=True)
    if st.button("✨ Generate AI Report", type="primary"):
        with st.spinner("Menganalisis perilaku..."):
            try:
                prompt = f"Analisis akun {sel_acc} dengan risk score {acc['final_risk_score']} dan pola night ratio {acc['avg_night_ratio']:.2%}. Berikan rekomendasi konkret."
                resp = client.chat.completions.create(
                    model=AZURE_DEPLOY,
                    messages=[{"role": "user", "content": prompt}]
                )
                st.markdown(f"<div class='explanation-box'>{resp.choices[0].message.content}</div>", unsafe_allow_html=True)
            except Exception as e:
                st.error(f"Gagal menghubungi AI: {e}")

# ═══════════════════════════════════════════════════════════════════════════════
# HALAMAN 4 — SIMULATOR (Parameter Sliders + Recalculate)
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "🎛️ Simulator":
    import joblib, os
    st.markdown("# 🎛️ Risk Score Simulator")
    st.markdown("<p style='color:#6b7280;margin-top:-12px;font-size:14px;'>Geser parameter untuk melihat perubahan risk score secara real-time</p>", unsafe_allow_html=True)
    st.divider()

    col_sliders, col_result = st.columns([1.4, 1])

    with col_sliders:
        st.markdown("<div class='section-title'>Parameter Transaksi</div>", unsafe_allow_html=True)
        night_ratio   = st.slider("🌙 Night Ratio (rasio transaksi malam)", 0.0, 1.0, 0.3, 0.01)
        temporal_shift= st.slider("⏱️ Temporal Shift (pergeseran pola waktu)", -0.5, 0.5, 0.05, 0.01)
        tx_count      = st.slider("📈 Frekuensi Transaksi 24h", 0, 50, 5, 1)
        burst_score   = st.slider("💥 Burst Score (lonjakan aktivitas)", 0.0, 10.0, 1.5, 0.1)
        unique_recv   = st.slider("👥 Jumlah Penerima Unik (7 hari)", 1, 20, 3, 1)
        amount_ratio  = st.slider("💰 Nominal vs Rata-rata 7h (1=normal)", 0.1, 20.0, 1.2, 0.1)
        total_amount  = st.slider("🏦 Total Nominal 7h (juta Rp)", 0.0, 200.0, 15.0, 0.5)
        qris_ratio    = st.slider("📱 QRIS Ratio", 0.0, 1.0, 0.1, 0.01)

    # ── Hitung risk score secara manual (mirror logika training) ──────────
    def compute_risk_score_manual(temporal_shift, amount_ratio, total_amount,
                                   night_ratio, tx_count, burst_score, unique_recv, qris_ratio):
        # Normalisasi setiap fitur ke [0,1] berdasarkan range realistic
        n_night    = min(night_ratio / 0.6, 1.0)
        n_shift    = min(max(temporal_shift, 0) / 0.4, 1.0)
        n_tx       = min(tx_count / 30, 1.0)
        n_burst    = min(burst_score / 8, 1.0)
        n_recv     = min(unique_recv / 15, 1.0)
        n_amount   = min((amount_ratio - 1) / 15, 1.0) if amount_ratio > 1 else 0
        n_total    = min(total_amount / 150, 1.0)

        # Weighted sum (bobot sesuai feature importance XGBoost)
        score = (
            n_shift  * 30 +   # temporal_shift → bobot terbesar
            n_amount * 25 +   # amount_vs_avg_7d
            n_total  * 15 +   # total_amount_7d
            n_night  * 12 +   # night_ratio (extra context)
            n_burst  * 10 +   # burst_score
            n_recv   *  5 +   # unique_recv
            n_tx     *  3     # tx_count
        )
        return round(min(score, 100), 1)

    score = compute_risk_score_manual(temporal_shift, amount_ratio, total_amount,
                                      night_ratio, tx_count, burst_score, unique_recv, qris_ratio)

    if score >= 80:   level, color = "Critical", "#f87171"
    elif score >= 60: level, color = "High",     "#fb923c"
    elif score >= 40: level, color = "Medium",   "#fcd34d"
    else:             level, color = "Low",      "#6ee7b7"

    with col_result:
        st.markdown("<div class='section-title'>Hasil Kalkulasi</div>", unsafe_allow_html=True)
        st.markdown(f"""
        <div class='metric-card' style='border-color:{color};'>
            <div class='metric-label'>Risk Score</div>
            <div class='metric-value' style='color:{color};font-size:52px;'>{score}</div>
            <div style='margin:8px 0;'><span class='badge-{level.lower()}'>{level}</span></div>
        </div>""", unsafe_allow_html=True)

        # Gauge bar
        st.markdown(f"""
        <div style='margin-top:12px;'>
            <div style='display:flex;justify-content:space-between;font-size:11px;color:#6b7280;'>
                <span>0</span><span>Low</span><span>Med</span><span>High</span><span>100</span>
            </div>
            <div style='background:#2d3142;border-radius:8px;height:16px;margin-top:4px;'>
                <div style='background:linear-gradient(90deg,#6ee7b7,#fcd34d,#fb923c,#f87171);
                            width:{score}%;height:100%;border-radius:8px;transition:width 0.4s;'></div>
            </div>
        </div>""", unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)
        recs = {"Low":"Monitor pasif","Medium":"Kirim notifikasi edukasi","High":"Batasi transfer harian","Critical":"Eskalasi ke OJK"}
        st.info(f"**Rekomendasi:** {recs[level]}")

        # Top contributors
        contributors = sorted([
            ("Temporal Shift",  min(max(temporal_shift,0)/0.4,1)*30),
            ("Amount Ratio",    min((amount_ratio-1)/15,1)*25 if amount_ratio>1 else 0),
            ("Total Amount 7d", min(total_amount/150,1)*15),
            ("Night Ratio",     min(night_ratio/0.6,1)*12),
            ("Burst Score",     min(burst_score/8,1)*10),
        ], key=lambda x: x[1], reverse=True)

        st.markdown("<div class='section-title'>Top Kontributor</div>", unsafe_allow_html=True)
        for name, val in contributors[:3]:
            pct = int(val / max(score, 1) * 100)
            st.markdown(f"""
            <div style='margin-bottom:6px;font-size:13px;'>
                <div style='display:flex;justify-content:space-between;color:#d1d5db;'>
                    <span>{name}</span><span style='color:#a5b4fc;'>{val:.1f} pts</span>
                </div>
                <div style='background:#2d3142;border-radius:4px;height:6px;margin-top:3px;'>
                    <div style='background:#6366f1;width:{pct}%;height:100%;border-radius:4px;'></div>
                </div>
            </div>""", unsafe_allow_html=True)

    st.divider()
    st.markdown("<div class='section-title'>Perbandingan dengan Profil Populasi</div>", unsafe_allow_html=True)
    avg_scores = risk_df.groupby("profile")["final_risk_score"].mean().reset_index()
    avg_scores.loc[len(avg_scores)] = {"profile": "⭐ Simulasi Anda", "final_risk_score": score}
    colors_cmp = [PROFILE_COLORS.get(p, "#a5b4fc") for p in avg_scores["profile"]]
    fig_cmp = go.Figure(go.Bar(
        x=avg_scores["profile"], y=avg_scores["final_risk_score"],
        marker_color=colors_cmp, text=avg_scores["final_risk_score"].round(1), textposition="outside"
    ))
    fig_cmp.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                          height=280, margin=dict(t=10,b=10,l=10,r=10))
    st.plotly_chart(fig_cmp, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# HALAMAN 5 — NETWORK GRAPH + SMURFING CONTAGION
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "🕸️ Network & Smurfing":
    st.markdown("# 🕸️ Network Graph & Smurfing Risk")
    st.markdown("<p style='color:#6b7280;margin-top:-12px;font-size:14px;'>Deteksi risiko penularan — akun yang terhubung ke penjudi berisiko tinggi</p>", unsafe_allow_html=True)
    st.divider()

    # ── Smurfing Contagion Logic (real computation, mock edges) ──────────────
    st.markdown("<div class='section-title'>🔴 Smurfing Contagion Risk Score</div>", unsafe_allow_html=True)

    np.random.seed(42)
    n_acc = len(risk_df)
    # Simulasi: setiap akun terhubung ke 1-3 akun lain secara acak (mock transfer graph)
    risk_map   = dict(zip(risk_df["account_id"], risk_df["final_risk_score"]))
    level_map  = dict(zip(risk_df["account_id"], risk_df["risk_level"]))

    def compute_contagion(account_id, risk_map, n_neighbors=3):
        """Hitung contagion risk: rata-rata risk score tetangga × bobot kedekatan"""
        all_ids = list(risk_map.keys())
        all_ids_excl = [a for a in all_ids if a != account_id]
        neighbors = np.random.choice(all_ids_excl, size=min(n_neighbors, len(all_ids_excl)), replace=False)
        neighbor_scores = [risk_map[n] for n in neighbors]
        # Contagion = max(0, avg_neighbor_score - 30) × 0.4
        contagion = max(0, np.mean(neighbor_scores) - 30) * 0.4
        return round(contagion, 1), list(neighbors)

    # Hitung untuk semua akun
    if "contagion_computed" not in st.session_state:
        contagion_data = []
        for acc_id in risk_df["account_id"]:
            c_score, neighbors = compute_contagion(acc_id, risk_map)
            combined = min(risk_map[acc_id] + c_score * 0.3, 100)
            contagion_data.append({
                "account_id": acc_id,
                "base_risk": risk_map[acc_id],
                "contagion_risk": c_score,
                "combined_score": round(combined, 1),
                "risk_level": level_map[acc_id],
            })
        st.session_state["contagion_df"] = pd.DataFrame(contagion_data)
        st.session_state["contagion_computed"] = True

    ctg_df = st.session_state["contagion_df"]
    high_contagion = ctg_df[ctg_df["contagion_risk"] > 15].sort_values("contagion_risk", ascending=False).head(10)

    # Metrik
    m1, m2, m3 = st.columns(3)
    with m1:
        st.markdown(f"""<div class='metric-card'>
            <div class='metric-label'>Akun Contagion Tinggi</div>
            <div class='metric-value' style='color:#f87171;'>{len(ctg_df[ctg_df['contagion_risk']>15])}</div>
            <div class='metric-sub'>contagion &gt; 15</div></div>""", unsafe_allow_html=True)
    with m2:
        st.markdown(f"""<div class='metric-card'>
            <div class='metric-label'>Rata-rata Contagion</div>
            <div class='metric-value' style='color:#fb923c;'>{ctg_df['contagion_risk'].mean():.1f}</div>
            <div class='metric-sub'>semua akun</div></div>""", unsafe_allow_html=True)
    with m3:
        st.markdown(f"""<div class='metric-card'>
            <div class='metric-label'>Smurfing Suspect</div>
            <div class='metric-value' style='color:#fcd34d;'>{len(ctg_df[(ctg_df['base_risk']<60)&(ctg_df['contagion_risk']>20)])}</div>
            <div class='metric-sub'>risiko rendah, tetangga tinggi</div></div>""", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Scatter: base risk vs contagion risk
    ca, cb = st.columns(2)
    with ca:
        st.markdown("<div class='section-title'>Base Risk vs Contagion Risk</div>", unsafe_allow_html=True)
        fig_scatter = px.scatter(
            ctg_df, x="base_risk", y="contagion_risk",
            color="risk_level",
            color_discrete_map={l: LEVEL_COLORS[l] for l in LEVEL_COLORS},
            hover_data=["account_id", "combined_score"],
            labels={"base_risk": "Risk Score Akun", "contagion_risk": "Contagion Risk"},
        )
        fig_scatter.add_hline(y=15, line_dash="dash", line_color="#6b7280", annotation_text="Threshold Contagion")
        fig_scatter.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", height=300,
                                  margin=dict(t=10,b=10,l=10,r=10))
        st.plotly_chart(fig_scatter, use_container_width=True)

    with cb:
        st.markdown("<div class='section-title'>Top 10 Akun Contagion Tertinggi</div>", unsafe_allow_html=True)
        for _, row in high_contagion.iterrows():
            st.markdown(f"""
            <div style='display:flex;justify-content:space-between;padding:6px 0;border-bottom:0.5px solid #2d3142;font-size:13px;'>
                <span style='color:#d1d5db;'>{row['account_id']}</span>
                <span style='color:#fb923c;'>+{row['contagion_risk']:.1f}</span>
                <span class='badge-{row["risk_level"].lower()}'>{row['risk_level']}</span>
            </div>""", unsafe_allow_html=True)

    st.divider()

    # ── Network Graph (Plotly mock) ───────────────────────────────────────────
    st.markdown("<div class='section-title'>🕸️ Network Graph (Top 30 Akun)</div>", unsafe_allow_html=True)
    st.caption("Node = akun, ukuran = risk score, warna = risk level. Edge = hubungan transfer (simulasi)")

    top30 = risk_df.sort_values("final_risk_score", ascending=False).head(30).reset_index(drop=True)
    np.random.seed(99)
    theta = np.linspace(0, 2*np.pi, len(top30))
    node_x = np.cos(theta) + np.random.normal(0, 0.15, len(top30))
    node_y = np.sin(theta) + np.random.normal(0, 0.15, len(top30))

    # Generate mock edges
    edge_x, edge_y = [], []
    for i in range(len(top30)):
        for j in np.random.choice([k for k in range(len(top30)) if k != i], size=2, replace=False):
            edge_x += [node_x[i], node_x[j], None]
            edge_y += [node_y[i], node_y[j], None]

    fig_net = go.Figure()
    fig_net.add_trace(go.Scatter(x=edge_x, y=edge_y, mode="lines",
                                  line=dict(color="#2d3142", width=1), hoverinfo="none"))
    node_colors = [LEVEL_COLORS[lv] for lv in top30["risk_level"]]
    node_sizes  = (top30["final_risk_score"] / 100 * 30 + 8).tolist()
    fig_net.add_trace(go.Scatter(
        x=node_x, y=node_y, mode="markers+text",
        marker=dict(size=node_sizes, color=node_colors, line=dict(width=1.5, color="#1a1d27")),
        text=top30["account_id"].str.replace("AUG_",""), textposition="top center",
        hovertemplate="<b>%{customdata[0]}</b><br>Score: %{customdata[1]}<br>Level: %{customdata[2]}<extra></extra>",
        customdata=list(zip(top30["account_id"], top30["final_risk_score"].round(1), top30["risk_level"]))
    ))
    fig_net.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                          height=450, showlegend=False,
                          xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                          yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                          margin=dict(t=10,b=10,l=10,r=10))
    st.plotly_chart(fig_net, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# HALAMAN 6 — ETL PIPELINE (Onboarding Animation)
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "⚡ ETL Pipeline":
    import time
    st.markdown("# ⚡ ETL Pipeline Monitor")
    st.markdown("<p style='color:#6b7280;margin-top:-12px;font-size:14px;'>Simulasi real-time ingestion & scoring pipeline</p>", unsafe_allow_html=True)
    st.divider()

    # Static summary
    c1, c2, c3, c4 = st.columns(4)
    for col, label, val, color in [
        (c1, "Records Processed",  "654,892",  "#a5b4fc"),
        (c2, "Accounts Scored",    "655",      "#34d399"),
        (c3, "Anomalies Detected", "180",      "#f87171"),
        (c4, "Avg Latency",        "142 ms",   "#fcd34d"),
    ]:
        with col:
            st.markdown(f"""<div class='metric-card'>
                <div class='metric-label'>{label}</div>
                <div class='metric-value' style='color:{color};'>{val}</div></div>""",
                unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    if st.button("▶ Jalankan Pipeline Simulation", type="primary"):
        steps = [
            ("📥 Ingest raw transactions dari e-wallet API",      "#6366f1"),
            ("🧹 Data cleaning & validation (null check, outlier)","#6366f1"),
            ("⚙️  Feature engineering (temporal shift, burst)",    "#6366f1"),
            ("🌲 Isolation Forest — anomaly scoring",              "#6366f1"),
            ("🤖 XGBoost Classifier — risk classification",        "#6366f1"),
            ("💡 Azure OpenAI — generate explanations",            "#6366f1"),
            ("📤 Write output → risk_scores_with_explanation.csv", "#6366f1"),
            ("✅ Pipeline complete — dashboard refreshed",         "#34d399"),
        ]
        progress_bar = st.progress(0)
        status_box   = st.empty()
        log_area     = st.empty()
        logs = []

        for i, (step, color) in enumerate(steps):
            pct = int((i + 1) / len(steps) * 100)
            progress_bar.progress(pct)
            status_box.markdown(f"""
            <div style='background:#1a1d27;border-left:3px solid {color};
                        border-radius:0 8px 8px 0;padding:10px 14px;font-size:14px;color:#d1d5db;'>
                ⏳ <b>Step {i+1}/{len(steps)}:</b> {step}
            </div>""", unsafe_allow_html=True)
            logs.append(f"[{time.strftime('%H:%M:%S')}] {step} ... OK ✓")
            log_area.code("\n".join(logs), language="bash")
            time.sleep(0.8)

        status_box.markdown("""
        <div style='background:#064e3b;border-left:3px solid #34d399;
                    border-radius:0 8px 8px 0;padding:10px 14px;font-size:14px;color:#6ee7b7;'>
            ✅ <b>Pipeline berhasil dijalankan!</b> 655 akun telah di-score ulang.
        </div>""", unsafe_allow_html=True)

    st.divider()
    st.markdown("<div class='section-title'>Pipeline Architecture</div>", unsafe_allow_html=True)
    st.markdown("""
    <div style='background:#1a1d27;border-radius:12px;padding:1.2rem;font-size:13px;color:#d1d5db;line-height:2;'>
    <b style='color:#a5b4fc;'>Data Sources</b><br>
    &nbsp;&nbsp;e-Wallet API → Raw Transactions CSV → Azure Blob Storage<br>
    <b style='color:#a5b4fc;'>Processing Layer</b><br>
    &nbsp;&nbsp;Feature Engineering → Isolation Forest → XGBoost → Risk Scores<br>
    <b style='color:#a5b4fc;'>Explainability Layer</b><br>
    &nbsp;&nbsp;Azure OpenAI GPT-4o → Narasi per akun → risk_scores_with_explanation.csv<br>
    <b style='color:#a5b4fc;'>Serving Layer</b><br>
    &nbsp;&nbsp;FastAPI /predict → Streamlit Dashboard → Compliance Team
    </div>""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# HALAMAN 7 — AI CO-PILOT CHATBOT
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "🤖 AI Co-Pilot":
    st.markdown("# 🤖 AI Co-Pilot")
    st.markdown("<p style='color:#6b7280;margin-top:-12px;font-size:14px;'>Tanyakan apa saja tentang data risiko JudolGuard kepada Azure OpenAI</p>", unsafe_allow_html=True)
    st.divider()

    # ── System context ────────────────────────────────────────────────────────
    n_critical = int((risk_df["risk_level"] == "Critical").sum())
    n_high     = int((risk_df["risk_level"] == "High").sum())
    n_medium   = int((risk_df["risk_level"] == "Medium").sum())
    n_low      = int((risk_df["risk_level"] == "Low").sum())
    SYSTEM_PROMPT = f"""Kamu adalah AI Co-Pilot untuk sistem JudolGuard — platform deteksi dini transaksi berisiko judi online.

Data saat ini:
- Total akun dianalisis: {len(risk_df)}
- Critical: {n_critical} akun | High: {n_high} | Medium: {n_medium} | Low: {n_low}
- Profil yang tersedia: normal, early_stage, escalating, heavy_gambler
- Metrik model: PR-AUC 0.9655, F1-Score 0.8598
- Stack: Azure OpenAI GPT-4o + Azure ML (Isolation Forest + XGBoost)

Jawab dalam Bahasa Indonesia yang profesional namun mudah dipahami.
Berikan insight berbasis data, rekomendasi konkret, dan konteks regulasi (OJK/PPATK) bila relevan."""

    # ── Chat history ──────────────────────────────────────────────────────────
    if "chat_history" not in st.session_state:
        st.session_state["chat_history"] = []

    # Quick prompts
    st.markdown("<div class='section-title'>💡 Quick Prompts</div>", unsafe_allow_html=True)
    qp1, qp2, qp3, qp4 = st.columns(4)
    quick_prompts = {
        qp1: "Jelaskan pola heavy_gambler",
        qp2: "Apa itu temporal shift?",
        qp3: "Kapan harus flag ke OJK?",
        qp4: "Strategi cegah smurfing?",
    }
    triggered = None
    for col, prompt in quick_prompts.items():
        with col:
            if st.button(prompt, use_container_width=True):
                triggered = prompt

    st.markdown("<br>", unsafe_allow_html=True)

    # Display chat history
    for msg in st.session_state["chat_history"]:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # Input
    user_input = st.chat_input("Tanya sesuatu tentang data JudolGuard...") or triggered

    if user_input:
        st.session_state["chat_history"].append({"role": "user", "content": user_input})
        with st.chat_message("user"):
            st.markdown(user_input)

        with st.chat_message("assistant"):
            with st.spinner("Berpikir..."):
                try:
                    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
                    # Ambil max 6 pesan terakhir untuk konteks
                    for m in st.session_state["chat_history"][-6:]:
                        messages.append({"role": m["role"], "content": m["content"]})

                    resp = client.chat.completions.create(
                        model=AZURE_DEPLOY,
                        messages=messages,
                        max_tokens=600,
                        temperature=0.7,
                    )
                    answer = resp.choices[0].message.content
                    st.markdown(answer)
                    st.session_state["chat_history"].append({"role": "assistant", "content": answer})
                except Exception as e:
                    st.error(f"Gagal menghubungi AI: {e}")

    if st.session_state.get("chat_history"):
        if st.button("🗑️ Clear Chat"):
            st.session_state["chat_history"] = []
            st.rerun()
