import { useState, useRef, useEffect } from 'react'
import { createETLStream, getEDASummary } from '../api'

const PHASE_COLORS = {
  1: '#3b82f6', // Extract
  2: '#8b5cf6', // Filter
  3: '#f97316', // Feature Engineering
  4: '#22c55e', // Anomaly Scoring
  5: '#ef4444', // Risk Classification
  6: '#0078d4', // Explainability (Azure)
  7: '#10b981', // Load
}

export default function ETLWizard() {
  const [phase,    setPhase]    = useState('idle')    // idle | running | done
  const [logs,     setLogs]     = useState([])
  const [etlFlow,  setEtlFlow]  = useState([])
  const [progress, setProgress] = useState(0)
  const [stats,    setStats]    = useState(null)
  const logRef     = useRef(null)
  const sourceRef  = useRef(null)

  // Load ETL flow steps dari /api/eda-summary
  useEffect(() => {
    getEDASummary()
      .then(d => {
        setEtlFlow(d.etl_flow || [])
        setStats({
          total_accounts:    d.total_accounts,
          total_transactions: d.total_transactions,
          at_risk_pct:       d.label_distribution?.at_risk_pct,
        })
      })
      .catch(() => {})
  }, [])

  // Auto-scroll log ke bawah
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  const startETL = () => {
    if (sourceRef.current) sourceRef.current.close()
    setPhase('running')
    setLogs([])
    setProgress(0)

    // Hitung total langkah dari SSE (14 log + 1 DONE = 15)
    const TOTAL_STEPS = 15
    let step = 0

    const es = new EventSource('/api/etl-simulate')
    sourceRef.current = es

    es.onmessage = (e) => {
      const { log, done } = JSON.parse(e.data)
      step++
      setProgress(Math.min(Math.round((step / TOTAL_STEPS) * 100), 100))
      setLogs(prev => [...prev, { text: log, done }])

      if (done) {
        es.close()
        setPhase('done')
        setProgress(100)
      }
    }

    es.onerror = () => {
      es.close()
      setLogs(prev => [...prev, { text: '⚠ Koneksi SSE terputus. Pastikan FastAPI running.', done: false, isError: true }])
      setPhase('idle')
    }
  }

  const reset = () => {
    if (sourceRef.current) sourceRef.current.close()
    setPhase('idle')
    setLogs([])
    setProgress(0)
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>🔄 Adaptive ETL Pipeline</h2>
        <p>Simulasi ingest data transaksi skala enterprise dari Azure Cloud Storage ke mesin JudolGuard</p>
      </div>

      {/* ── Stats bar ────────────────────────────────────────── */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Raw Transactions', value: stats.total_transactions?.toLocaleString(), icon: '📦' },
            { label: 'Akun Berisiko',    value: stats.total_accounts?.toLocaleString(),     icon: '👤' },
            { label: 'At-Risk Rate',     value: `${stats.at_risk_pct}%`,                    icon: '⚠️' },
          ].map(s => (
            <div key={s.label} className="card" style={{ flex: 1, padding: '14px 18px' }}>
              <div style={{ fontSize: '1.2rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* ── Left: ETL Flow Diagram ─────────────────────────── */}
        <div className="card">
          <div className="card-title">Pipeline Architecture</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {etlFlow.map((step, idx) => {
              const isActive = phase === 'running' && logs.length > 0 &&
                Math.floor((logs.length / 15) * etlFlow.length) >= idx
              const isDone   = phase === 'done' || (
                phase === 'running' && Math.floor((logs.length / 15) * etlFlow.length) > idx
              )

              return (
                <div key={step.step}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    background: isDone   ? `${PHASE_COLORS[step.step]}18`
                              : isActive ? `${PHASE_COLORS[step.step]}10`
                              : 'var(--bg-surface)',
                    border: `1px solid ${isDone || isActive ? PHASE_COLORS[step.step] + '40' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all 0.3s ease',
                  }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? PHASE_COLORS[step.step] : 'var(--bg-hover)',
                      fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                      color: isDone ? '#fff' : 'var(--text-muted)',
                      transition: 'all 0.3s ease',
                    }}>
                      {isDone ? '✓' : step.step}
                    </span>
                    <span style={{ fontSize: '0.9rem' }}>{step.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.78rem', fontWeight: 600,
                        color: isDone ? PHASE_COLORS[step.step] : 'var(--text-secondary)'
                      }}>
                        {step.name}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{step.desc}</div>
                    </div>
                  </div>
                  {idx < etlFlow.length - 1 && (
                    <div style={{
                      width: 1, height: 6, background: 'var(--border)',
                      margin: '0 auto', marginLeft: 27
                    }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right: Terminal + Controls ─────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Control panel */}
          <div className="card">
            <div className="card-title">Kontrol Pipeline</div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              Klik tombol di bawah untuk memulai simulasi ingest data transaksi skala enterprise
              dari Azure Cloud Storage ke mesin JudolGuard.
            </p>

            {phase === 'idle' && (
              <button className="btn btn-primary" onClick={startETL} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                🚀 Hubungkan Data Perusahaan
              </button>
            )}

            {phase === 'running' && (
              <div>
                {/* Progress bar */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6
                  }}>
                    <span>Progress</span>
                    <span className="mono">{progress}%</span>
                  </div>
                  <div style={{
                    height: 8, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%', width: `${progress}%`,
                      background: 'var(--brand)', borderRadius: 4,
                      transition: 'width 0.5s ease',
                      boxShadow: '0 0 8px rgba(59,130,246,0.5)'
                    }} />
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={reset} style={{ width: '100%', justifyContent: 'center' }}>
                  ⏹ Hentikan
                </button>
              </div>
            )}

            {phase === 'done' && (
              <div>
                <div style={{
                  background: 'var(--low-bg)', border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: 12,
                  fontSize: '0.78rem', color: 'var(--low)', textAlign: 'center'
                }}>
                  ✅ ETL Pipeline selesai! Data siap dianalisis.
                </div>
                <button className="btn btn-ghost" onClick={reset} style={{ width: '100%', justifyContent: 'center' }}>
                  🔄 Jalankan Ulang
                </button>
              </div>
            )}
          </div>

          {/* Terminal log */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-title">Output Log</div>
            <div className="terminal" ref={logRef} style={{ maxHeight: 280 }}>
              {logs.length === 0 && (
                <span style={{ color: 'var(--text-muted)' }}>
                  $ Menunggu perintah start pipeline...
                </span>
              )}
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`log-line${log.done ? ' log-done' : ''}${log.isError ? ' log-error' : ''}`}
                  style={log.isError ? { color: 'var(--critical)' } : {}}
                >
                  {log.done ? '' : '$ '}{log.text}
                </div>
              ))}
              {phase === 'running' && <span className="log-cursor" />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Penjelasan inovasi ────────────────────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">💡 Kenapa Adaptive ETL?</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            {
              icon: '🎯',
              title: 'Resource Efficient',
              desc: '78% transaksi normal dibuang di tahap Filter sebelum masuk model. Hanya anomali yang diproses.'
            },
            {
              icon: '⚡',
              title: 'Real-Time Ready',
              desc: 'Pipeline dirancang untuk streaming — transaksi baru bisa dianalisis dalam hitungan detik.'
            },
            {
              icon: '🔒',
              title: 'PPATK-Aligned',
              desc: 'Filter threshold mengikuti indikator STR PPATK: nominal kecil + frekuensi tinggi + jam malam.'
            }
          ].map(f => (
            <div key={f.title} style={{
              background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
              padding: '14px', border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
