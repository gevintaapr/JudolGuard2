import { useState, useEffect, useRef, useCallback } from 'react'
import './Onboarding.css'

const SESSION_KEY = 'judolguard_session'

/* ── Particle Canvas ─────────────────────────────────────────── */
function ParticleCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let raf, particles = []
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.3,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        a: Math.random() * 0.55 + 0.15,
        color: ['0,212,255', '139,92,246', '59,130,246'][Math.floor(Math.random() * 3)],
      })
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color},${p.a})`
        ctx.fill()
      })
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 110) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(0,212,255,${0.07 * (1 - d / 110)})`
            ctx.lineWidth = 0.4
            ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className="ob-canvas" />
}

/* ── SVG Icons ───────────────────────────────────────────────── */
const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeClosed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

/* ── Phase 1: Landing ────────────────────────────────────────── */
function LandingPhase({ onConnect, onDashboard, savedSession }) {
  return (
    <div className="ob-landing fade-in">
      <div className="ob-header">
        <div className="ob-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 2L4 7v8c0 5.5 4.3 10.7 10 12 5.7-1.3 10-6.5 10-12V7L14 2z"
              stroke="#00d4ff" strokeWidth="2" fill="rgba(0,212,255,0.1)" />
          </svg>
          <span>JudolGuard</span>
        </div>
      </div>

      <div className="ob-hero">
        <h1 className="ob-hero-title">
          Enterprise Transaction<br />
          <span className="ob-gradient-text">Intelligence System</span>
        </h1>
        <p className="ob-hero-sub">AI-powered transaction risk detection platform for digital finance</p>
      </div>

      <div className="ob-status-grid">
        {[
          { label: 'System Uptime', icon: '●', value: '99.98%', sub: '● Operational', subColor: '#22c55e' },
          { label: 'Data Sources',  icon: '↗', value: '847',    sub: 'Connected sources', subColor: '#00d4ff' },
          { label: 'AI Model',      icon: '●', value: 'Active', sub: '● Neural Net v4.2', subColor: '#a78bfa' },
        ].map(s => (
          <div className="ob-status-card" key={s.label}>
            <div className="ob-status-top">
              <span className="ob-status-label">{s.label}</span>
              <span className="ob-status-icon">{s.icon}</span>
            </div>
            <div className="ob-status-value">{s.value}</div>
            <div className="ob-status-sub" style={{ color: s.subColor }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="ob-action-grid" style={{ justifyContent: 'center' }}>
        <div className="ob-action-card">
          <div className="ob-action-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.5"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
          </div>
          <h3>Connect Data Source</h3>
          <p>Set up your enterprise connection to start analyzing transaction data with AI</p>
          <button className="ob-btn-cyan" onClick={() => {
            try { localStorage.removeItem('judolguard_session') } catch {}
            onConnect()
          }}>Start Connection →</button>
        </div>

        {/* Kalau sudah punya session — tampilkan opsi balik ke dashboard */}
        {savedSession && (
          <div className="ob-action-card" style={{ borderColor: 'rgba(0,212,255,0.3)' }}>
            <div className="ob-action-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            </div>
            <h3 style={{ color: '#22c55e' }}>Back to Dashboard</h3>
            <p>Session <strong style={{ color: '#00d4ff' }}>{savedSession.enterprise}</strong> masih aktif — lanjutkan tanpa connect ulang</p>
            <button className="ob-btn-blue" onClick={() => onDashboard(savedSession.enterprise)}>Masuk Dashboard →</button>
          </div>
        )}
      </div>


      <div className="ob-footer-text">
        Enterprise Encrypted Platform · ISO 27001 · SOC 2 Type II
      </div>
    </div>
  )
}


/* ── Phase 2: Connect Form ───────────────────────────────────── */
function ConnectPhase({ onBack, onInitialize }) {
  const [form, setForm] = useState({ enterprise: '', container: '', accessKey: '' })
  const [showKey, setShowKey] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const canSubmit = form.enterprise && form.container && form.accessKey

  return (
    <div className="ob-connect fade-in">
      <button className="ob-back" onClick={onBack}>← Back</button>
      <div className="ob-connect-card">
        <div className="ob-connect-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.5"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
        </div>
        <h2 className="ob-connect-title">Connect Azure Blob Storage</h2>
        <p className="ob-connect-sub">Establish an encrypted connection to Microsoft Azure</p>

        <div className="ob-form" autoComplete="off">
          <div className="ob-field">
            <label>Enterprise Name</label>
            <input
              type="text"
              autoComplete="off"
              name="judolguard-enterprise"
              placeholder="e.g. GoPay, BRI, OVO..."
              value={form.enterprise}
              onChange={e => set('enterprise', e.target.value)}
            />
          </div>
          <div className="ob-field">
            <label>Container Name</label>
            <input
              type="text"
              autoComplete="off"
              name="judolguard-container"
              placeholder="my-enterprise-container"
              value={form.container}
              onChange={e => set('container', e.target.value)}
            />
          </div>
          <div className="ob-field">
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><LockIcon /> Access Key / Secret</label>
            <div className="ob-input-wrap">
              <input
                type={showKey ? 'text' : 'password'}
                autoComplete="new-password"
                name="judolguard-key"
                placeholder="••••••••••••••••••••••••••••••"
                value={form.accessKey}
                onChange={e => set('accessKey', e.target.value)}
              />
              <button className="ob-eye" onClick={() => setShowKey(s => !s)}>
                {showKey ? <EyeClosed /> : <EyeOpen />}
              </button>
            </div>
          </div>

          <div className="ob-encrypt-box">
            <span><LockIcon /></span>
            <div>
              <div className="ob-encrypt-title">End-to-End Encryption</div>
              <div className="ob-encrypt-desc">All credentials are encrypted using AES-256 and stored in a secure vault. Connection uses TLS 1.3 protocol.</div>
            </div>
          </div>

          <button className={`ob-btn-init${canSubmit ? '' : ' disabled'}`} onClick={() => canSubmit && onInitialize(form)} disabled={!canSubmit}>
            Start Secure Connection
          </button>
        </div>

        <div className="ob-secure-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <LockIcon /> Your connection is protected with high-level encryption
        </div>
      </div>
    </div>
  )
}

/* ── Phase 3: Initializing ───────────────────────────────────── */
const INIT_STEPS = [
  '[01] Connecting to Azure Blob Storage...',
  '[02] Verifying access credentials...',
  '[03] Downloading transaction data from container...',
  '[04] Validating data format and integrity...',
  '[05] Loading AI model into memory...',
  '[06] Initializing risk analysis module...',
  '[07] Establishing Azure OpenAI connection...',
  '[08] Loading dashboard configuration...',
  '[09] System ready ✓',
]

function InitializingPhase({ enterprise, onDone }) {
  const [pct, setPct] = useState(0)
  const [logs, setLogs] = useState([])
  const [step, setStep] = useState(0)
  const logRef = useRef(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => {
        if (s >= INIT_STEPS.length) { clearInterval(interval); return s }
        setLogs(l => [...l, INIT_STEPS[s]])
        setPct(Math.min(Math.round(((s + 1) / INIT_STEPS.length) * 100), 100))
        return s + 1
      })
    }, 600)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  useEffect(() => {
    if (pct === 100) { setTimeout(onDone, 1200) }
  }, [pct, onDone])

  return (
    <div className="ob-init fade-in">
      <div className="ob-gauge-wrap">
        <div className="ob-ring ob-ring-1" />
        <div className="ob-ring ob-ring-2" />
        <div className="ob-ring ob-ring-3" />
        <div className="ob-gauge-center">
          <span className="ob-gauge-pct">{pct}%</span>
        </div>
      </div>

      <h2 className="ob-init-title">Initializing System</h2>
      <div className="ob-init-step">
        {logs.length > 0 && (<span>● {logs[logs.length - 1].replace(/\[\d+\] /, '')}</span>)}
      </div>

      <div className="ob-progress-track">
        <div className="ob-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="ob-init-terminal" ref={logRef}>
        {logs.map((l, i) => (
          <div key={i} className={`ob-log-line${i === logs.length - 1 ? ' ob-log-active' : ' ob-log-done'}`}>
            {l} {i < logs.length - 1 ? <span style={{ color: '#22c55e' }}>✓</span> : <span className="ob-cursor" />}
          </div>
        ))}
      </div>

      <div className="ob-init-footer">
        Setting up security protocols for <strong style={{ color: '#00d4ff' }}>{enterprise}</strong>...
      </div>
    </div>
  )
}

/* ── Root Onboarding ─────────────────────────────────────────── */
export default function Onboarding({ onEnterDashboard }) {
  const [phase, setPhase] = useState('landing')
  const [enterprise, setEnterprise] = useState('')

  // Load saved session for the resume box
  const savedSession = (() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
  })()

  const handleInitialize = useCallback((form) => {
    setEnterprise(form.enterprise)
    setPhase('init')
  }, [])

  const handleDone = useCallback(() => {
    onEnterDashboard(enterprise)
  }, [enterprise, onEnterDashboard])

  return (
    <div className="ob-root">
      <ParticleCanvas />
      {phase === 'landing' && (
        <LandingPhase
          onConnect={() => setPhase('connect')}
          onDashboard={(name) => onEnterDashboard(name)}
          savedSession={savedSession}
        />
      )}
      {phase === 'connect' && (
        <ConnectPhase onBack={() => setPhase('landing')} onInitialize={handleInitialize} />
      )}
      {phase === 'init' && (
        <InitializingPhase enterprise={enterprise} onDone={handleDone} />
      )}
    </div>
  )
}
