import { useState, useEffect } from 'react'
import { getModelMetrics } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const METRIC_COLOR = { pr_auc: '#3b82f6', f1_score: '#22c55e', roc_auc: '#8b5cf6' }

export default function ModelMetrics() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    getModelMetrics()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-state fade-in"><div className="spinner"/><span>Memuat model metrics...</span></div>
  if (error)   return <div className="empty-state fade-in"><div className="icon">⚠️</div><p style={{color:'var(--critical)'}}>{error}</p></div>

  const importanceData = (data.feature_importance || []).map(f => ({
    name:  f.feature,
    value: Math.round(f.importance * 100),
    color: f.importance > 0.3 ? '#ef4444' : f.importance > 0.2 ? '#f97316' : '#3b82f6',
    interpretation: f.interpretation,
  }))

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>🧠 Model Metrics & Performa</h2>
        <p>Rubrik 2 (25%) — Kualitas model, justifikasi arsitektur hybrid, dan cross-validation</p>
      </div>

      {/* ── Main metrics ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
        {[
          { key: 'pr_auc',   label: 'PR-AUC',   value: data.metrics.pr_auc,   baseline: 0.35, desc: 'Primary metric (imbalanced data)' },
          { key: 'f1_score', label: 'F1-Score',  value: data.metrics.f1_score, baseline: 0.60, desc: 'Precision-Recall harmonic mean' },
          { key: 'roc_auc',  label: 'ROC-AUC',  value: data.metrics.roc_auc,  baseline: 0.50, desc: 'Area under ROC curve' },
        ].map(m => {
          const color = METRIC_COLOR[m.key]
          const improvement = ((m.value - m.baseline) / m.baseline * 100).toFixed(0)
          return (
            <div key={m.key} className="card" style={{ border: `1px solid ${color}30` }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                {m.label}
              </div>
              {/* Main value */}
              <div style={{ fontSize: '2.8rem', fontWeight: 900, color, lineHeight: 1, marginBottom: 6 }}>
                {m.value}
              </div>
              {/* Progress bar vs baseline */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>Baseline: {m.baseline}</span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>+{improvement}% ↑</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                  {/* Baseline marker */}
                  <div style={{ position: 'absolute', left: `${m.baseline * 100}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.3)', zIndex: 1 }} />
                  {/* Fill */}
                  <div style={{ height: '100%', width: `${m.value * 100}%`, background: color, borderRadius: 3, boxShadow: `0 0 6px ${color}60` }} />
                </div>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{m.desc}</div>
            </div>
          )
        })}
      </div>

      {/* ── Why PR-AUC ────────────────────────────────────────── */}
      <div style={{
        padding: '14px 16px', marginBottom: 16, borderRadius: 'var(--radius-md)',
        background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)',
      }}>
        <div style={{ fontWeight: 700, color: 'var(--brand-from)', marginBottom: 6, fontSize: '0.82rem' }}>
          📊 Kenapa PR-AUC Sebagai Metrik Utama?
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {data.why_pr_auc}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* ── Why Hybrid ──────────────────────────────────────── */}
        <div className="card">
          <div className="card-title">🔀 Kenapa Hybrid IF + XGBoost?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data.why_hybrid || []).map((reason, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: i === 0 ? 'rgba(34,197,94,0.2)' : i === 1 ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
                  color: i === 0 ? '#22c55e' : i === 1 ? '#ef4444' : '#3b82f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 800,
                }}>
                  {['🌲','🤖','🏆'][i]}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {reason}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CV Details ──────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-title">🔁 Cross-Validation</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Metode',  val: data.cv?.method },
                { label: 'Metrik',  val: data.cv?.metric },
                { label: 'Catatan', val: data.cv?.note   },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', width: 60, flexShrink: 0 }}>{r.label}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">⚙️ Hyperparameters</div>
            <div style={{ fontSize: '0.72rem', lineHeight: 2 }}>
              <div style={{ color: 'var(--medium)', fontWeight: 600, marginBottom: 4 }}>Isolation Forest</div>
              {Object.entries(data.hyperparameters?.isolation_forest || {}).map(([k,v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', borderRadius: 4, marginBottom: 2, background: 'var(--bg-surface)' }}>
                  <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{k}</span>
                  <span className="mono" style={{ color: 'var(--low)' }}>{v}</span>
                </div>
              ))}
              <div style={{ color: 'var(--brand-from)', fontWeight: 600, marginTop: 8, marginBottom: 4 }}>XGBoost</div>
              {Object.entries(data.hyperparameters?.xgboost || {}).map(([k,v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 8px', borderRadius: 4, marginBottom: 2, background: 'var(--bg-surface)' }}>
                  <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{k}</span>
                  <span className="mono" style={{ color: 'var(--brand-from)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Feature Importance ──────────────────────────────── */}
      <div className="card">
        <div className="card-title">📊 Feature Importance (Normalized)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20, alignItems: 'center' }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={importanceData} layout="vertical" margin={{ top: 0, right: 40, left: 40, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} domain={[0, 50]} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: '0.75rem' }}
                formatter={v => [`${v}%`, 'Importance']}
              />
              <Bar dataKey="value" radius={[0,4,4,0]}>
                {importanceData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Interpretation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(data.feature_importance || []).map((f, i) => (
              <div key={f.feature} style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', borderLeft: `3px solid ${importanceData[i]?.color || '#4b5563'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: importanceData[i]?.color }}>{f.feature}</span>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{(f.importance * 100).toFixed(0)}%</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{f.interpretation}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
