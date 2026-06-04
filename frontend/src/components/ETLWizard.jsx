import { useState, useRef, useEffect } from 'react'
import { createETLStream, getEDASummary } from '../api'

const PIPELINE_STEPS = [
  { id: 1, name: 'Extract',             icon: '📥', color: '#3b82f6', desc: 'Azure Cloud Storage → Raw transactions' },
  { id: 2, name: 'Filter',              icon: '🧹', color: '#8b5cf6', desc: 'Buang 78.3% transaksi normal' },
  { id: 3, name: 'Feature Engineering', icon: '⚙️', color: '#f97316', desc: '16 behavioral features dihitung' },
  { id: 4, name: 'Anomaly Scoring',     icon: '🌲', color: '#eab308', desc: 'Isolation Forest — deteksi anomali' },
  { id: 5, name: 'Risk Classification', icon: '🤖', color: '#ef4444', desc: 'XGBoost — Low/Medium/High/Critical' },
  { id: 6, name: 'Explainability',      icon: '💡', color: '#0078d4', desc: 'Azure GPT-4o — narasi risiko' },
  { id: 7, name: 'Load',               icon: '📤', color: '#10b981', desc: 'Simpan ke dashboard JudolGuard' },
]

const STATS = [
  { label: 'Raw Records', value: '2,847,392', icon: '📦', color: '#3b82f6' },
  { label: 'Diproses',    value: '621,847',   icon: '⚡', color: '#f97316' },
  { label: 'Akun Berisiko', value: '620',     icon: '🚨', color: '#ef4444' },
]

function FlowParticle({ active }) {
  if (!active) return null
  return (
    <div style={{
      position: 'absolute', top: '50%', left: 0,
      width: '100%', height: 2,
      background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
      animation: 'flow-particle 1.2s linear infinite',
      transform: 'translateY(-50%)',
    }} />
  )
}

function StepNode({ step, state }) {
  // state: 'waiting' | 'active' | 'done'
  const isDone   = state === 'done'
  const isActive = state === 'active'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      position: 'relative', flex: 1,
    }}>
      {/* Circle */}
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.3rem',
        background: isDone
          ? `linear-gradient(135deg, ${step.color}cc, ${step.color}88)`
          : isActive
          ? `radial-gradient(circle, ${step.color}22, ${step.color}11)`
          : 'var(--bg-surface)',
        border: `2px solid ${isDone ? step.color : isActive ? step.color + '88' : 'var(--border)'}`,
        boxShadow: isDone
          ? `0 0 20px ${step.color}55, 0 0 40px ${step.color}22`
          : isActive
          ? `0 0 14px ${step.color}44`
          : 'none',
        transition: 'all 0.5s ease',
        position: 'relative',
        zIndex: 2,
      }}>
        {isDone ? '✓' : step.icon}
        {/* Pulse ring when active */}
        {isActive && (
          <div style={{
            position: 'absolute', inset: -6,
            borderRadius: '50%',
            border: `2px solid ${step.color}`,
            animation: 'pulse-ring 1.2s ease-out infinite',
          }} />
        )}
      </div>

      {/* Label */}
      <div style={{
        fontSize: '0.65rem', fontWeight: isDone || isActive ? 700 : 400,
        color: isDone ? step.color : isActive ? step.color + 'cc' : 'var(--text-muted)',
        textAlign: 'center', lineHeight: 1.3, maxWidth: 70,
        transition: 'color 0.4s ease',
      }}>
        {step.name}
      </div>
    </div>
  )
}

function ConnectorLine({ active, done }) {
  return (
    <div style={{
      flex: 0.5, height: 2, position: 'relative', marginTop: -20,
      background: done ? 'linear-gradient(90deg, #3b82f6, #8b5cf6)' : 'var(--border)',
      transition: 'background 0.6s ease',
      overflow: 'hidden',
    }}>
      {active && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.8), transparent)',
          animation: 'flow-particle 1s linear infinite',
        }} />
      )}
    </div>
  )
}

