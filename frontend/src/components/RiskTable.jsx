import { useState, useEffect, useCallback } from 'react'
import { getAccounts } from '../api'
import AccountDetail from './AccountDetail'

const RISK_COLORS = {
  Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e'
}

const PROFILES = ['normal', 'early_stage', 'escalating', 'heavy_gambler']
const LEVELS   = ['Critical', 'High', 'Medium', 'Low']

const PROFILE_LABELS = {
  normal:        { label: 'Normal',        color: 'var(--low)' },
  early_stage:   { label: 'Early Stage',   color: 'var(--medium)' },
  escalating:    { label: 'Escalating',    color: 'var(--high)' },
  heavy_gambler: { label: 'Heavy Gambler', color: 'var(--critical)' },
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

export default function RiskTable({ onSelectAccount, adjustedData }) {
  const [data,         setData]         = useState({ accounts: [], total: 0 })
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [selectedId,   setSelectedId]   = useState(null)   // inline detail

  // Filters
  const [filterLevel,   setFilterLevel]   = useState('')
  const [filterProfile, setFilterProfile] = useState('')
  const [search,        setSearch]        = useState('')
  const [offset,        setOffset]        = useState(0)
  const LIMIT = 15

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
  useEffect(() => { setOffset(0) }, [filterLevel, filterProfile])

  // Client-side search filter
  const filtered = (data.accounts || []).filter(acc =>
    !search || acc.account_id.toLowerCase().includes(search.toLowerCase())
  )

  // Build quick-lookup map dari adjustedData
  const adjustedMap = adjustedData
    ? Object.fromEntries(adjustedData.accounts.map(a => [a.account_id, a]))
    : null

  const totalPages  = Math.ceil(data.total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  const handleRowClick = (accountId) => {
    setSelectedId(accountId)
    // also notify parent if needed (for App.jsx back-compat)
    onSelectAccount?.(accountId)
  }

  return (
    <div className="fade-in" style={{ position: 'relative' }}>
      <div className="page-header">
        <h2>Risk Table</h2>
        <p>Semua akun terdeteksi beserta risk score, behavioral profile, dan archetype
          {selectedId && (
            <span style={{ marginLeft: 10, color: 'var(--brand-from)', fontSize: '0.75rem', fontWeight: 600 }}>
              — detail panel open: <span className="mono">{selectedId}</span>
            </span>
          )}
        </p>
      </div>

      {/* ── Main layout: table + optional detail panel ─────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedId ? '1fr 420px' : '1fr',
        gap: 16,
        transition: 'grid-template-columns 0.35s cubic-bezier(0.4,0,0.2,1)',
        alignItems: 'start',
      }}>

        {/* ── Left: Table ──────────────────────────────────────── */}
        <div>
          {/* Filter Bar */}
          <div className="card" style={{ marginBottom: 16, padding: '14px 18px' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="input"
                placeholder="Search Account ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ maxWidth: 220 }}
              />
              <select className="input" value={filterLevel} onChange={e => setFilterLevel(e.target.value)} style={{ maxWidth: 160 }}>
                <option value="">All Levels</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <select className="input" value={filterProfile} onChange={e => setFilterProfile(e.target.value)} style={{ maxWidth: 180 }}>
                <option value="">All Profiles</option>
                {PROFILES.map(p => <option key={p} value={p}>{PROFILE_LABELS[p]?.label}</option>)}
              </select>
              {(filterLevel || filterProfile || search) && (
                <button className="btn btn-ghost" onClick={() => { setFilterLevel(''); setFilterProfile(''); setSearch('') }}>
                  ✕ Reset Filters
                </button>
              )}
              {adjustedData && (
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600,
                  background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.4)',
                  color: '#eab308',
                }}>
                  ⚙️ Adjusted: {adjustedData.company}
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{data.total}</strong> accounts
              </span>
            </div>

            {/* Level quick-filter buttons */}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {LEVELS.map(l => (
                <button
                  key={l}
                  onClick={() => setFilterLevel(filterLevel === l ? '' : l)}
                  style={{
                    padding: '3px 12px', borderRadius: 20,
                    border: `1px solid ${RISK_COLORS[l]}50`,
                    background: filterLevel === l ? `${RISK_COLORS[l]}20` : 'transparent',
                    color: RISK_COLORS[l],
                    fontSize: '0.7rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >{l}</button>
              ))}
              {selectedId && (
                <button
                  onClick={() => setSelectedId(null)}
                  style={{
                    marginLeft: 'auto', padding: '3px 12px', borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'transparent', color: 'var(--text-muted)',
                    fontSize: '0.7rem', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  ✕ Close Detail
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0 }}>
            {loading ? (
              <div className="loading-state" style={{ padding: '40px' }}>
                <div className="spinner" />
                <span>Loading account data...</span>
              </div>
            ) : error ? (
              <div className="empty-state">
                <div className="icon" style={{ fontSize: '2.5rem' }}>⚠</div>
                <p style={{ color: 'var(--critical)' }}>{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="icon" style={{ fontSize: '2.5rem' }}>—</div>
                <p>No accounts match this filter</p>
              </div>
            ) : (
              <div className="table-wrap" style={{ borderRadius: 'var(--radius-lg)' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Account ID</th>
                      {!selectedId && <th>Archetype</th>}
                      <th>Profile</th>
                      <th>Risk Level</th>
                      <th style={{ minWidth: selectedId ? 100 : 160 }}>Risk Score</th>
                      {!selectedId && <>
                        <th>Night Ratio</th>
                        <th>Burst Score</th>
                        <th>Unique Recv/7d</th>
                        <th>Recommendation</th>
                      </>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(acc => {
                      const prof = PROFILE_LABELS[acc.profile]
                      const isSelected = acc.account_id === selectedId
                      // Data adjusted jika ada
                      const adj = adjustedMap?.[acc.account_id]
                      const displayScore = adj ? adj.adjusted_score : acc.final_risk_score
                      const displayLevel = adj ? adj.adjusted_level : acc.risk_level
                      const delta = adj ? adj.score_delta : 0
                      return (
                        <tr
                          key={acc.account_id}
                          onClick={() => handleRowClick(acc.account_id)}
                          style={{
                            background: isSelected
                              ? 'rgba(59,130,246,0.10)'
                              : undefined,
                            borderLeft: isSelected
                              ? '3px solid var(--brand-from)'
                              : '3px solid transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <td className="mono" style={{
                            fontWeight: 600,
                            color: 'var(--brand-from)',
                            fontSize: '0.75rem',
                          }}>
                            {acc.account_id}
                            {isSelected && (
                              <span style={{ marginLeft: 6, fontSize: '0.6rem', color: '#00d4ff' }}>●</span>
                            )}
                          </td>
                          {!selectedId && (
                            <td style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                              {acc.archetype || '—'}
                            </td>
                          )}
                          <td>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 7px', borderRadius: 20,
                              background: `${prof?.color || '#4b5563'}18`,
                              color: prof?.color || 'var(--text-muted)',
                              fontSize: '0.65rem', fontWeight: 600,
                              border: `1px solid ${prof?.color || '#4b5563'}30`,
                              whiteSpace: 'nowrap',
                            }}>
                              {prof?.label || acc.profile}
                            </span>
                          </td>
                          <td>
                            <span className={`risk-badge ${displayLevel}`}>{displayLevel}</span>
                            {adj && displayLevel !== acc.risk_level && (
                              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginLeft: 4 }}>
                                was {acc.risk_level}
                              </span>
                            )}
                          </td>
                          <td>
                            <ScoreBar score={displayScore} />
                            {adj && delta !== 0 && (
                              <div style={{ fontSize: '0.6rem', fontWeight: 700, marginTop: 2,
                                color: delta > 0 ? '#ef4444' : '#22c55e' }}>
                                {delta > 0 ? '▲' : '▼'} {delta > 0 ? '+' : ''}{delta}
                              </div>
                            )}
                          </td>
                          {!selectedId && <>
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
                          </>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && data.total > LIMIT && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderTop: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '5px 12px', fontSize: '0.72rem' }}
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  >
                    ← Previous
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '5px 12px', fontSize: '0.72rem' }}
                    disabled={offset + LIMIT >= data.total}
                    onClick={() => setOffset(offset + LIMIT)}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Inline Detail Panel ────────────────────────── */}
        {selectedId && (
          <div
            className="fade-in"
            style={{
              position: 'sticky',
              top: 24,
              maxHeight: 'calc(100vh - 48px)',
              overflowY: 'auto',
              background: 'rgba(9,13,25,0.97)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              boxShadow: '-4px 0 30px rgba(0,0,0,0.4), 0 0 40px rgba(59,130,246,0.06)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              scrollbarWidth: 'thin',
            }}
          >
            {/* Close button inside panel */}
            <button
              onClick={() => setSelectedId(null)}
              style={{
                position: 'absolute', top: 12, right: 12,
                width: 26, height: 26, borderRadius: '50%',
                border: '1px solid var(--border-md)',
                background: 'transparent', color: 'var(--text-muted)',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem', transition: 'all 0.15s',
                fontFamily: 'var(--font-sans)', zIndex: 2,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.12)'
                e.currentTarget.style.color = 'var(--critical)'
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.borderColor = 'var(--border-md)'
              }}
            >
              ×
            </button>

            <AccountDetail
              accountId={selectedId}
              onBack={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
