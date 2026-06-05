import { useState, useEffect } from 'react'
import { getDashboardSummary, sendCopilotMessage } from '../api'
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
  normal:        { label: 'Normal',        color: '#22c55e' },
  early_stage:   { label: 'Early Stage',   color: '#eab308' },
  escalating:    { label: 'Escalating',    color: '#f97316' },
  heavy_gambler: { label: 'Heavy Gambler', color: '#ef4444' },
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
      <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>{value} accounts</span>
    </div>
  )
}

export default function Overview({ onSelectAccount, adjustedData }) {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // AI Generate state
  const [aiMode,    setAiMode]    = useState(null)   // 'summary' | 'strategy'
  const [aiResult,  setAiResult]  = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError,   setAiError]   = useState(null)

  useEffect(() => {
    getDashboardSummary()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const generateAI = async (type) => {
    if (!data) return
    setAiMode(type)
    setAiResult(null)
    setAiError(null)
    setAiLoading(true)

    const prompts = {
      summary:
        `Berikan EXECUTIVE SUMMARY situasi fraud saat ini berdasarkan data JudolGuard:\n` +
        `- Total akun dipantau: ${data.total_accounts?.toLocaleString()}\n` +
        `- Critical risk: ${data.critical} akun\n` +
        `- High risk: ${data.high} akun\n` +
        `- Medium risk: ${data.medium} akun\n` +
        `- Low risk: ${data.low} akun\n` +
        `Berikan ringkasan eksekutif dalam 4-5 kalimat: situasi terkini, tren, dan highlight utama yang perlu perhatian management.`,
      strategy:
        `Berikan REKOMENDASI STRATEGIS untuk compliance team berdasarkan data JudolGuard saat ini:\n` +
        `- Total akun: ${data.total_accounts?.toLocaleString()} | Critical: ${data.critical} | High: ${data.high} | Medium: ${data.medium} | Low: ${data.low}\n` +
        `Berikan 4-5 langkah strategis prioritas tinggi yang harus dilakukan compliance officer minggu ini, dengan urutan dari yang paling mendesak.`,
    }

    try {
      const res = await sendCopilotMessage({ message: prompts[type], conversation: [] })
      setAiResult(res.reply)
    } catch (e) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) return (
    <div className="loading-state fade-in">
      <div className="spinner" />
      <span>Memuat dashboard...</span>
    </div>
  )

  if (error) return (
    <div className="empty-state fade-in">
      <div className="icon" style={{ fontSize: '2.5rem' }}>⚠</div>
      <p style={{ color: 'var(--critical)' }}>{error}</p>
      <p style={{ marginTop: 8 }}>Pastikan FastAPI berjalan di localhost:8000</p>
    </div>
  )

  // Kalau adjustedData aktif, pakai summary dari hasil recalculate
  const summary = adjustedData?.summary
    ? {
        critical: adjustedData.summary.critical,
        high:     adjustedData.summary.high,
        medium:   adjustedData.summary.medium,
        low:      adjustedData.summary.low,
      }
    : {
        critical: data?.critical,
        high:     data?.high,
        medium:   data?.medium,
        low:      data?.low,
      }

  const pieData = [
    { name: 'Critical', value: summary.critical },
    { name: 'High',     value: summary.high },
    { name: 'Medium',   value: summary.medium },
    { name: 'Low',      value: summary.low },
  ]

  const topAccounts = data.top_accounts || []

  return (
    <div className="fade-in">
      {/* Page header */}
      <div className="page-header">
        <h2>Dashboard Overview</h2>
        <p>Real-time risk detection summary dari model JudolGuard</p>
      </div>

      {/* Banner adjusted mode */}
      {adjustedData && (
        <div style={{
          marginBottom: 14, padding: '10px 16px',
          background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.35)',
          borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10,
          fontSize: '0.78rem', color: '#eab308',
        }}>
          <span style={{ fontSize: '1rem' }}>⚙️</span>
          <span>
            <strong>Mode Adjusted Aktif</strong> — Menampilkan risk score yang sudah dihitung ulang berdasarkan bobot parameter untuk
            <strong style={{ color: '#00d4ff' }}> {adjustedData.company}</strong>.
            Pergi ke <strong>Parameter</strong> untuk mengubah atau mereset.
          </span>
        </div>
      )}

      {/* ── KPI Cards — fokus akun saja ────────────────────────── */}
      <div className="kpi-grid">
        <div className="kpi-card brand">
          <div className="kpi-label">Total Monitored Accounts</div>
          <div className="kpi-value">{data.total_accounts?.toLocaleString()}</div>
          <div className="kpi-sub">Active in JudolGuard system</div>
        </div>
        <div className="kpi-card critical">
          <div className="kpi-label">Critical</div>
          <div className="kpi-value">{summary.critical}</div>
          <div className="kpi-sub">Score ≥ 81 — escalate to OJK/PPATK</div>
        </div>
        <div className="kpi-card high">
          <div className="kpi-label">High</div>
          <div className="kpi-value">{summary.high}</div>
          <div className="kpi-sub">Score 61–80 — restrict transfers</div>
        </div>
        <div className="kpi-card medium">
          <div className="kpi-label">Medium</div>
          <div className="kpi-value">{summary.medium}</div>
          <div className="kpi-sub">Score 31–60 — send education alert</div>
        </div>
        <div className="kpi-card low">
          <div className="kpi-label">Low</div>
          <div className="kpi-value">{summary.low}</div>
          <div className="kpi-sub">Score ≤ 30 — passive monitoring</div>
        </div>
      </div>

      {/* ── AI Generate Panel ──────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,212,255,0.04), rgba(139,92,246,0.04))',
        border: '1px solid rgba(0,212,255,0.15)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        marginBottom: 20,
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiResult || aiLoading || aiError ? 14 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(139,92,246,0.2))',
              border: '1px solid rgba(0,212,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#00d4ff',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00d4ff' }}>AI Generate — Dashboard</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Generate AI insights from live dashboard data</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => generateAI('summary')}
              disabled={aiLoading}
              style={{
                padding: '7px 16px', borderRadius: 20,
                border: `1px solid ${aiMode === 'summary' ? '#00d4ff' : 'rgba(0,212,255,0.25)'}`,
                background: aiMode === 'summary' ? 'rgba(0,212,255,0.12)' : 'transparent',
                color: '#00d4ff', fontSize: '0.75rem', fontWeight: 600,
                cursor: aiLoading ? 'not-allowed' : 'pointer',
                opacity: aiLoading ? 0.6 : 1,
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-sans)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              Executive Summary
            </button>
            <button
              onClick={() => generateAI('strategy')}
              disabled={aiLoading}
              style={{
                padding: '7px 16px', borderRadius: 20,
                border: `1px solid ${aiMode === 'strategy' ? '#8b5cf6' : 'rgba(139,92,246,0.25)'}`,
                background: aiMode === 'strategy' ? 'rgba(139,92,246,0.12)' : 'transparent',
                color: '#a78bfa', fontSize: '0.75rem', fontWeight: 600,
                cursor: aiLoading ? 'not-allowed' : 'pointer',
                opacity: aiLoading ? 0.6 : 1,
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-sans)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Strategic Recommendations
            </button>
          </div>
        </div>

        {/* Output */}
        {aiLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            <div className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} />
            Generating {aiMode === 'summary' ? 'Executive Summary' : 'Strategic Recommendations'}...
            {[0,1,2].map(i => (
              <span key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#00d4ff', display: 'inline-block',
                animation: `typing-dot 1.2s ${i*0.2}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        )}

        {aiError && (
          <div style={{
            padding: '10px 14px', marginTop: 8,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8, fontSize: '0.75rem', color: 'var(--critical)',
          }}>
            ⚠ {aiError}
          </div>
        )}

        {aiResult && !aiLoading && (
          <div style={{
            padding: '14px 16px', marginTop: 2,
            background: aiMode === 'summary' ? 'rgba(0,212,255,0.05)' : 'rgba(139,92,246,0.05)',
            border: `1px solid ${aiMode === 'summary' ? 'rgba(0,212,255,0.15)' : 'rgba(139,92,246,0.15)'}`,
            borderRadius: 10, fontSize: '0.8rem',
            color: 'var(--text-primary)', lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
          }}>
            <div style={{
              fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: 8,
              color: aiMode === 'summary' ? '#00d4ff' : '#a78bfa',
            }}>
              {aiMode === 'summary' ? '◎ AI Executive Summary' : '◆ AI Strategic Recommendations'}
            </div>
            {aiResult}
            <button
              onClick={() => generateAI(aiMode)}
              style={{
                marginTop: 10, display: 'block', fontSize: '0.62rem',
                color: 'var(--text-muted)', background: 'transparent',
                border: 'none', cursor: 'pointer', textDecoration: 'underline',
                fontFamily: 'var(--font-sans)',
              }}
            >
              ↺ Regenerate
            </button>
          </div>
        )}
      </div>

      {/* ── Charts Row ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, marginBottom: 24 }}>
        {/* Pie Chart */}
        <div className="card">
          <div className="card-title">Risk Level Distribution</div>
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
          <div className="card-title">Accounts per Risk Level</div>
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
          <div className="card-title" style={{ margin: 0 }}>Top 5 Highest Risk Accounts</div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.72rem', padding: '5px 12px' }}
            onClick={() => onSelectAccount && onSelectAccount('risk-table')}
          >
            View all →
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Account ID</th>
                <th>Profil</th>
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
                    <span className="chip" style={{
                      color: PROFILE_LABELS[acc.profile]?.color || 'var(--text-muted)',
                      borderColor: `${PROFILE_LABELS[acc.profile]?.color || '#4b5563'}30`,
                    }}>
                      {PROFILE_LABELS[acc.profile]?.label || acc.profile}
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

      {/* ── Matriks Mitigasi False Positive ───────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">False Positive Mitigation Matrix</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { level: 'Critical', range: '81–100', color: 'var(--critical)', bg: 'var(--critical-bg)',
              action: 'Soft-freeze outgoing transactions + STR to PPATK/OJK', confidence: 'Very High' },
            { level: 'High', range: '61–80', color: 'var(--high)', bg: 'var(--high-bg)',
              action: 'Restrict daily transfer limits + require MFA/biometrics', confidence: 'High' },
            { level: 'Medium', range: '31–60', color: 'var(--medium)', bg: 'var(--medium-bg)',
              action: 'Send gambling risk education notification', confidence: 'Medium' },
            { level: 'Low', range: '0–30', color: 'var(--low)', bg: 'var(--low-bg)',
              action: 'Passive monitoring — no immediate action', confidence: 'Low' },
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
