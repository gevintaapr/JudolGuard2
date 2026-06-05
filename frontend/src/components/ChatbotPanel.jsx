import { useState, useRef, useEffect } from 'react'
import { sendCopilotMessage } from '../api'

/* ── SVG Bot Icon (small for bubbles) ─────────────────────────── */
const BotAvatarSvg = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="9" width="16" height="11" rx="2"/>
    <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none"/>
    <path d="M9 17.5c.7.4 1.5.6 3 .6s2.3-.2 3-.6"/>
    <path d="M8 9V6a4 4 0 0 1 8 0v3"/>
    <line x1="12" y1="2" x2="12" y2="4"/>
  </svg>
)

const QUICK_PROMPTS = [
  { label: 'Fraud status terkini',        msg: 'Berikan ringkasan status fraud terkini dalam sistem JudolGuard.' },
  { label: 'Analisis transaksi hari ini', msg: 'Analisis pola transaksi yang terdeteksi hari ini dan berikan insight.' },
  { label: 'AI model performance',        msg: 'Bagaimana performa model AI JudolGuard saat ini? Jelaskan metrik utamanya.' },
  { label: 'Active alerts',               msg: 'Tampilkan semua alert aktif dan urutan prioritas penanganannya.' },
]

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 0', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--brand-from)',
          animation: `typing-dot 1.2s ${i * 0.2}s ease-in-out infinite`,
          display: 'inline-block',
        }} />
      ))}
    </div>
  )
}

// Render markdown: **bold**, *italic*, line breaks
function renderMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, li) => {
    const parts = []
    const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g
    let last = 0, m
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index))
      if (m[1] !== undefined)
        parts.push(<strong key={m.index} style={{ color: '#e2e8f0', fontWeight: 700 }}>{m[1]}</strong>)
      else if (m[2] !== undefined)
        parts.push(<em key={m.index} style={{ color: '#93c5fd', fontStyle: 'normal', fontWeight: 600 }}>{m[2]}</em>)
      last = m.index + m[0].length
    }
    if (last < line.length) parts.push(line.slice(last))
    return <span key={li}>{parts.length ? parts : line}{li < lines.length - 1 && <br />}</span>
  })
}

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 8,
      marginBottom: 12,
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isUser ? 'rgba(59,130,246,0.2)' : 'linear-gradient(135deg, rgba(0,120,212,0.25), rgba(139,92,246,0.2))',
        border: `1px solid ${isUser ? 'rgba(59,130,246,0.35)' : 'rgba(0,120,212,0.4)'}`,
        boxShadow: isUser ? 'none' : '0 0 12px rgba(0,120,212,0.25)',
        color: isUser ? '#3b82f6' : '#00d4ff',
      }}>
        {isUser
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          : <BotAvatarSvg size={14} />
        }
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '80%',
        padding: '9px 13px',
        borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
        background: isUser
          ? 'rgba(59,130,246,0.14)'
          : 'rgba(13,20,38,0.95)',
        border: `1px solid ${isUser ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.08)'}`,
        fontSize: '0.78rem',
        lineHeight: 1.65,
        color: 'var(--text-primary)',
        whiteSpace: 'pre-wrap',
        backdropFilter: 'blur(8px)',
      }}>
        {msg.loading ? <TypingDots /> : renderMarkdown(msg.content)}
      </div>
    </div>
  )
}

