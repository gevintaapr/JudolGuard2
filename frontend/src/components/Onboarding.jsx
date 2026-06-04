import { useState, useEffect, useRef, useCallback } from 'react'
import './Onboarding.css'

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
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        a: Math.random() * 0.6 + 0.2,
        color: Math.random() > 0.5 ? '0,212,255' : '139,92,246',
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
      // draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 100) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(0,212,255,${0.08 * (1 - d / 100)})`
            ctx.lineWidth = 0.5
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

/* ── Phase 1: Landing ────────────────────────────────────────── */
function LandingPhase({ onConnect, onDashboard }) {
  const [uptime] = useState('99.98%')
  const [streams] = useState(847)

  return (
    <div className="ob-landing fade-in">
      {/* Header */}
      <div className="ob-header">
        <div className="ob-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 2L4 7v8c0 5.5 4.3 10.7 10 12 5.7-1.3 10-6.5 10-12V7L14 2z"
              stroke="#00d4ff" strokeWidth="2" fill="rgba(0,212,255,0.1)" />
          </svg>
          <span>JudolGuard</span>
        </div>
      </div>

      {/* Hero */}
      <div className="ob-hero">
        <h1 className="ob-hero-title">
          Enterprise Transaction<br />
          <span className="ob-gradient-text">Intelligence System</span>
        </h1>
        <p className="ob-hero-sub">Real-time AI Fraud Detection for Digital Transactions</p>
      </div>

      {/* Status cards */}
      <div className="ob-status-grid">
        {[
          { label: 'System Uptime', icon: '⚡', value: uptime, sub: '● Operational', subColor: '#22c55e' },
          { label: 'Active Streams', icon: '↗', value: streams.toLocaleString(), sub: 'Data sources connected', subColor: '#00d4ff' },
          { label: 'AI Model Status', icon: '⚡', value: 'Active', sub: '● Neural Net v4.2', subColor: '#a78bfa' },
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

      {/* Action cards */}
      <div className="ob-action-grid">
        <div className="ob-action-card">
          <div className="ob-action-icon">☁️</div>
          <h3>Connect Cloud Data Source</h3>
          <p>Integrate your enterprise data streams through secure encrypted pipeline connections</p>
          <button className="ob-btn-cyan" onClick={onConnect}>
            Initialize Connection →
          </button>
        </div>
        <div className="ob-action-card">
          <div className="ob-action-icon">🗄️</div>
          <h3>System Overview</h3>
          <p>Access real-time analytics dashboard with AI-powered threat detection and monitoring</p>
          <button className="ob-btn-blue" onClick={onDashboard}>
            Enter Dashboard →
          </button>
        </div>
      </div>

      <div className="ob-footer-text">
        Secured Enterprise Platform • ISO 27001 Certified • SOC 2 Type II Compliant
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
      <button className="ob-back" onClick={onBack}>← Back to Dashboard</button>

      <div className="ob-connect-card">
        <div className="ob-connect-icon">☁️</div>
        <h2 className="ob-connect-title">Connect Azure Blob Storage</h2>
        <p className="ob-connect-sub">Establish secure encrypted pipeline to Microsoft Azure</p>

        <div className="ob-form">
          <div className="ob-field">
            <label>Enterprise Name</label>
            <input
              type="text"
              placeholder="e.g. GoPay, BRI, OVO..."
              value={form.enterprise}
              onChange={e => set('enterprise', e.target.value)}
            />
          </div>
          <div className="ob-field">
            <label>Container Name</label>
            <input
              type="text"
              placeholder="my-enterprise-container"
              value={form.container}
              onChange={e => set('container', e.target.value)}
            />
          </div>
          <div className="ob-field">
            <label>🔒 Access Key / Secret</label>
            <div className="ob-input-wrap">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="••••••••••••••••••••••••••••••"
                value={form.accessKey}
                onChange={e => set('accessKey', e.target.value)}
              />
              <button className="ob-eye" onClick={() => setShowKey(s => !s)}>
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="ob-encrypt-box">
            <span>🔒</span>
            <div>
              <div className="ob-encrypt-title">End-to-end Encryption</div>
              <div className="ob-encrypt-desc">All credentials are encrypted using AES-256 and stored in secure vault. Connection uses TLS 1.3 protocol.</div>
            </div>
          </div>

          <button
            className={`ob-btn-init${canSubmit ? '' : ' disabled'}`}
            onClick={() => canSubmit && onInitialize(form)}
            disabled={!canSubmit}
          >
            🔒 Initialize Secure Pipeline
          </button>
        </div>

        <div className="ob-secure-footer">🔒 Your connection is secured with military-grade encryption</div>
      </div>
    </div>
  )
}

/* ── Phase 3: Initializing ───────────────────────────────────── */
const INIT_STEPS = [
  '[01] Establishing encrypted TLS 1.3 connection...',
  '[02] Authenticating Azure credentials...',
  '[03] Extracting encrypted transaction streams...',
  '[04] Validating 650,000+ records...',
  '[05] Filtering normal transactions (±80%)...',
  '[06] Extracting behavioral risk features...',
  '[07] Running Isolation Forest anomaly detection...',
  '[08] Running XGBoost classification...',
  '[09] Calculating risk scores...',
  '[10] Generating Azure OpenAI explanations...',
  '[11] Building smurfing network graph...',
  '[12] Pipeline ready ✓',
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
    if (pct === 100) {
      setTimeout(onDone, 1200)
    }
  }, [pct, onDone])

  return (
    <div className="ob-init fade-in">
      {/* Concentric circles gauge */}
      <div className="ob-gauge-wrap">
        <div className="ob-ring ob-ring-1" />
        <div className="ob-ring ob-ring-2" />
        <div className="ob-ring ob-ring-3" />
        <div className="ob-gauge-center">
          <span className="ob-gauge-pct">{pct}%</span>
        </div>
      </div>

      <h2 className="ob-init-title">Initializing AI Systems</h2>
      <div className="ob-init-step">
        {logs.length > 0 && (
          <span>● {logs[logs.length - 1].replace(/\[\d+\] /, '')}</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="ob-progress-track">
        <div className="ob-progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Terminal log */}
      <div className="ob-init-terminal" ref={logRef}>
        {logs.map((l, i) => (
          <div key={i} className={`ob-log-line${i === logs.length - 1 ? ' ob-log-active' : ' ob-log-done'}`}>
            {l} {i < logs.length - 1 ? <span style={{ color: '#22c55e' }}>✓</span> : <span className="ob-cursor" />}
          </div>
        ))}
      </div>

      <div className="ob-init-footer">
        Processing enterprise-grade security protocols for {enterprise}...
      </div>
    </div>
  )
}

/* ── Root Onboarding ─────────────────────────────────────────── */
export default function Onboarding({ onEnterDashboard }) {
  const [phase, setPhase] = useState('landing') // landing | connect | init
  const [enterprise, setEnterprise] = useState('')

  const handleInitialize = useCallback((form) => {
    setEnterprise(form.enterprise)
    setPhase('init')
  }, [])

  return (
    <div className="ob-root">
      <ParticleCanvas />
      {phase === 'landing' && (
        <LandingPhase
          onConnect={() => setPhase('connect')}
          onDashboard={onEnterDashboard}
        />
      )}
      {phase === 'connect' && (
        <ConnectPhase
          onBack={() => setPhase('landing')}
          onInitialize={handleInitialize}
        />
      )}
      {phase === 'init' && (
        <InitializingPhase
          enterprise={enterprise}
          onDone={onEnterDashboard}
        />
      )}
    </div>
  )
}
