import { useState, useEffect } from 'react'
import { getAzureProof } from '../api'

const SERVICE_ICONS = {
  'Azure OpenAI (GPT-4o)':    { icon: '🧠', color: '#0078d4' },
  'Azure Machine Learning':   { icon: '☁️', color: '#50e6ff' },
}

export default function AzureProof() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    getAzureProof()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-state fade-in"><div className="spinner"/><span>Memuat Azure proof...</span></div>
  if (error)   return <div className="empty-state fade-in"><div className="icon">⚠️</div><p style={{color:'var(--critical)'}}>{error}</p></div>

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>☁️ Azure Services</h2>
        <p>Layanan Microsoft Azure yang menggerakkan JudolGuard — dari analisis data hingga AI Co-Pilot</p>
      </div>

      {/* ── Azure Summary Banner ───────────────────────────── */}
      <div style={{
        padding: '20px 24px', marginBottom: 20, borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(0,120,212,0.15), rgba(80,230,255,0.08))',
        border: '1px solid rgba(0,120,212,0.3)',
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{ fontSize: '3rem' }}>☁️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#50e6ff', marginBottom: 4 }}>
            Microsoft Azure — Teknologi di Balik JudolGuard
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            JudolGuard dibangun di atas infrastruktur Microsoft Azure untuk memastikan performa, skalabilitas, dan keamanan analisis risiko secara real-time.
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>Status</div>
          <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.85rem' }}>✓ Active</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 6 }}>All services operational</div>
        </div>
      </div>

      {/* ── Services ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {(data.services || []).map(svc => {
          const cfg = SERVICE_ICONS[svc.name] || { icon: '☁️', color: '#0078d4' }
          return (
            <div key={svc.name} className="card" style={{ border: `1px solid ${cfg.color}30` }}>
              {/* Service header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: `${cfg.color}20`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0,
                }}>
                  {cfg.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: cfg.color }}>{svc.name}</div>
                  <span style={{
                    display: 'inline-block', padding: '2px 8px',
                    background: 'rgba(34,197,94,0.15)', color: '#22c55e',
                    border: '1px solid rgba(34,197,94,0.3)', borderRadius: 20,
                    fontSize: '0.62rem', fontWeight: 700, marginTop: 3,
                  }}>
                    {svc.status}
                  </span>
                </div>
              </div>

              {/* Service details removed for cleaner UI */}

              {/* Usage list */}
              <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Digunakan untuk:</div>
                {(svc.usage || []).map((u, i) => {
                  // Hapus referensi nama file Python agar ramah untuk user
                  const clean = u.replace(/\s*\([^)]*\.py[^)]*\)/g, '').replace(/\s*\(main_api\.py[^)]*\)/g, '').trim()
                  return (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 5 }}>
                      <span style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}>✓</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{clean}</span>
                    </div>
                  )
                })}
              </div>

            </div>
          )
        })}
      </div>

      {/* ── Model Metrics from Azure ML ─────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card" style={{ border: '1px solid rgba(0,120,212,0.2)' }}>
          <div className="card-title" style={{ color: '#0078d4' }}>📊 Performa Model AI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(data.model_metrics || {}).map(([k, v]) => {
              const labels = { pr_auc: 'PR-AUC', f1_score: 'F1-Score', roc_auc: 'ROC-AUC' }
              const colors = { pr_auc: '#3b82f6', f1_score: '#22c55e', roc_auc: '#8b5cf6' }
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 72, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{labels[k] || k}</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${v * 100}%`, background: colors[k] || '#3b82f6', borderRadius: 3 }} />
                  </div>
                  <span className="mono" style={{ fontSize: '0.82rem', fontWeight: 700, color: colors[k] || '#3b82f6', width: 48, textAlign: 'right' }}>
                    {v}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card" style={{ border: '1px solid rgba(0,120,212,0.2)' }}>
          <div className="card-title" style={{ color: '#0078d4' }}>🔗 Cara Azure Bekerja di JudolGuard</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { step: '01', icon: '📊', label: 'Data Sintetis',      azure: 'Azure OpenAI GPT-4o', detail: 'Generate 650K+ data transaksi realistis berbasis pola PPATK' },
              { step: '02', icon: '🤖', label: 'Training Model',     azure: 'Azure Machine Learning', detail: 'Melatih dan mengoptimasi model deteksi fraud secara otomatis' },
              { step: '03', icon: '📦', label: 'Penyimpanan Model',  azure: 'Azure ML Registry',  detail: 'Model tersimpan aman dan siap dipakai kapan saja' },
              { step: '04', icon: '💡', label: 'Penjelasan Risiko',  azure: 'Azure OpenAI GPT-4o', detail: 'Menghasilkan narasi risiko per akun dalam bahasa natural' },
              { step: '05', icon: '🛡️', label: 'Jugu AI Assistant', azure: 'Azure OpenAI GPT-4o', detail: 'Partner analisis fraud real-time yang bisa kamu ajak diskusi' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 10px', background: 'var(--bg-surface)', borderRadius: 6 }}>
                <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', width: 22, flexShrink: 0 }}>{s.step}</span>
                <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{s.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{s.detail}</div>
                </div>
                <span style={{ fontSize: '0.62rem', color: '#0078d4', fontWeight: 600, flexShrink: 0, textAlign: 'right', maxWidth: 110 }}>{s.azure}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
