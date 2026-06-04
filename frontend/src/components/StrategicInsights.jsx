import { useState, useEffect } from 'react'
import { getStrategicInsights } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts'

const ARCHETYPE_COLORS = {
  'Midnight Chaser':      '#8b5cf6',
  'QRIS Ghost':           '#f97316',
  'Micro-Smurfer':        '#ef4444',
  'Micro-Smurfer / Network Hub': '#ef4444',
  'Heavy Gambler':        '#dc2626',
}

const FINDING_ICONS = ['🌙', '📱', '🕸️', '🎰']

export default function StrategicInsights() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [activeFind, setActiveFind] = useState(0)

  useEffect(() => {
    getStrategicInsights()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-state fade-in"><div className="spinner"/><span>Memuat strategic insights...</span></div>
  if (error)   return <div className="empty-state fade-in"><div className="icon">⚠️</div><p style={{color:'var(--critical)'}}>{error}</p></div>

  const findings = data.key_findings || []
  const scenarios = data.policy_simulation?.scenarios || []
  const ppatk    = data.regulatory_alignment?.ppatk_indicators_matched || []
  const ojk      = data.regulatory_alignment?.ojk_action_mapping || {}
  const advant   = data.competitive_advantage || []

  const selectedFinding = findings[activeFind]
  const archetypeColor  = ARCHETYPE_COLORS[selectedFinding?.archetype] || '#3b82f6'

  // Policy simulation bar data
  const simData = scenarios.map(s => ({
    name:  `≥${s.threshold}`,
    value: s.accounts_flagged,
    label: s.label,
    color: s.threshold >= 95 ? '#3b82f6'
         : s.threshold >= 80 ? '#ef4444'
         : s.threshold >= 70 ? '#f97316'
         : '#eab308',
  }))

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>💡 Strategic Insights & Solusi</h2>
        <p>Rubrik 4 (20%) — Temuan strategis, simulasi kebijakan, dan alignment regulasi PPATK/OJK</p>
      </div>

      {/* ── Key Findings — navigable ────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">🔑 4 Key Findings</div>
        {/* Finding tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {findings.map((f, i) => (
            <button key={i}
              onClick={() => setActiveFind(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                borderRadius: 20, border: `1px solid ${activeFind === i ? (ARCHETYPE_COLORS[f.archetype] || '#3b82f6') + '60' : 'var(--border)'}`,
                background: activeFind === i ? `${ARCHETYPE_COLORS[f.archetype] || '#3b82f6'}15` : 'transparent',
                color: activeFind === i ? (ARCHETYPE_COLORS[f.archetype] || '#3b82f6') : 'var(--text-muted)',
                fontSize: '0.72rem', fontWeight: activeFind === i ? 700 : 400, cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{FINDING_ICONS[i]}</span>
              <span>Finding #{f.rank}</span>
            </button>
          ))}
        </div>

        {/* Active finding detail */}
        {selectedFinding && (
          <div style={{
            padding: '18px 20px', borderRadius: 'var(--radius-md)',
            background: `${archetypeColor}0a`, border: `1px solid ${archetypeColor}30`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: archetypeColor, lineHeight: 1.4, flex: 1 }}>
                {FINDING_ICONS[activeFind]} {selectedFinding.title}
              </div>
              <span style={{
                padding: '3px 12px', borderRadius: 20, marginLeft: 12, flexShrink: 0,
                background: `${archetypeColor}20`, color: archetypeColor,
                fontSize: '0.68rem', fontWeight: 700, border: `1px solid ${archetypeColor}40`,
              }}>
                {selectedFinding.archetype}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${archetypeColor}` }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>📊 Finding</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selectedFinding.finding}</div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #eab308' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>⚠️ Implikasi</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selectedFinding.implication}</div>
              </div>
              <div style={{ padding: '12px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #22c55e' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>✅ Tindakan</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selectedFinding.action}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* ── Policy Simulation ───────────────────────────────── */}
        <div className="card">
          <div className="card-title">⚖️ Simulasi Dampak Kebijakan Threshold</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            {data.policy_simulation?.description}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={simData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: '0.72rem' }}
                formatter={(v, _, p) => [v + ' akun', p.payload.label]}
              />
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {simData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Scenario labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
            {scenarios.map(s => (
              <div key={s.threshold} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Threshold ≥{s.threshold}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.accounts_flagged} akun</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Regulatory alignment ────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-title">📋 PPATK Indicators Matched</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {ppatk.map((ind, i) => (
                <div key={i} style={{
                  padding: '7px 10px', background: 'rgba(34,197,94,0.07)',
                  border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6,
                  fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4,
                }}>
                  {ind}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: '0.6rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Sumber: {data.regulatory_alignment?.source}
            </div>
          </div>

          <div className="card">
            <div className="card-title">🏦 OJK Action Mapping</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(ojk).map(([level, action]) => {
                const colors = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e' }
                const col = colors[level] || '#4b5563'
                return (
                  <div key={level} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: 'var(--bg-surface)', borderRadius: 6 }}>
                    <span className={`risk-badge ${level}`} style={{ flexShrink: 0 }}>{level}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{action}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Competitive Advantage ───────────────────────────── */}
      <div className="card">
        <div className="card-title">🏆 Keunggulan Kompetitif JudolGuard</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {advant.map((a, i) => {
            const icons = ['⚡', '💬', '🕸️', '⚙️']
            const colors = ['#3b82f6', '#8b5cf6', '#ef4444', '#22c55e']
            return (
              <div key={i} style={{
                display: 'flex', gap: 12, padding: '14px 16px',
                background: `${colors[i]}08`, border: `1px solid ${colors[i]}20`,
                borderRadius: 'var(--radius-md)', alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: `${colors[i]}20`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.9rem',
                }}>
                  {icons[i]}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {a}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
