import { useState } from 'react'
import { recalculateScores } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts'

const RISK_COLORS = {
  Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e'
}

const WEIGHT_CONFIG = [
  {
    key:   'w_night',
    label: 'Bobot Aktivitas Malam',
    icon:  '🌙',
    desc:  'Seberapa besar pengaruh transaksi di luar jam kerja (22.00–04.00)',
    tip:   'Semakin tinggi → akun yang sering bertransaksi dini hari dianggap lebih mencurigakan',
  },
  {
    key:   'w_velocity',
    label: 'Bobot Kecepatan Transaksi',
    icon:  '⚡',
    desc:  'Seberapa besar pengaruh lonjakan jumlah transaksi dalam waktu singkat',
    tip:   'Semakin tinggi → akun dengan volume transaksi tiba-tiba tinggi lebih cepat terdeteksi',
  },
  {
    key:   'w_recipient',
    label: 'Bobot Penerima Beragam',
    icon:  '👥',
    desc:  'Seberapa besar pengaruh pengiriman dana ke banyak rekening berbeda',
    tip:   'Semakin tinggi → pola smurfing (transfer ke banyak pihak kecil) lebih mudah terflag',
  },
  {
    key:   'w_smurfing',
    label: 'Bobot Penularan Risiko Jaringan',
    icon:  '🕸️',
    desc:  'Seberapa besar pengaruh kedekatan akun dengan jaringan berisiko tinggi',
    tip:   'Semakin tinggi → akun yang berhubungan dengan akun Critical lebih cepat ikut terdeteksi',
  },
]

