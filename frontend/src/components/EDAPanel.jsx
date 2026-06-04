import { useState, useEffect } from 'react'
import { getEDASummary } from '../api'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Cell
} from 'recharts'

const PROFILE_CONFIG = {
  normal:        { color: '#22c55e', icon: '😊', label: 'Normal' },
  early_stage:   { color: '#eab308', icon: '⚠️', label: 'Early Stage' },
  escalating:    { color: '#f97316', icon: '📈', label: 'Escalating' },
  heavy_gambler: { color: '#ef4444', icon: '🎰', label: 'Heavy Gambler' },
}

const ETL_COLORS = ['#3b82f6','#8b5cf6','#f97316','#22c55e','#ef4444','#0078d4','#10b981']

export default function EDAPanel() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [activeProfile, setActiveProfile] = useState(null)

  useEffect(() => {
    getEDASummary()
      .then(d => { setData(d); setActiveProfile(d.profile_stats?.[0]?.profile || null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-state fade-in"><div className="spinner"/><span>Memuat data EDA...</span></div>
  if (error)   return <div className="empty-state fade-in"><div className="icon">⚠️</div><p style={{color:'var(--critical)'}}>{error}</p></div>

  const profiles   = data.profile_stats || []
  const etlFlow    = data.etl_flow || []
  const activeData = profiles.find(p => p.profile === activeProfile) || profiles[0]

  // Radar data untuk profil terpilih
  const radarData = activeData ? [
    { axis: 'Night Ratio',    value: (activeData.avg_night_ratio * 100).toFixed(0)    },
    { axis: 'Temporal Shift', value: (Math.abs(activeData.avg_temporal_shift) * 100).toFixed(0) },
    { axis: 'Burst Score',    value: (activeData.avg_burst_score * 10).toFixed(0)      },
    { axis: 'Unique Recv',    value: (activeData.avg_unique_recv * 5).toFixed(0)       },
    { axis: 'QRIS Ratio',     value: (activeData.avg_qris_ratio * 100).toFixed(0)      },
    { axis: '% Critical',     value: activeData.pct_critical                           },
  ].map(d => ({ ...d, value: Math.min(Number(d.value), 100) })) : []

  // Bar data distribusi profil
  const profileBarData = profiles.map(p => ({
    name:  PROFILE_CONFIG[p.profile]?.label || p.profile,
    value: p.n_accounts,
    color: PROFILE_CONFIG[p.profile]?.color || '#4b5563',
  }))

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>📈 EDA & Metodologi</h2>
        <p>Rubrik 1 (25%) — Exploratory Data Analysis, feature selection, dan justifikasi metrik</p>
      </div>

      {/* ── Overview stats ──────────────────────────────────── */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi-card brand">
          <div className="kpi-label">Total Transaksi</div>
          <div className="kpi-value">{(data.total_transactions || 0).toLocaleString()}</div>
          <div className="kpi-sub">Raw data sintetis PPATK</div>
        </div>
        <div className="kpi-card brand">
          <div className="kpi-label">Total Akun</div>
          <div className="kpi-value">{(data.total_accounts || 0).toLocaleString()}</div>
          <div className="kpi-sub">Dipantau JudolGuard</div>
        </div>
        <div className="kpi-card critical">
          <div className="kpi-label">At-Risk Rate</div>
          <div className="kpi-value">{data.label_distribution?.at_risk_pct}%</div>
          <div className="kpi-sub">High + Critical</div>
        </div>
        <div className="kpi-card low">
          <div className="kpi-label">Normal Rate</div>
          <div className="kpi-value">{data.label_distribution?.normal_pct}%</div>
          <div className="kpi-sub">Low + Medium</div>
        </div>
      </div>

      {/* ── Imbalance note ──────────────────────────────────── */}
      <div style={{
        padding: '12px 16px', marginBottom: 16, borderRadius: 'var(--radius-md)',
        background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: '1.2rem' }}>⚖️</span>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--medium)', fontSize: '0.82rem' }}>Class Imbalance — Justifikasi Metrik</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{data.imbalance_note}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* ── Profile Selector + Stats ─────────────────────── */}
        <div className="card">
          <div className="card-title">Behavioral Profiles — 4 Kelompok Akun</div>

          {/* Profile tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {profiles.map(p => {
              const cfg = PROFILE_CONFIG[p.profile]
              const isActive = activeProfile === p.profile
              return (
                <button key={p.profile}
                  onClick={() => setActiveProfile(p.profile)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, border: `1px solid ${cfg?.color || '#4b5563'}40`,
                    background: isActive ? `${cfg?.color || '#4b5563'}20` : 'transparent',
                    color: isActive ? cfg?.color : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 400, fontSize: '0.72rem', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cfg?.icon} {cfg?.label || p.profile}
                </button>
              )
            })}
          </div>

          {/* Active profile details */}
          {activeData && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Jumlah Akun',    val: activeData.n_accounts,                                                  color: PROFILE_CONFIG[activeData.profile]?.color },
                { label: 'Avg Risk Score', val: activeData.avg_risk_score,                                               color: PROFILE_CONFIG[activeData.profile]?.color },
                { label: 'Night Ratio',    val: `${(activeData.avg_night_ratio * 100).toFixed(1)}%`,                     color: activeData.avg_night_ratio > 0.4 ? 'var(--high)' : undefined },
                { label: 'Temporal Shift', val: `${activeData.avg_temporal_shift > 0 ? '+' : ''}${activeData.avg_temporal_shift.toFixed(3)}`, color: activeData.avg_temporal_shift > 0.1 ? 'var(--high)' : undefined },
                { label: 'Burst Score',    val: activeData.avg_burst_score.toFixed(2),                                   color: activeData.avg_burst_score > 3 ? 'var(--medium)' : undefined },
                { label: 'QRIS Ratio',     val: `${(activeData.avg_qris_ratio * 100).toFixed(1)}%`,                     color: activeData.avg_qris_ratio > 0.5 ? 'var(--high)' : undefined },
                { label: 'Unique Recv/7d', val: activeData.avg_unique_recv.toFixed(1),                                   color: activeData.avg_unique_recv > 10 ? 'var(--high)' : undefined },
                { label: '% Critical',     val: `${activeData.pct_critical}%`,                                           color: activeData.pct_critical > 50 ? 'var(--critical)' : undefined },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{s.label}</div>
                  <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: s.color || 'var(--text-primary)', marginTop: 2 }}>{s.val}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Radar Chart ─────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">
            Radar Perilaku — {PROFILE_CONFIG[activeProfile]?.icon} {PROFILE_CONFIG[activeProfile]?.label}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Radar
                dataKey="value" name="Score"
                stroke={PROFILE_CONFIG[activeProfile]?.color || '#3b82f6'}
                fill={PROFILE_CONFIG[activeProfile]?.color || '#3b82f6'}
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: '0.75rem' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Profile distribution bar ────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Distribusi Akun per Profil</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={profileBarData} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: '0.75rem' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="value" radius={[4,4,0,0]} name="Jumlah Akun">
              {profileBarData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── ETL Pipeline Flow ────────────────────────────────── */}
      <div className="card">
        <div className="card-title">⚙️ ETL Pipeline Architecture — 7 Tahap</div>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', padding: '8px 0' }}>
          {etlFlow.map((step, idx) => (
            <div key={step.step} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: 130, textAlign: 'center', padding: '12px 10px',
                background: `${ETL_COLORS[idx % ETL_COLORS.length]}15`,
                border: `1px solid ${ETL_COLORS[idx % ETL_COLORS.length]}35`,
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{step.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.72rem', color: ETL_COLORS[idx % ETL_COLORS.length] }}>{step.name}</div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{step.desc}</div>
              </div>
              {idx < etlFlow.length - 1 && (
                <div style={{ padding: '0 6px', color: 'var(--text-muted)', fontSize: '1rem' }}>→</div>
              )}
            </div>
          ))}
        </div>

        {/* Key features */}
        <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>Key Features (Top 4 by Importance):</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(data.key_features || []).map((f, i) => (
              <span key={f} className="chip mono" style={{ color: 'var(--brand-from)', borderColor: 'rgba(59,130,246,0.3)', fontSize: '0.72rem' }}>
                #{i+1} {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
