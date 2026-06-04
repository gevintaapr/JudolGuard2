import { useState, useEffect } from 'react'
import { getAccountDetail } from '../api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const PROFILE_LABELS = {
  normal:        { label: 'Normal',        icon: '😊', color: '#22c55e' },
  early_stage:   { label: 'Early Stage',   icon: '⚠️', color: '#eab308' },
  escalating:    { label: 'Escalating',    icon: '📈', color: '#f97316' },
  heavy_gambler: { label: 'Heavy Gambler', icon: '🎰', color: '#ef4444' },
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '14px',
    }}>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: color || 'var(--text-primary)', marginTop: 4 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// Custom tooltip untuk line chart
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-md)',
      borderRadius: 8, padding: '10px 14px', fontSize: '0.72rem'
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>Hari ke-{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', gap: 8 }}>
          <span>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AccountDetail({ accountId, onBack }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    setError(null)
    getAccountDetail(accountId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [accountId])

  if (!accountId) return (
    <div className="empty-state fade-in">
      <div className="icon">🔍</div>
      <p>Pilih akun dari Risk Table untuk melihat detail</p>
    </div>
  )

  if (loading) return (
    <div className="loading-state fade-in">
      <div className="spinner" />
      <span>Memuat detail akun {accountId}...</span>
    </div>
  )

  if (error) return (
    <div className="empty-state fade-in">
      <div className="icon">⚠️</div>
      <p style={{ color: 'var(--critical)' }}>{error}</p>
      <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={onBack}>← Kembali</button>
    </div>
  )

  const score   = data.final_risk_score
  const level   = data.risk_level
  const prof    = PROFILE_LABELS[data.profile]
  const scoreColor = score >= 81 ? '#ef4444' : score >= 61 ? '#f97316' : score >= 31 ? '#eab308' : '#22c55e'

  const timeline = (data.timeline || []).map(t => ({
    ...t,
    amount_k: t.amount != null ? Math.round(t.amount / 1000) : null,
  }))

  return (
    <div className="fade-in">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ flexShrink: 0, marginTop: 4 }}>
          ← Kembali
        </button>
        <div className="page-header" style={{ margin: 0, flex: 1 }}>
          <h2 className="mono">🔍 {accountId}</h2>
          <p>Profil risiko lengkap — analisis behavioral multi-dimensi</p>
        </div>
        {/* Risk score gauge */}
        <div style={{
          flexShrink: 0, textAlign: 'center', padding: '12px 20px',
          background: `${scoreColor}15`, border: `1px solid ${scoreColor}40`,
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Risk Score
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: scoreColor, lineHeight: 1.1 }}>
            {score}
          </div>
          <span className={`risk-badge ${level}`} style={{ marginTop: 4 }}>{level}</span>
        </div>
      </div>

      {/* ── Profile + Archetype ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ fontSize: '2.5rem' }}>{prof?.icon || '👤'}</div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Behavioral Profile</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: prof?.color || 'var(--text-primary)', marginTop: 2 }}>
              {prof?.label || data.profile}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {data.archetype || '—'}
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Tindakan yang Disarankan
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {data.recommendation || '—'}
          </div>
        </div>
      </div>

      {/* ── Behavioral Stats ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        <StatCard
          label="Night Ratio"
          value={data.avg_night_ratio != null ? `${(data.avg_night_ratio * 100).toFixed(0)}%` : '—'}
          sub="Transaksi 22.00–04.00"
          color={data.avg_night_ratio > 0.5 ? '#ef4444' : undefined}
        />
        <StatCard
          label="Temporal Shift"
          value={data.avg_temporal_shift != null ? `${data.avg_temporal_shift > 0 ? '+' : ''}${Number(data.avg_temporal_shift).toFixed(3)}` : '—'}
          sub="Pergeseran jam aktivitas"
          color={data.avg_temporal_shift > 0.1 ? '#f97316' : undefined}
        />
        <StatCard
          label="Burst Score"
          value={data.avg_burst_score != null ? Number(data.avg_burst_score).toFixed(1) : '—'}
          sub="Lonjakan transaksi/24j"
          color={data.avg_burst_score > 3 ? '#eab308' : undefined}
        />
        <StatCard
          label="Penerima Unik/7d"
          value={data.avg_unique_recv != null ? Number(data.avg_unique_recv).toFixed(0) : '—'}
          sub="Multi-recipient pattern"
          color={data.avg_unique_recv > 10 ? '#f97316' : undefined}
        />
        <StatCard
          label="QRIS Ratio"
          value={data.avg_qris_ratio != null ? `${(data.avg_qris_ratio * 100).toFixed(0)}%` : '—'}
          sub="Porsi transaksi QRIS"
          color={data.avg_qris_ratio > 0.6 ? '#ef4444' : undefined}
        />
        <StatCard
          label="Tx/24h"
          value={data.avg_tx_24h != null ? Number(data.avg_tx_24h).toFixed(1) : '—'}
          sub="Rata-rata transaksi harian"
        />
      </div>

      {/* ── Top Triggers ──────────────────────────────────────── */}
      {data.top_triggers && data.top_triggers !== '—' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">🚩 Top Risk Triggers</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {data.top_triggers}
          </div>
        </div>
      )}

      {/* ── AI Explanation ────────────────────────────────────── */}
      {data.explanation && (
        <div className="card" style={{ marginBottom: 16, background: 'rgba(0,120,212,0.06)', border: '1px solid rgba(0,120,212,0.2)' }}>
          <div className="card-title" style={{ color: '#0078d4' }}>☁️ Azure OpenAI — Risk Explanation</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {data.explanation}
          </div>
        </div>
      )}

      {/* ── Timeline Chart ────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>📈 Timeline Perilaku</div>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {timeline.length} snapshot harian
          </span>
        </div>

        {timeline.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px' }}>
            <p>Data timeline tidak tersedia untuk akun ini</p>
          </div>
        ) : (
          <>
            {/* Chart 1: Temporal shift + Night ratio */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                Temporal Shift & Night Ratio (7d)
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={timeline} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} />
                  <Line type="monotone" dataKey="temporal_shift" name="Temporal Shift"
                    stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="night_ratio_7d" name="Night Ratio 7d"
                    stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Tx count + Burst score */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                Frekuensi Transaksi & Burst Score
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={timeline} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.7rem', color: 'var(--text-muted)' }} />
                  <Line type="monotone" dataKey="tx_count_24h" name="Tx/24h"
                    stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="burst_score" name="Burst Score"
                    stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 3: Amount (dalam ribuan) */}
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                Nominal Transaksi (dalam Rp ribu)
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={timeline} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="amount_k" name="Amount (Rp ribu)"
                    stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