function Slider({ config, value, onChange }) {
  const pct = Math.round(value * 100)
  const colorHue = Math.round(120 - value * 120) // hijau → merah
  const trackColor = `hsl(${colorHue}, 80%, 50%)`

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: '1rem' }}>{config.icon}</span>
            <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{config.label}</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{config.desc}</div>
        </div>
        {/* Value display */}
        <div style={{
          minWidth: 44, textAlign: 'center',
          background: `${trackColor}20`, border: `1px solid ${trackColor}50`,
          borderRadius: 'var(--radius-sm)', padding: '4px 10px',
        }}>
          <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 800, color: trackColor }}>
            {value.toFixed(1)}
          </span>
        </div>
      </div>

      <input
        type="range"
        className="slider"
        min={0} max={1} step={0.1}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ '--thumb-color': trackColor }}
      />

      {/* Scale */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.6rem', color: 'var(--text-muted)' }}>
        <span>0.0 (Non-aktif)</span>
        <span>0.5 (Default)</span>
        <span>1.0 (Maksimum)</span>
      </div>

      {/* Tip */}
      <div style={{ marginTop: 8, fontSize: '0.65rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        💡 {config.tip}
      </div>
    </div>
  )
}

export default function ParameterConfig({ onAdjust, adjustedData }) {
  const [weights, setWeights] = useState({
    w_night:     0.7,
    w_velocity:  0.7,
    w_recipient: 0.7,
    w_smurfing:  0.5,
  })
  const [result,   setResult]   = useState(adjustedData || null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const setWeight = (key, val) => setWeights(w => ({ ...w, [key]: val }))

  const apply = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await recalculateScores(weights)
      setResult(res)
      if (onAdjust) onAdjust(res)   // propagasi ke seluruh app
    } catch(e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const resetDefaults = () => {
    setWeights({ w_night: 0.7, w_velocity: 0.7, w_recipient: 0.7, w_smurfing: 0.5 })
    setResult(null)
    if (onAdjust) onAdjust(null)   // reset di seluruh app
  }

  // Comparison chart data
  const summaryBefore = result
    ? [
        { name: 'Critical', before: null, after: result.summary.critical },
        { name: 'High',     before: null, after: result.summary.high },
        { name: 'Medium',   before: null, after: result.summary.medium },
        { name: 'Low',      before: null, after: result.summary.low },
      ]
    : []

  // Top akun dengan delta terbesar
  const topDelta = result
    ? [...result.accounts]
        .filter(a => a.score_delta !== 0)
        .sort((a, b) => Math.abs(b.score_delta) - Math.abs(a.score_delta))
        .slice(0, 10)
    : []

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>⚙️ Dynamic Parameter Weighting Engine</h2>
        <p>Sesuaikan bobot deteksi risiko sesuai kebijakan internal perusahaan — tanpa ubah model</p>
      </div>

      {/* ── How weighting works ──────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <div className="card-title" style={{ color: 'var(--brand-from)' }}>ℹ️ Cara Kerja Penyesuaian Skor</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          Sistem AI JudolGuard menganalisis setiap akun berdasarkan <strong style={{ color: 'var(--text-primary)' }}>4 dimensi perilaku</strong>.
          Dengan panel ini, tim compliance dapat menentukan <em>seberapa besar bobot</em> masing-masing dimensi
          sesuai kebijakan internal — tanpa mengubah model AI yang mendasari deteksi.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 12 }}>
          {[['🌙','Aktivitas Malam','Apakah akun aktif di luar jam wajar?'],
            ['⚡','Kecepatan Transaksi','Apakah frekuensi transaksi melonjak tiba-tiba?'],
            ['👥','Penerima Beragam','Apakah dana dikirim ke banyak rekening berbeda?'],
            ['🕸️','Penularan Risiko Jaringan','Apakah akun terhubung ke jaringan berisiko tinggi?']
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.9rem', marginTop: 1 }}>{icon}</span>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        {/* ── Left: Sliders ─────────────────────────────────────── */}
        <div>
          {/* Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {WEIGHT_CONFIG.map(cfg => (
              <Slider
                key={cfg.key}
                config={cfg}
                value={weights[cfg.key]}
                onChange={val => setWeight(cfg.key, val)}
              />
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
              onClick={apply}
              disabled={loading}
            >
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Menghitung...</> : '🔄 Apply — Hitung Ulang Skor'}
            </button>
            <button className="btn btn-ghost" onClick={resetDefaults} disabled={loading}>
              Reset
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: 10, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--critical-bg)', border: '1px solid rgba(239,68,68,0.3)',
              color: 'var(--critical)', fontSize: '0.78rem'
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* ── Right: Results ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!result ? (
            <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚙️</div>
                <div style={{ fontSize: '0.82rem' }}>Atur bobot di sebelah kiri,<br />lalu klik <strong>Apply</strong> untuk melihat hasil</div>
              </div>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="card">
                <div className="card-title">
                  Ringkasan Risiko (Adjusted)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {['critical','high','medium','low'].map(l => {
                    const key  = l.charAt(0).toUpperCase() + l.slice(1)
                    const val  = result.summary[l]
                    const col  = RISK_COLORS[key]
                    return (
                      <div key={l} style={{
                        textAlign: 'center', padding: '10px 6px',
                        background: `${col}12`, border: `1px solid ${col}30`,
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: col }}>{val}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{key}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Bar chart hasil */}
              <div className="card">
                <div className="card-title">Distribusi Adjusted Score</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={[
                    { name: 'Critical', value: result.summary.critical },
                    { name: 'High',     value: result.summary.high },
                    { name: 'Medium',   value: result.summary.medium },
                    { name: 'Low',      value: result.summary.low },
                  ]} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-md)', borderRadius: 8, fontSize: '0.75rem' }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="value" radius={[4,4,0,0]}>
                      {['Critical','High','Medium','Low'].map(k => (
                        <Cell key={k} fill={RISK_COLORS[k]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top delta accounts */}
              {topDelta.length > 0 && (
                <div className="card" style={{ flex: 1 }}>
                  <div className="card-title">📊 Akun dengan Perubahan Skor Terbesar</div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Account ID</th>
                          <th>Base</th>
                          <th>Adjusted</th>
                          <th>Delta</th>
                          <th>Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topDelta.map(acc => {
                          const up = acc.score_delta > 0
                          return (
                            <tr key={acc.account_id}>
                              <td className="mono" style={{ fontSize: '0.72rem', color: 'var(--brand-from)' }}>
                                {acc.account_id}
                              </td>
                              <td className="mono" style={{ fontSize: '0.75rem' }}>
                                {acc.final_risk_score}
                              </td>
                              <td className="mono" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                {acc.adjusted_score}
                              </td>
                              <td className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: up ? 'var(--critical)' : 'var(--low)' }}>
                                {up ? '+' : ''}{acc.score_delta}
                              </td>
                              <td><span className={`risk-badge ${acc.adjusted_level}`}>{acc.adjusted_level}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
