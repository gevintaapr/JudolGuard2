import { useState, useEffect } from 'react'
import { healthCheck } from './api'
import Onboarding         from './components/Onboarding'
import Overview           from './components/Overview'
import ETLWizard          from './components/ETLWizard'
import RiskTable          from './components/RiskTable'
import AccountDetail      from './components/AccountDetail'
import ParameterConfig    from './components/ParameterConfig'
import NetworkGraph       from './components/NetworkGraph'
import SimulateTransaction from './components/SimulateTransaction'
import AICopilot          from './components/AICopilot'
import EDAPanel           from './components/EDAPanel'
import ModelMetrics       from './components/ModelMetrics'
import AzureProof         from './components/AzureProof'
import StrategicInsights  from './components/StrategicInsights'
import ChatbotPanel       from './components/ChatbotPanel'

const SESSION_KEY = 'judolguard_session'

// NAV tanpa "Detail Akun" — detail ditampilkan inline saat klik baris tabel
const NAV = [
  {
    section: 'Dashboard',
    items: [
      { id: 'overview',  label: 'Overview',       icon: '◈' },
      { id: 'etl',       label: 'ETL Pipeline',   icon: '⟳' },
    ]
  },
  {
    section: 'Account Analysis',
    items: [
      { id: 'risk-table', label: 'Risk Table',     icon: '⊞' },
      { id: 'network',    label: 'Network Graph',  icon: '⬡' },
    ]
  },
  {
    section: 'Configuration',
    items: [
      { id: 'params',    label: 'Parameters',       icon: '⚙' },
      { id: 'copilot',   label: 'AI Assistant',     icon: '✶' },
    ]
  },
  {
    section: 'Platform',
    items: [
      { id: 'azure',     label: 'Azure Services',    icon: '☁' },
      { id: 'insights',  label: 'Strategic Insights', icon: '◆' },
    ]
  }
]

// Robot SVG icon for floating chat button
const BotIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="18" height="13" rx="2"/>
    <path d="M8 8V5a4 4 0 0 1 8 0v3"/>
    <circle cx="9" cy="14" r="1" fill="currentColor"/>
    <circle cx="15" cy="14" r="1" fill="currentColor"/>
    <path d="M9 17.5c.83.5 1.5.75 3 .75s2.17-.25 3-.75"/>
    <line x1="12" y1="2" x2="12" y2="4"/>
  </svg>
)

