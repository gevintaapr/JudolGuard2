import { useState, useRef, useEffect } from 'react'
import { getAccounts, getNetworkGraph, sendCopilotMessage } from '../api'

// ── Markdown renderer: **bold**, *italic*, bullet list lines ──────
function renderMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, li) => {
    const trimmed = line.trim()
    const isBullet = /^[-•*]\s+/.test(trimmed)
    const isNumbered = /^\d+\.\s+/.test(trimmed)
    const content = isBullet ? trimmed.replace(/^[-•*]\s+/, '') : isNumbered ? trimmed.replace(/^\d+\.\s+/, '') : line
    const parts = []
    const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g
    let last = 0, m
    while ((m = regex.exec(content)) !== null) {
      if (m.index > last) parts.push(content.slice(last, m.index))
      if (m[1] !== undefined) parts.push(<strong key={`b-${li}-${m.index}`} style={{ color: '#e2e8f0', fontWeight: 700 }}>{m[1]}</strong>)
      else if (m[2] !== undefined) parts.push(<em key={`i-${li}-${m.index}`} style={{ color: '#93c5fd', fontStyle: 'normal', fontWeight: 600 }}>{m[2]}</em>)
      last = m.index + m[0].length
    }
    if (last < content.length) parts.push(content.slice(last))
    const rendered = parts.length ? parts : content

    if (isBullet || isNumbered) {
      return (
        <div key={li} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
          <span style={{ color: '#00d4ff', flexShrink: 0, marginTop: 1 }}>{isNumbered ? `${trimmed.match(/^(\d+)/)?.[1]}.` : '▸'}</span>
          <span>{rendered}</span>
        </div>
      )
    }
    if (!trimmed) return <div key={li} style={{ height: 8 }} />
    return <div key={li}>{rendered}</div>
  })
}

const NODE_COLORS = {
  origin:    { fill: '#ef4444', stroke: '#fca5a5', label: '🎯 Origin' },
  mule:      { fill: '#eab308', stroke: '#fde047', label: '🔀 Mule' },
  collector: { fill: '#f97316', stroke: '#fdba74', label: '🏦 Collector' },
}

const LEVEL_COLORS = {
  Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e'
}