export default function ETLWizard() {
  const [phase,    setPhase]    = useState('idle')   // idle | running | done
  const [logs,     setLogs]     = useState([])
  const [progress, setProgress] = useState(0)
  const [activeStep, setActiveStep] = useState(-1)
  const [doneSteps, setDoneSteps]   = useState([])
  const [stats,    setStats]    = useState(null)
  const logRef    = useRef(null)
  const sourceRef = useRef(null)

  useEffect(() => {
    getEDASummary()
      .then(d => setStats({
        total_accounts:    d.total_accounts,
        total_transactions: d.total_transactions,
        at_risk_pct:       d.label_distribution?.at_risk_pct,
      }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  // Map progress → active step
  useEffect(() => {
    const stepIdx = Math.floor((progress / 100) * PIPELINE_STEPS.length)
    const clampedIdx = Math.min(stepIdx, PIPELINE_STEPS.length - 1)
    setActiveStep(phase === 'running' ? clampedIdx : -1)
    if (phase === 'running') {
      setDoneSteps(PIPELINE_STEPS.slice(0, clampedIdx).map(s => s.id))
    }
  }, [progress, phase])

  const startETL = () => {
    if (sourceRef.current) sourceRef.current.close()
    setPhase('running')
    setLogs([])
    setProgress(0)
    setActiveStep(0)
    setDoneSteps([])

    const TOTAL_STEPS = 15
    let step = 0
    const es = new EventSource('/api/etl-simulate')
    sourceRef.current = es

    es.onmessage = (e) => {
      const { log, done } = JSON.parse(e.data)
      step++
      const pct = Math.min(Math.round((step / TOTAL_STEPS) * 100), 100)
      setProgress(pct)
      setLogs(prev => [...prev, { text: log, done }])
      if (done) {
        es.close()
        setPhase('done')
        setProgress(100)
        setActiveStep(-1)
        setDoneSteps(PIPELINE_STEPS.map(s => s.id))
      }
    }

    es.onerror = () => {
      es.close()
      setLogs(prev => [...prev, { text: '[ERR] Koneksi SSE terputus. Pastikan FastAPI running di port 8000.', done: false, isError: true }])
      setPhase('idle')
      setActiveStep(-1)
    }
  }

  const reset = () => {
    if (sourceRef.current) sourceRef.current.close()
    setPhase('idle')
    setLogs([])
    setProgress(0)
    setActiveStep(-1)
    setDoneSteps([])
  }

  return (
    <div className="fade-in">
      <style>{`
        @keyframes flow-particle {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes data-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes scan-line {
          0%   { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>

      <div className="page-header">
        <h2>🔄 Adaptive ETL Pipeline</h2>
        <p>Simulasi ingest data transaksi skala enterprise — real-time dari Azure Cloud Storage ke JudolGuard</p>
      </div>

      {/* ── Stats Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {STATS.map(s => (
          <div key={s.label} className="card" style={{
            flex: 1, padding: '14px 18px',
            borderColor: phase === 'running' ? s.color + '33' : '',
            transition: 'border-color 0.4s ease',
          }}>
            <div style={{ fontSize: '1.4rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, marginTop: 4 }}>
              {phase === 'running'
                ? <span style={{ animation: 'data-pulse 1.5s ease infinite' }}>{s.value}</span>
                : s.value}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Visual Pipeline Flow ───────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16, padding: '24px 20px' }}>
        <div className="card-title" style={{ marginBottom: 20 }}>
          Pipeline Architecture
          {phase === 'running' && (
            <span style={{
              marginLeft: 10, fontSize: '0.65rem', color: '#22c55e',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              padding: '2px 8px', borderRadius: 20,
              animation: 'data-pulse 1.5s ease infinite',
            }}>● LIVE</span>
          )}
          {phase === 'done' && (
            <span style={{
              marginLeft: 10, fontSize: '0.65rem', color: '#10b981',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              padding: '2px 8px', borderRadius: 20,
            }}>✓ COMPLETE</span>
          )}
        </div>

        {/* Horizontal flow nodes */}
        <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 8 }}>
          {PIPELINE_STEPS.map((step, idx) => {
            const isDone   = doneSteps.includes(step.id)
            const isActive = activeStep === idx
            const state    = isDone ? 'done' : isActive ? 'active' : 'waiting'
            const showConnector = idx < PIPELINE_STEPS.length - 1
            return (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <StepNode step={step} state={state} />
                {showConnector && (
                  <ConnectorLine
                    active={isActive}
                    done={doneSteps.includes(PIPELINE_STEPS[idx + 1]?.id) || isDone}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Active step detail */}
        {activeStep >= 0 && phase === 'running' && (
          <div style={{
            marginTop: 16, padding: '10px 16px',
            background: `${PIPELINE_STEPS[activeStep]?.color}11`,
            border: `1px solid ${PIPELINE_STEPS[activeStep]?.color}33`,
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', gap: 12,
            animation: 'fadeIn 0.3s ease',
          }}>
            <span style={{ fontSize: '1.2rem' }}>{PIPELINE_STEPS[activeStep]?.icon}</span>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: PIPELINE_STEPS[activeStep]?.color }}>
                {PIPELINE_STEPS[activeStep]?.name}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {PIPELINE_STEPS[activeStep]?.desc}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
              {[0,1,2].map(i => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: PIPELINE_STEPS[activeStep]?.color,
                  animation: `data-pulse 1s ${i * 0.2}s ease infinite`,
                  display: 'inline-block',
                }} />
              ))}
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div style={{
            marginTop: 16, padding: '10px 16px',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'fadeIn 0.3s ease',
          }}>
            <span style={{ fontSize: '1.2rem' }}>✅</span>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#10b981' }}>
              ETL selesai — 620 akun berisiko teridentifikasi dan siap dianalisis di dashboard
            </div>
          </div>
        )}
      </div>

      {/* ── Controls + Terminal ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="card-title">Kontrol Pipeline</div>

            {/* Progress ring */}
            {phase !== 'idle' && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ position: 'relative', width: 90, height: 90 }}>
                  <svg width="90" height="90" viewBox="0 0 90 90">
                    <circle cx="45" cy="45" r="38" fill="none" stroke="var(--bg-hover)" strokeWidth="6" />
                    <circle
                      cx="45" cy="45" r="38" fill="none"
                      stroke={phase === 'done' ? '#10b981' : '#3b82f6'}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 38}`}
                      strokeDashoffset={`${2 * Math.PI * 38 * (1 - progress / 100)}`}
                      transform="rotate(-90 45 45)"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{
                      fontSize: '1.2rem', fontWeight: 800,
                      color: phase === 'done' ? '#10b981' : '#3b82f6',
                    }}>{progress}%</span>
                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>
                      {phase === 'done' ? 'DONE' : 'LOADING'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {phase === 'idle' && (
              <button
                className="btn btn-primary"
                onClick={startETL}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.82rem' }}
              >
                🚀 Jalankan ETL Pipeline
              </button>
            )}
            {phase === 'running' && (
              <button
                className="btn btn-ghost"
                onClick={reset}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                ⏹ Hentikan
              </button>
            )}
            {phase === 'done' && (
              <button
                className="btn btn-ghost"
                onClick={reset}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                🔄 Jalankan Ulang
              </button>
            )}
          </div>

          {/* Steps checklist */}
          <div className="card" style={{ padding: 16, flex: 1 }}>
            <div className="card-title">Step Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PIPELINE_STEPS.map((step, idx) => {
                const isDone   = doneSteps.includes(step.id)
                const isActive = activeStep === idx
                return (
                  <div key={step.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px', borderRadius: 6,
                    background: isDone ? `${step.color}10` : isActive ? `${step.color}08` : 'transparent',
                    border: `1px solid ${isDone ? step.color + '30' : isActive ? step.color + '20' : 'transparent'}`,
                    transition: 'all 0.3s ease',
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 700,
                      background: isDone ? step.color : isActive ? `${step.color}33` : 'var(--bg-hover)',
                      color: isDone ? '#fff' : isActive ? step.color : 'var(--text-muted)',
                      transition: 'all 0.3s ease',
                    }}>
                      {isDone ? '✓' : step.id}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      color: isDone ? step.color : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: isDone || isActive ? 600 : 400,
                    }}>
                      {step.name}
                    </span>
                    {isActive && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: step.color,
                        animation: 'data-pulse 1s ease infinite' }}>●</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Terminal log */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="card-title" style={{ margin: 0 }}>
              Output Log
              {phase === 'running' && (
                <span style={{
                  marginLeft: 8, fontSize: '0.6rem', color: '#22c55e',
                  animation: 'data-pulse 1.2s ease infinite',
                }}>● STREAMING</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            </div>
          </div>

          <div className="terminal" ref={logRef} style={{ height: 320, maxHeight: 320 }}>
            <div style={{ color: '#4b5563', marginBottom: 4 }}>
              $ JudolGuard ETL Pipeline v1.0 — Azure Cloud Edition
            </div>
            {logs.length === 0 && phase === 'idle' && (
              <span style={{ color: '#4b5563' }}>$ Menunggu perintah start pipeline...<span className="log-cursor" /></span>
            )}
            {logs.map((log, i) => (
              <div
                key={i}
                className={`log-line${log.done ? ' log-done' : ''}`}
                style={{
                  color: log.isError ? 'var(--critical)' : log.done ? '#4ade80' : '#a3e635',
                  animation: 'fadeIn 0.2s ease both',
                }}
              >
                {log.done
                  ? `✓ ${log.text}`
                  : `$ ${log.text}`
                }
              </div>
            ))}
            {phase === 'running' && <span className="log-cursor" />}
          </div>

          {/* Progress bar under terminal */}
          {phase !== 'idle' && (
            <div style={{ marginTop: 10 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4,
              }}>
                <span>Pipeline Progress</span>
                <span className="mono">{progress}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: phase === 'done'
                    ? 'linear-gradient(90deg, #10b981, #22c55e)'
                    : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                  boxShadow: phase === 'done' ? '0 0 10px rgba(16,185,129,0.5)' : '0 0 10px rgba(59,130,246,0.5)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {phase === 'running' && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      animation: 'flow-particle 1.2s linear infinite',
                    }} />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Info Cards ─────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">💡 Kenapa Adaptive ETL?</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { icon: '🎯', color: '#3b82f6', title: 'Resource Efficient', desc: '78% transaksi normal dibuang di tahap Filter. Hanya anomali yang masuk model.' },
            { icon: '⚡', color: '#f97316', title: 'Real-Time Ready',    desc: 'Pipeline dirancang untuk streaming — transaksi baru dianalisis dalam hitungan detik.' },
            { icon: '🔒', color: '#10b981', title: 'PPATK-Aligned',      desc: 'Filter threshold mengikuti indikator STR PPATK: nominal kecil + frekuensi tinggi + jam malam.' },
          ].map(f => (
            <div key={f.title} style={{
              background: `${f.color}08`, border: `1px solid ${f.color}22`,
              borderRadius: 'var(--radius-md)', padding: '16px',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: f.color, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