export default function App() {
  // ── Session persistence ──────────────────────────────────
  const loadSession = () => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null } catch { return null }
  }
  const saveSession = (s) => {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch {}
  }

  // Jika URL mengandung ?reset=1 → hapus session dan bersihkan URL
  const isReset = new URLSearchParams(window.location.search).get('reset') === '1'
  if (isReset) {
    try { localStorage.removeItem(SESSION_KEY) } catch {}
    window.history.replaceState({}, '', '/')
  }

  const savedSession = isReset ? null : loadSession()

  const [showDashboard, setShowDashboard] = useState(!!savedSession)
  const [enterpriseName, setEnterpriseName] = useState(savedSession?.enterprise || '')
  const [activePage, setActivePage]   = useState('overview')
  const [apiStatus, setApiStatus]     = useState('connecting')
  const [apiInfo,   setApiInfo]       = useState(null)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [chatOpen, setChatOpen]       = useState(false)
  // Hasil recalculate dari ParameterConfig — dishare ke semua halaman
  const [adjustedData, setAdjustedData] = useState(null)
  // Data dari Network Graph — dishare ke chatbot
  const [networkData, setNetworkData] = useState(null)

  useEffect(() => {
    healthCheck()
      .then(data => { setApiStatus('ok'); setApiInfo(data) })
      .catch(() => setApiStatus('error'))
  }, [])

  const handleEnterDashboard = (enterprise) => {
    const session = { enterprise: enterprise || 'Enterprise', ts: Date.now() }
    saveSession(session)
    setEnterpriseName(enterprise || 'Enterprise')
    setShowDashboard(true)
  }

  // Navigasi ke halaman utama — sesi TETAP tersimpan, bukan sign out
  const handleGoHome = () => {
    setShowDashboard(false)
    setActivePage('overview')
    setSelectedAccount(null)
  }

  const navigateTo = (page, accountId) => {
    setActivePage(page)
    if (accountId) setSelectedAccount(accountId)
  }

  const renderPage = () => {
    if (activePage === 'detail' && !selectedAccount) {
      return (
        <RiskTable
          adjustedData={adjustedData}
          onSelectAccount={(id) => { setSelectedAccount(id); setActivePage('detail') }}
        />
      )
    }

    switch (activePage) {
      case 'overview':   return <Overview adjustedData={adjustedData} onSelectAccount={navigateTo} />
      case 'etl':        return <ETLWizard />
      case 'risk-table': return (
        <RiskTable
          adjustedData={adjustedData}
          onSelectAccount={(id) => { setSelectedAccount(id); setActivePage('detail') }}
        />
      )
      case 'detail': return (
        <AccountDetail
          accountId={selectedAccount}
          adjustedData={adjustedData}
          onBack={() => setActivePage('risk-table')}
        />
      )
      case 'network':  return <NetworkGraph onGraphLoaded={setNetworkData} />
      case 'params':   return <ParameterConfig onAdjust={setAdjustedData} adjustedData={adjustedData} />
      case 'copilot':  return <AICopilot />
      case 'eda':      return <EDAPanel />
      case 'model':    return <ModelMetrics />
      case 'azure':    return <AzureProof />
      case 'insights': return <StrategicInsights />
      default:         return null
    }
  }

  if (!showDashboard) {
    return <Onboarding onEnterDashboard={handleEnterDashboard} />
  }

  const activeNav = activePage === 'detail' ? 'risk-table' : activePage

  return (
    <div className="app-shell">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>JudolGuard</h1>
          <p>AI Compliance Intelligence</p>
        </div>

        {/* Enterprise connected badge */}
        {enterpriseName && (
          <div style={{
            padding: '8px 14px 6px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Connected</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-from)', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
                {enterpriseName}
              </span>
              <button
                onClick={handleGoHome}
                title="Back to Home"
                style={{
                  fontSize: '0.58rem', color: 'var(--text-muted)', background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#00d4ff'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                ⌂ Home
              </button>
            </div>
          </div>
        )}

        <div className="sidebar-status">
          <span
            className="status-dot"
            style={{
              background: apiStatus === 'ok'    ? 'var(--low)'
                        : apiStatus === 'error' ? 'var(--critical)'
                        : 'var(--medium)',
              boxShadow: apiStatus === 'ok'    ? '0 0 6px var(--low)'
                       : apiStatus === 'error' ? '0 0 6px var(--critical)'
                       : '0 0 6px var(--medium)',
            }}
          />
          {apiStatus === 'ok'
            ? `API Online · ${apiInfo?.accounts ?? 0} accounts`
            : apiStatus === 'error'
            ? 'API Offline'
            : 'Connecting...'}
        </div>

        {/* Navigation */}
        {NAV.map(group => (
          <div className="sidebar-section" key={group.section}>
            <div className="sidebar-section-label">{group.section}</div>
            {group.items.map(item => (
              <button
                key={item.id}
                className={`nav-item${activeNav === item.id ? ' active' : ''}`}
                onClick={() => { setActivePage(item.id); setSelectedAccount(null) }}
              >
                <span className="nav-icon" style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <div>Azure AI Impact Challenge 2026</div>
            <div style={{ color: 'var(--brand-from)', fontWeight: 600 }}>JudolGuard v1.0</div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main
        className="main-content"
        key={activePage}
        style={{ marginRight: chatOpen ? 360 : 0, transition: 'margin-right 0.35s cubic-bezier(0.4,0,0.2,1)' }}
      >
        {renderPage()}
      </main>


      {/* Floating chatbot button — disembunyikan di halaman AI Assistant */}
      {activePage !== 'copilot' && (
        <button
          onClick={() => setChatOpen(prev => !prev)}
          title={chatOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
          style={{
            position: 'fixed',
            bottom: 28,
            right: chatOpen ? 372 : 24,
            zIndex: 200,
            width: 54,
            height: 54,
            borderRadius: '50%',
            border: 'none',
            background: chatOpen
              ? 'rgba(239,68,68,0.15)'
              : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: chatOpen ? 'var(--critical)' : '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: chatOpen ? '1.4rem' : '1rem',
            boxShadow: chatOpen
              ? '0 4px 20px rgba(239,68,68,0.3), 0 0 0 1px rgba(239,68,68,0.2)'
              : '0 4px 24px rgba(59,130,246,0.55), 0 0 0 1px rgba(59,130,246,0.3)',
            transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {chatOpen ? '×' : <BotIcon />}
        </button>
      )}

      {/* Chatbot panel — juga tidak tampil di halaman AI Assistant */}
      {activePage !== 'copilot' && (
        <ChatbotPanel
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          adjustedData={adjustedData}
          networkData={networkData}
        />
      )}

    </div>
  )
}
