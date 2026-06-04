import { useState, useEffect, useCallback } from 'react'
import { getAccounts } from '../api'

const RISK_COLORS = {
  Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e'
}

const PROFILES = ['normal', 'early_stage', 'escalating', 'heavy_gambler']
const LEVELS   = ['Critical', 'High', 'Medium', 'Low']

const PROFILE_LABELS = {
  normal:        { label: 'Normal',        icon: '😊', color: 'var(--low)' },
  early_stage:   { label: 'Early Stage',   icon: '⚠️', color: 'var(--medium)' },
  escalating:    { label: 'Escalating',    icon: '📈', color: 'var(--high)' },
  heavy_gambler: { label: 'Heavy Gambler', icon: '🎰', color: 'var(--critical)' },
}

function ScoreBar({ score }) {
  const color = score >= 81 ? '#ef4444' : score >= 61 ? '#f97316' : score >= 31 ? '#eab308' : '#22c55e'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
      <span className="mono" style={{ fontSize: '0.73rem', color, width: 32, textAlign: 'right', fontWeight: 700 }}>
        {score}
      </span>
    </div>
  )
}

export default function RiskTable({ onSelectAccount }) {
  const [data,    setData]    = useState({ accounts: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // Filters
  const [filterLevel,   setFilterLevel]   = useState('')
  const [filterProfile, setFilterProfile] = useState('')
  const [search,        setSearch]        = useState('')
  const [offset,        setOffset]        = useState(0)
  const LIMIT = 50

  const fetchAccounts = useCallback(() => {
    setLoading(true)
    setError(null)
    getAccounts({
      level:   filterLevel   || undefined,
      profile: filterProfile || undefined,
      limit:   LIMIT,
      offset,
    })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [filterLevel, filterProfile, offset])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  // Reset offset saat filter berubah
  useEffect(() => { setOffset(0) }, [filterLevel, filterProfile])

  // Client-side search filter
  const filtered = (data.accounts || []).filter(acc =>
    !search || acc.account_id.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(data.total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>📋 Risk Table</h2>
        <p>Seluruh akun terdeteksi beserta skor risiko, profil perilaku, dan archetype</p>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <input
            className="input"
            placeholder="🔍 Cari Account ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 220 }}
          />

          {/* Filter Level */}
          <select className="input" value={filterLevel} onChange={e => setFilterLevel(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">Semua Level</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          {/* Filter Profile */}
          <select className="input" value={filterProfile} onChange={e => setFilterProfile(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="">Semua Profil</option>
            {PROFILES.map(p => <option key={p} value={p}>{PROFILE_LABELS[p]?.label}</option>)}
          </select>

          {/* Reset */}
          {(filterLevel || filterProfile || search) && (
            <button className="btn btn-ghost" onClick={() => { setFilterLevel(''); setFilterProfile(''); setSearch('') }}>
              ✕ Reset Filter
            </button>
          )}

          {/* Summary */}
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Menampilkan <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> dari{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{data.total}</strong> akun
          </span>
        </div>

        {/* Level filter quick buttons */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {LEVELS.map(l => (
            <button
              key={l}
              onClick={() => setFilterLevel(filterLevel === l ? '' : l)}
              style={{
                padding: '3px 12px',
                borderRadius: 20,
                border: `1px solid ${RISK_COLORS[l]}50`,
                background: filterLevel === l ? `${RISK_COLORS[l]}20` : 'transparent',
                color: RISK_COLORS[l],
                fontSize: '0.7rem', fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading-state" style={{ padding: '40px' }}>
            <div className="spinner" />
            <span>Memuat data akun...</span>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="icon">⚠️</div>
            <p style={{ color: 'var(--critical)' }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <p>Tidak ada akun yang cocok dengan filter ini</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 'var(--radius-lg)' }}>
            <table>
              <thead>
                <tr>
                  <th>Account ID</th>
                  <th>Archetype</th>
                  <th>Profile</th>
                  <th>Risk Level</th>
                  <th style={{ minWidth: 160 }}>Risk Score</th>
                  <th>Night Ratio</th>
                  <th>Burst Score</th>
                  <th>Uniq Recv/7d</th>
                  <th>Rekomendasi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(acc => {
                  const prof = PROFILE_LABELS[acc.profile]
                  return (
                    <tr key={acc.account_id} onClick={() => onSelectAccount?.(acc.account_id)}>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--brand-from)', fontSize: '0.78rem' }}>
                        {acc.account_id}
                      </td>
                      <td style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {acc.archetype || '—'}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 20,
                          background: `${prof?.color || '#4b5563'}18`,
                          color: prof?.color || 'var(--text-muted)',
                          fontSize: '0.68rem', fontWeight: 600,
                          border: `1px solid ${prof?.color || '#4b5563'}30`,
                          whiteSpace: 'nowrap',
                        }}>
                          {prof?.icon} {prof?.label || acc.profile}
                        </span>
                      </td>
                      <td>
                        <span className={`risk-badge ${acc.risk_level}`}>{acc.risk_level}</span>
                      </td>
                      <td><ScoreBar score={acc.final_risk_score} /></td>
                      <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {acc.avg_night_ratio != null ? `${(acc.avg_night_ratio * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {acc.avg_burst_score != null ? Number(acc.avg_burst_score).toFixed(1) : '—'}
                      </td>
                      <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {acc.avg_unique_recv != null ? Number(acc.avg_unique_recv).toFixed(0) : '—'}
                      </td>
                      <td style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', maxWidth: 180 }} className="truncate">
                        {acc.recommendation || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ─────────────────────────────────────── */}
        {!loading && data.total > LIMIT && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Halaman {currentPage} dari {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-ghost"
                style={{ padding: '5px 12px', fontSize: '0.72rem' }}
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              >
                ← Sebelumnya
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '5px 12px', fontSize: '0.72rem' }}
                disabled={offset + LIMIT >= data.total}
                onClick={() => setOffset(offset + LIMIT)}
              >
                Berikutnya →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