// ── Pure SVG Network Graph ─────────────────────────────────────
function SVGGraph({ nodes, edges }) {
  const [hovered,  setHovered]  = useState(null)
  const [tooltip,  setTooltip]  = useState(null)
  const svgRef = useRef(null)

  const W = 600, H = 320

  // Position layout — origin center, mules in ring, collectors outer ring
  const positioned = nodes.map(node => {
    if (node.type === 'origin') return { ...node, x: W / 2, y: H / 2 }

    const muleNodes      = nodes.filter(n => n.type === 'mule')
    const collectorNodes = nodes.filter(n => n.type === 'collector')

    if (node.type === 'mule') {
      const i = muleNodes.indexOf(node)
      const n = muleNodes.length || 1
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      const r = 100
      return { ...node, x: W/2 + r * Math.cos(angle), y: H/2 + r * Math.sin(angle) }
    }

    if (node.type === 'collector') {
      const i = collectorNodes.indexOf(node)
      const n = collectorNodes.length || 1
      const angle = (2 * Math.PI * i) / n - Math.PI / 2 + Math.PI / (n * 2)
      const r = 140
      return { ...node, x: W/2 + r * Math.cos(angle), y: H/2 + r * Math.sin(angle) }
    }

    return { ...node, x: W/2, y: H/2 }
  })

  const posMap = {}
  positioned.forEach(n => { posMap[n.id] = n })

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', background: '#060a14', borderRadius: 'var(--radius-md)' }}
      >
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          </pattern>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="rgba(107,114,128,0.6)" />
          </marker>
          <marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="rgba(79,70,229,0.8)" />
          </marker>
          <filter id="glow-red">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />

        {/* Edges */}
        {edges.map((edge, i) => {
          const src = posMap[edge.from]
          const dst = posMap[edge.to]
          if (!src || !dst) return null
          const isBlue = edge.color === '#4f46e5'
          return (
            <g key={i}>
              <line
                x1={src.x} y1={src.y} x2={dst.x} y2={dst.y}
                stroke={isBlue ? 'rgba(79,70,229,0.5)' : 'rgba(107,114,128,0.4)'}
                strokeWidth={isBlue ? 1.5 : 1}
                strokeDasharray={isBlue ? '5 3' : 'none'}
                markerEnd={isBlue ? 'url(#arrow-blue)' : 'url(#arrow)'}
              />
              {/* Edge label */}
              {edge.label && edge.label !== 'aggregasi' && (
                <text
                  x={(src.x + dst.x) / 2}
                  y={(src.y + dst.y) / 2 - 4}
                  textAnchor="middle"
                  fill="rgba(148,163,184,0.7)"
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {positioned.map(node => {
          const nc     = NODE_COLORS[node.type] || NODE_COLORS.mule
          const isHov  = hovered === node.id
          const r      = node.size || (node.type === 'origin' ? 28 : node.type === 'collector' ? 20 : 14)

          return (
            <g
              key={node.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => { setHovered(node.id); setTooltip(node) }}
              onMouseLeave={() => { setHovered(null); setTooltip(null) }}
            >
              {/* Glow ring */}
              {(isHov || node.type === 'origin') && (
                <circle cx={node.x} cy={node.y} r={r + 8}
                  fill="none"
                  stroke={nc.fill}
                  strokeWidth="1.5"
                  opacity="0.3"
                  style={{ animation: 'pulse-ring 1.5s ease-out infinite' }}
                />
              )}
              {/* Main circle */}
              <circle
                cx={node.x} cy={node.y} r={r}
                fill={nc.fill}
                opacity="0.9"
                stroke={isHov ? '#fff' : nc.stroke}
                strokeWidth={isHov ? 2 : 1}
                style={{ transition: 'all 0.15s ease', filter: node.type === 'origin' ? 'drop-shadow(0 0 8px rgba(239,68,68,0.6))' : 'none' }}
              />
              {/* Level dot */}
              <circle
                cx={node.x + r * 0.6} cy={node.y - r * 0.6} r={4}
                fill={LEVEL_COLORS[node.level] || '#4b5563'}
              />
              {/* Label */}
              {(node.type === 'origin' || isHov) && (
                <text
                  x={node.x} y={node.y + r + 12}
                  textAnchor="middle"
                  fill="rgba(241,245,249,0.9)"
                  fontSize={node.type === 'origin' ? 9 : 8}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={node.type === 'origin' ? 700 : 400}
                >
                  {node.label.length > 14 ? node.label.slice(0, 14) + '…' : node.label}
                </text>
              )}
              {/* Score text inside origin */}
              {node.type === 'origin' && (
                <text x={node.x} y={node.y + 4} textAnchor="middle"
                  fill="#fff" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif">
                  {Math.round(node.score)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Tooltip overlay */}
      {tooltip && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'var(--bg-card)', border: '1px solid var(--border-md)',
          borderRadius: 'var(--radius-md)', padding: '12px 14px',
          fontSize: '0.75rem', minWidth: 180, pointerEvents: 'none',
        }}>
          <div className="mono" style={{ fontWeight: 700, color: 'var(--brand-from)', marginBottom: 6 }}>
            {tooltip.id}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color: 'var(--text-muted)' }}>Type</span>
            <span style={{ color: NODE_COLORS[tooltip.type]?.fill }}>{tooltip.type}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color: 'var(--text-muted)' }}>Risk Score</span>
            <span style={{ fontWeight: 700, color: LEVEL_COLORS[tooltip.level] }}>{tooltip.score}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Level</span>
            <span className={`risk-badge ${tooltip.level}`}>{tooltip.level}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function NetworkGraph({ onGraphLoaded }) {
  const [accountId,    setAccountId]    = useState('')
  const [suggestions,  setSuggestions]  = useState([])
  const [graphData,    setGraphData]    = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [showSuggest,  setShowSuggest]  = useState(false)

  // AI Insight State
  const [aiResult,   setAiResult]   = useState(null)
  const [aiLoading,  setAiLoading]  = useState(false)
  const [aiError,    setAiError]    = useState(null)

  // Load top critical accounts sebagai quick-select
  useEffect(() => {
    getAccounts({ level: 'Critical', limit: 10 })
      .then(d => setSuggestions(d.accounts || []))
      .catch(() => {})
  }, [])

  const fetchGraph = async (id) => {
    const target = id || accountId
    if (!target) return
    setLoading(true)
    setError(null)
    setShowSuggest(false)
    try {
      const res = await getNetworkGraph(target)
      setGraphData(res)
      setAccountId(target)
      if (onGraphLoaded) onGraphLoaded(res)
      setAiResult(null) // reset insight on new graph
    } catch(e) {
      setError(e.message)
      setGraphData(null)
    } finally {
      setLoading(false)
    }
  }

  const originNode  = graphData?.nodes?.find(n => n.type === 'origin')
  const muleCount   = graphData?.nodes?.filter(n => n.type === 'mule').length || 0
  const collCount   = graphData?.nodes?.filter(n => n.type === 'collector').length || 0

  const generateInsight = async () => {
    if (!graphData) return
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)
    const prompt = `Berikan INSIGHT MENDALAM terkait jaringan smurfing ini:
- Origin Account: ${graphData.account_id} (Score: ${graphData.risk_score})
- Mule Accounts: ${muleCount}
- Collectors: ${collCount}
Jelaskan apa intinya untuk analis compliance, dan berikan 3 tindakan konkrit (actionable) yang harus dilakukan terhadap jaringan ini.`

    try {
      const res = await sendCopilotMessage({ message: prompt, conversation: [] })
      setAiResult(res.reply)
    } catch (e) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2>🕸️ Smurfing Network Decoupler</h2>
        <p>Visualisasi jaringan smurfing — bongkar Collector Account (bandar) di balik ribuan mule</p>
      </div>

      {/* ── Konsep explanation ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { icon: '🎯', color: '#ef4444', label: 'Origin Account', desc: 'Sumber dana / bandar. Skor Critical, terdeteksi XGBoost.' },
          { icon: '🔀', color: '#eab308', label: 'Mule Accounts',  desc: 'Akun perantara pinjaman KTP. Skor rendah tapi ikut tertular risiko.' },
          { icon: '🏦', color: '#f97316', label: 'Collector',      desc: 'Pengepul akhir. Menerima dari banyak mule di jam yang sama.' },
        ].map(t => (
          <div key={t.label} style={{
            display: 'flex', gap: 10, padding: '12px 14px',
            background: `${t.color}10`, border: `1px solid ${t.color}30`,
            borderRadius: 'var(--radius-md)',
          }}>
            <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{t.icon}</span>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: t.color }}>{t.label}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>{t.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        {/* ── Left: Input & quick-select ─────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
          <div className="card">
            <div className="card-title">Cari Account</div>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                placeholder="Masukkan Account ID..."
                value={accountId}
                onChange={e => { setAccountId(e.target.value); setShowSuggest(true) }}
                onKeyDown={e => e.key === 'Enter' && fetchGraph()}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              />
              {/* Dropdown suggestions */}
              {showSuggest && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                  background: 'var(--bg-card)', border: '1px solid var(--border-md)',
                  borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                  boxShadow: 'var(--shadow-lg)',
                }}>
                  {suggestions
                    .filter(s => !accountId || s.account_id.toLowerCase().includes(accountId.toLowerCase()))
                    .slice(0, 6)
                    .map(s => (
                      <div
                        key={s.account_id}
                        onMouseDown={() => fetchGraph(s.account_id)}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', fontSize: '0.75rem',
                          borderBottom: '1px solid var(--border)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span className="mono" style={{ color: 'var(--brand-from)' }}>{s.account_id}</span>
                        <span className={`risk-badge ${s.risk_level}`}>{s.risk_level}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              onClick={() => fetchGraph()}
              disabled={loading || !accountId}
            >
              {loading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Memuat...</> : '🔍 Buka Network'}
            </button>
          </div>

          {/* Quick select — top Critical */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="card-title" style={{ marginBottom: 8 }}>⚡ Quick Select — Top Critical</div>
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
              {suggestions.slice(0, 5).map(s => (
                <button
                  key={s.account_id}
                  onClick={() => fetchGraph(s.account_id)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 10px', borderRadius: 6, border: 'none',
                    background: accountId === s.account_id ? 'rgba(59,130,246,0.15)' : 'var(--bg-surface)',
                    cursor: 'pointer', fontSize: '0.72rem', flexShrink: 0,
                    borderLeft: accountId === s.account_id ? '2px solid var(--brand-from)' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span className="mono" style={{ color: 'var(--brand-from)' }}>{s.account_id}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--critical)', fontWeight: 700 }}>
                    {s.final_risk_score}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Graph stats */}
          {graphData && (
            <div className="card">
              <div className="card-title">📊 Network Stats</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Total Nodes',  val: graphData.network_size, color: 'var(--brand-from)' },
                  { label: 'Mule Accounts', val: muleCount, color: 'var(--medium)' },
                  { label: 'Collectors',    val: collCount,  color: 'var(--high)' },
                  { label: 'Archetype',     val: graphData.archetype, color: 'var(--text-secondary)' },
                  { label: 'Origin Score',  val: graphData.risk_score, color: 'var(--critical)' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                    <span style={{ color: s.color, fontWeight: 600 }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── Right: SVG Graph ────────────────────────────────── */}
        <div className="card" style={{ padding: 12 }}>
          {loading ? (
            <div className="loading-state" style={{ height: 320 }}>
              <div className="spinner" style={{ width: 28, height: 28 }} />
              <span>Membangun network graph...</span>
            </div>
          ) : error ? (
            <div className="empty-state" style={{ height: 320 }}>
              <div className="icon">⚠️</div>
              <p style={{ color: 'var(--critical)' }}>{error}</p>
            </div>
          ) : !graphData ? (
            <div className="empty-state" style={{ height: 320 }}>
              <div className="icon">🕸️</div>
              <p>Pilih atau masukkan Account ID<br />untuk memvisualisasikan jaringan smurfing-nya</p>
            </div>
          ) : (
            <>
              {/* Graph header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--brand-from)', fontSize: '0.82rem' }}>
                  {graphData.account_id}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Hover node untuk detail
                </span>
              </div>
              <SVGGraph nodes={graphData.nodes} edges={graphData.edges} />

              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10 }}>
                {Object.entries(NODE_COLORS).map(([type, c]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.fill }} />
                    <span style={{ color: 'var(--text-muted)' }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Insight Box dipindah ke bawah agar memanjang ke samping */}
      {graphData && (
        <div className="card" style={{
          marginTop: 16,
          background: 'linear-gradient(135deg, rgba(0,212,255,0.04), rgba(139,92,246,0.04))',
          border: '1px solid rgba(0,212,255,0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiResult || aiLoading || aiError ? 12 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1rem' }}>✨</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00d4ff' }}>AI Network Insight</span>
            </div>
            {!aiResult && !aiLoading && (
              <button
                onClick={generateInsight}
                style={{
                  padding: '4px 10px', borderRadius: 20,
                  border: '1px solid #00d4ff', background: 'rgba(0,212,255,0.1)',
                  color: '#00d4ff', fontSize: '0.65rem', fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Generate Insight
              </button>
            )}
          </div>

          {aiLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: 12 }}>
              <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
              Menganalisis jaringan...
            </div>
          )}

          {aiError && (
            <div style={{ fontSize: '0.75rem', color: 'var(--critical)', paddingTop: 12 }}>⚠ {aiError}</div>
          )}

          {aiResult && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.6, paddingTop: 6 }}>
              {renderMarkdown(aiResult)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
