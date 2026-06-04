import { useState, useEffect } from 'react'
import { getDashboardSummary } from '../api'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

const RISK_COLORS = {
  Critical: '#ef4444',
  High:     '#f97316',
  Medium:   '#eab308',
  Low:      '#22c55e',
}

const PROFILE_LABELS = {
  normal:        { label: 'Normal',        icon: '😊' },
  early_stage:   { label: 'Early Stage',   icon: '⚠️' },
  escalating:    { label: 'Escalating',    icon: '📈' },
  heavy_gambler: { label: 'Heavy Gambler', icon: '🎰' },
}

function ScoreBar({ score }) {
  const color = score >= 81 ? '#ef4444'
              : score >= 61 ? '#f97316'
              : score >= 31 ? '#eab308'
              : '#22c55e'
  return (
    <div className="score-bar-wrap">
      <div className="score-bar">
        <div className="score-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="mono" style={{ fontSize: '0.75rem', color, width: 36, textAlign: 'right' }}>
        {score}
      </span>
    </div>
  )
}

// Custom Pie tooltip
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-md)',
      borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem'
    }}>
      <span style={{ color: RISK_COLORS[name], fontWeight: 700 }}>{name}</span>
      <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{value} akun</span>
    </div>
  )
}

export default function Overview({ onSelectAccount }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    getDashboardSummary()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="loading-state fade-in">
      <div className="spinner" />
      <span>Memuat dashboard...</span>
    </div>
  )

  if (error) return (
    <div className="empty-state fade-in">
      <div className="icon">⚠️</div>
      <p style={{ color: 'var(--critical)' }}>{error}</p>
      <p style={{ marginTop: 8 }}>Pastikan FastAPI berjalan di localhost:8000</p>
    </div>
  )

  const pieData = [
    { name: 'Critical', value: data.critical },
    { name: 'High',     value: data.high },
    { name: 'Medium',   value: data.medium },
    { name: 'Low',      value: data.low },
  ]

  const topAccounts = data.top_accounts || []

  return (
    <div className="fade-in">
      {/* Page header */}
      <div className="page-header">
        <h2>📊 Overview Dashboard</h2>
        <p>Ringkasan deteksi risiko transaksi — real-time dari model JudolGuard</p>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi-card brand">
          <div className="kpi-label">Total Akun Dipantau</div>
          <div className="kpi-value">{data.total_accounts?.toLocaleString()}</div>
          <div className="kpi-sub">Aktif dalam sistem JudolGuard</div>
        </div>
        <div className="kpi-card critical">
          <div className="kpi-label">Critical 🔴</div>
          <div className="kpi-value">{data.critical}</div>
          <div className="kpi-sub">Skor ≥ 81 — eskalasi OJK/PPATK</div>
        </div>
        <div className="kpi-card high">
          <div className="kpi-label">High 🟠</div>
          <div className="kpi-value">{data.high}</div>
          <div className="kpi-sub">Skor 61–80 — batasi transfer</div>
        </div>
        <div className="kpi-card medium">
          <div className="kpi-label">Medium 🟡</div>
          <div className="kpi-value">{data.medium}</div>
          <div className="kpi-sub">Skor 31–60 — kirim edukasi</div>
        </div>
        <div className="kpi-card low">
          <div className="kpi-label">Low 🟢</div>
          <div className="kpi-value">{data.low}</div>
          <div className="kpi-sub">Skor ≤ 30 — monitor pasif</div>
        </div>
        <div className="kpi-card brand">
          <div className="kpi-label">Detection Rate</div>
          <div className="kpi-value">{data.detection_rate}%</div>
          <div className="kpi-sub">Akun High + Critical</div>
        </div>
        <div className="kpi-card brand">
          <div className="kpi-label">PR-AUC</div>
          <div className="kpi-value">{data.model_pr_auc}</div>
          <div className="kpi-sub">XGBoost + Isolation Forest</div>
        </div>
        <div className="kpi-card brand">
          <div className="kpi-label">F1-Score</div>
          <div className="kpi-value">{data.model_f1}</div>
          <div className="kpi-sub">5-fold Stratified CV</div>
        </div>
      </div>

      {/* ── Charts Row ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, marginBottom: 24 }}>
        {/* Pie Chart */}
        <div className="card">
          <div className="card-title">Distribusi Risk Level</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={RISK_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 }}>
            {pieData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[d.name], flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                <span style={{ color: RISK_COLORS[d.name], fontWeight: 700 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="card">
          <div className="card-title">Distribusi per Risk Level</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pieData} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-md)',
                  borderRadius: 8, fontSize: '0.78rem'
                }}
                labelStyle={{ color: 'var(--text-primary)' }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={RISK_COLORS[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Top 5 Akun Berisiko ───────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>🚨 Top 5 Akun Risiko Tertinggi</div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.72rem', padding: '5px 12px' }}
            onClick={() => onSelectAccount && onSelectAccount('risk-table')}
          >
            Lihat semua →
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Account ID</th>
                <th>Profile</th>
                <th>Risk Level</th>
                <th style={{ width: 200 }}>Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {topAccounts.map((acc, i) => (
                <tr
                  key={acc.account_id}
                  onClick={() => onSelectAccount && onSelectAccount('detail', acc.account_id)}
                >
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td className="mono" style={{ fontWeight: 600, color: 'var(--brand-from)' }}>
                    {acc.account_id}
                  </td>
                  <td>
                    <span className="chip">
                      {PROFILE_LABELS[acc.profile]?.icon} {PROFILE_LABELS[acc.profile]?.label || acc.profile}
                    </span>
                  </td>
                  <td>
                    <span className={`risk-badge ${acc.risk_level}`}>{acc.risk_level}</span>
                  </td>
                  <td>
                    <ScoreBar score={acc.final_risk_score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mitigasi False Positive ───────────────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">🔒 Matriks Mitigasi False Positive</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { level: 'Critical', range: '81–100', color: 'var(--critical)', bg: 'var(--critical-bg)',
              action: 'Soft-freeze transaksi keluar + STR ke PPATK/OJK', confidence: 'Sangat Tinggi' },
            { level: 'High', range: '61–80', color: 'var(--high)', bg: 'var(--high-bg)',
              action: 'Limit transfer harian + wajib MFA/biometrik', confidence: 'Tinggi' },
            { level: 'Medium', range: '31–60', color: 'var(--medium)', bg: 'var(--medium-bg)',
              action: 'Notifikasi edukasi bahaya judi online ke aplikasi', confidence: 'Sedang' },
            { level: 'Low', range: '0–30', color: 'var(--low)', bg: 'var(--low-bg)',
              action: 'Monitor pasif — tidak ada tindakan segera', confidence: 'Rendah' },
          ].map(m => (
            <div key={m.level} style={{
              background: m.bg, border: `1px solid ${m.color}33`,
              borderRadius: 'var(--radius-md)', padding: '14px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: m.color, fontWeight: 700, fontSize: '0.82rem' }}>{m.level}</span>
                <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{m.range}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{m.action}</div>
              <div style={{ marginTop: 8, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                Confidence: <span style={{ color: m.color }}>{m.confidence}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
