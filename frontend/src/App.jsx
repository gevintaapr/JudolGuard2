import { useState, useEffect } from 'react'
import { healthCheck } from './api'
import Overview       from './components/Overview'
import ETLWizard      from './components/ETLWizard'
import RiskTable      from './components/RiskTable'
import AccountDetail  from './components/AccountDetail'
import ParameterConfig from './components/ParameterConfig'
import NetworkGraph   from './components/NetworkGraph'

// ── Lazy placeholder components (akan diganti tahap per tahap) ─
const Placeholder = ({ name }) => (
  <div className="fade-in" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🚧</div>
    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{name}</div>
    <div style={{ fontSize: '0.78rem', marginTop: '8px' }}>Komponen ini akan dibuat di tahap berikutnya</div>
  </div>
)

// ── Navigation config ─────────────────────────────────────────
const NAV = [
  {
    section: 'Dashboard',
    items: [
      { id: 'overview',    icon: '📊', label: 'Overview',        badge: null },
      { id: 'etl',         icon: '🔄', label: 'ETL Pipeline',    badge: null },
    ]
  },
  {
    section: 'Analisis Akun',
    items: [
      { id: 'risk-table',  icon: '📋', label: 'Risk Table',      badge: null },
      { id: 'detail',      icon: '🔍', label: 'Account Detail',  badge: null },
      { id: 'network',     icon: '🕸️', label: 'Network Graph',  badge: null },
    ]
  },
  {
    section: 'Konfigurasi',
    items: [
      { id: 'params',      icon: '⚙️', label: 'Parameter Engine', badge: null },
      { id: 'simulate',    icon: '⚡', label: 'Simulator',        badge: null },
      { id: 'copilot',     icon: '🤖', label: 'AI Co-Pilot',      badge: null },
    ]
  },
  {
    section: 'Panel Juri',
    items: [
      { id: 'eda',         icon: '📈', label: 'EDA & Metodologi', badge: null },
      { id: 'model',       icon: '🧠', label: 'Model Metrics',    badge: null },
      { id: 'azure',       icon: '☁️', label: 'Azure Proof',     badge: null },
      { id: 'insights',    icon: '💡', label: 'Strategic Insights',badge: null },
    ]
  }
]

export default function App() {
  const [activePage, setActivePage] = useState('overview')
  const [apiStatus, setApiStatus]   = useState('connecting') // 'ok' | 'error' | 'connecting'
  const [apiInfo,   setApiInfo]     = useState(null)
  // Shared state — account_id yang dipilih dari RiskTable
  const [selectedAccount, setSelectedAccount] = useState(null)

  // ── Cek koneksi API saat startup ─────────────────────────────
  useEffect(() => {
    healthCheck()
      .then(data => {
        setApiStatus('ok')
        setApiInfo(data)
        // Set badge critical dari data
        const critBadge = data.accounts ? `${data.accounts} akun` : null
        // eslint-disable-next-line no-unused-vars
        void critBadge
      })
      .catch(() => setApiStatus('error'))
  }, [])

  // ── Navigasi ke detail akun dari tabel ───────────────────────
  const goToDetail = (accountId) => {
    setSelectedAccount(accountId)
    setActivePage('detail')
  }

  // ── Render page ───────────────────────────────────────────────
  const renderPage = () => {
    switch (activePage) {
      // Tahap 2 ✅
      case 'overview':  return <Overview onSelectAccount={(page, id) => { setActivePage(page); if (id) setSelectedAccount(id) }} />
      case 'etl':       return <ETLWizard />
      // Tahap 3 ✅
      case 'risk-table': return (
        <RiskTable
          onSelectAccount={(id) => {
            setSelectedAccount(id)
            setActivePage('detail')
          }}
        />
      )
      case 'detail': return (
        <AccountDetail
          accountId={selectedAccount}
          onBack={() => setActivePage('risk-table')}
        />
      )
      // Tahap 4 ✅
      case 'network':   return <NetworkGraph />
      case 'params':    return <ParameterConfig />
      // Tahap 5
      case 'simulate':  return <Placeholder name="Transaction Simulator (Tahap 5)" />
      case 'copilot':   return <Placeholder name="AI Co-Pilot (Tahap 5)" />
      // Tahap 6
      case 'eda':       return <Placeholder name="EDA & Metodologi (Tahap 6)" />
      case 'model':     return <Placeholder name="Model Metrics (Tahap 6)" />
      case 'azure':     return <Placeholder name="Azure Proof (Tahap 6)" />
      case 'insights':  return <Placeholder name="Strategic Insights (Tahap 6)" />
      default:          return <Placeholder name={activePage} />
    }
  }

  return (
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <h1>🛡️ JudolGuard</h1>
          <p>AI Compliance Intelligence</p>
        </div>

        {/* API Status */}
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
            ? `API online · ${apiInfo?.accounts ?? 0} akun`
            : apiStatus === 'error'
            ? 'API offline — jalankan FastAPI'
            : 'Menghubungkan...'}
        </div>

        {/* Navigation */}
        {NAV.map(group => (
          <div className="sidebar-section" key={group.section}>
            <div className="sidebar-section-label">{group.section}</div>
            {group.items.map(item => (
              <button
                key={item.id}
                className={`nav-item${activePage === item.id ? ' active' : ''}`}
                onClick={() => setActivePage(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
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

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="main-content" key={activePage}>
        {renderPage()}
      </main>
    </div>
  )
}