export default function ChatbotPanel({ isOpen, onClose, adjustedData, networkData }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Halo! Aku Jugu 👋\n\nAku di sini buat bantu kamu analisis data fraud secara real-time. Tanya apa aja — dari risk score akun tertentu, pola transaksi yang mencurigakan, sampai langkah compliance yang harus diambil.'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setMessages(prev => [...prev, { role: 'assistant', content: '', loading: true }])
    setLoading(true)

    try {
      const history = messages
        .filter(m => !m.loading)
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await sendCopilotMessage({
        message:      msg,
        conversation: history,
        adjustedData: adjustedData || null,
        networkData:  networkData || null,
      })

      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: res.reply }
      ])
    } catch (e) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `⚠️ Error: ${e.message}\n\nPastikan AZURE_KEY sudah dikonfigurasi di FastAPI.` }
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Chat cleared. What would you like to ask about JudolGuard data?'
    }])
  }

  return (
    <>
      {/* Backdrop (mobile only, optional) */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 149,
            background: 'transparent',
            display: 'none', // hide on desktop
          }}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 360,
          zIndex: 150,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(9, 13, 25, 0.97)',
          borderLeft: '1px solid rgba(59,130,246,0.2)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: isOpen ? '-8px 0 40px rgba(0,0,0,0.6), -2px 0 0 rgba(59,130,246,0.1)' : 'none',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(15, 22, 41, 0.8)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* AI Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(0,120,212,0.3), rgba(139,92,246,0.25))',
                border: '1px solid rgba(0,120,212,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#00d4ff',
                boxShadow: '0 0 20px rgba(0,120,212,0.35)',
                position: 'relative',
              }}>
                <BotAvatarSvg size={18} />
                {/* Live dot */}
                <span style={{
                  position: 'absolute', bottom: 1, right: 1,
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 6px #22c55e',
                  border: '1px solid rgba(9,13,25,0.9)',
                }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Jugu
                </div>
                <div style={{ fontSize: '0.65rem', color: '#0078d4', fontWeight: 500 }}>
                  ✶ AI Fraud Analyst
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={clearChat}
                title="Clear chat"
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '1px solid var(--border-md)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                ↺
              </button>
              <button
                onClick={onClose}
                title="Close"
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  border: '1px solid var(--border-md)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'var(--critical)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-md)' }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Azure + Adjusted badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 20,
              background: 'rgba(0,120,212,0.08)',
              border: '1px solid rgba(0,120,212,0.2)',
              fontSize: '0.6rem', color: '#4da6ff',
            }}>
              ☁️ Powered by Azure OpenAI GPT-4o
            </div>
            {adjustedData && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 20,
                background: 'rgba(234,179,8,0.1)',
                border: '1px solid rgba(234,179,8,0.35)',
                fontSize: '0.6rem', color: '#eab308',
              }}>
                ⚙️ Custom Parameters
              </div>
            )}
            {networkData && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 20,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.35)',
                fontSize: '0.6rem', color: '#f87171',
              }}>
                🕸️ Network: {networkData.account_id}
              </div>
            )}
          </div>
        </div>

        {/* ── Messages ────────────────────────────────────── */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 14px 8px',
          display: 'flex', flexDirection: 'column',
        }}>
          {messages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* ── Quick Prompts ───────────────────────────────── */}
        <div style={{
          padding: '8px 12px',
          display: 'flex', flexWrap: 'wrap', gap: 5,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}>
          {QUICK_PROMPTS.map(p => (
            <button
              key={p.label}
              onClick={() => send(p.msg)}
              disabled={loading}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                border: '1px solid rgba(59,130,246,0.25)',
                background: 'rgba(59,130,246,0.07)',
                color: 'var(--brand-from)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.65rem',
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                transition: 'all 0.15s ease',
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={e => !loading && (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.07)')}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ── Input Bar ───────────────────────────────────── */}
        <div style={{
          padding: '10px 12px 14px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
            background: 'rgba(13,21,40,0.9)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 12,
            padding: '8px 10px',
            transition: 'border-color 0.2s ease',
          }}
            onFocus={() => {}}
          >
            <textarea
              ref={inputRef}
              placeholder="Ask about fraud, threats, AI model..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              disabled={loading}
              style={{
                flex: 1, resize: 'none',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.5,
                minHeight: 24,
                maxHeight: 100,
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                width: 32, height: 32,
                borderRadius: '50%',
                border: 'none',
                background: loading || !input.trim()
                  ? 'rgba(59,130,246,0.2)'
                  : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                color: '#fff',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                boxShadow: loading || !input.trim() ? 'none' : '0 0 12px rgba(59,130,246,0.4)',
              }}
            >
              {loading
                ? <span style={{
                    width: 12, height: 12,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block',
                  }} />
                : '↑'
              }
            </button>
          </div>
          <div style={{
            textAlign: 'center', marginTop: 6,
            fontSize: '0.58rem', color: 'var(--text-muted)',
          }}>
            Enter = send · Shift+Enter = new line
          </div>
        </div>
      </div>
    </>
  )
}
