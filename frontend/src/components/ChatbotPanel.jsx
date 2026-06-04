import { useState, useRef, useEffect } from 'react'
import { sendCopilotMessage } from '../api'

const QUICK_PROMPTS = [
  { label: 'Status fraud terkini',      msg: 'Berikan ringkasan status fraud terkini dalam sistem JudolGuard.' },
  { label: 'Analisis transaksi hari ini', msg: 'Analisis pola transaksi yang terdeteksi hari ini dan berikan insight.' },
  { label: 'Performa model AI',          msg: 'Bagaimana performa model AI JudolGuard saat ini? Jelaskan metrik utamanya.' },
  { label: 'Tampilkan semua alert',      msg: 'Tampilkan semua alert aktif dan urutan prioritas penanganannya.' },
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
        fontSize: '0.8rem',
        background: isUser ? 'rgba(59,130,246,0.2)' : 'rgba(0,120,212,0.15)',
        border: `1px solid ${isUser ? 'rgba(59,130,246,0.35)' : 'rgba(0,120,212,0.3)'}`,
        boxShadow: isUser ? 'none' : '0 0 10px rgba(0,120,212,0.2)',
      }}>
        {isUser ? '👤' : '🤖'}
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
        {msg.loading ? <TypingDots /> : msg.content}
      </div>
    </div>
  )
}

export default function ChatbotPanel({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Halo! Saya **JudolGuard AI Assistant**.\n\nSaya dapat membantu menganalisis pola fraud, memantau ancaman real-time, dan memberikan insight keamanan sistem Anda. Ada yang bisa saya bantu?'
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
      content: 'Chat dibersihkan. Ada yang ingin Anda tanyakan tentang data JudolGuard?'
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
                background: 'linear-gradient(135deg, rgba(0,120,212,0.3), rgba(59,130,246,0.2))',
                border: '1px solid rgba(0,120,212,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem',
                boxShadow: '0 0 16px rgba(0,120,212,0.3)',
                position: 'relative',
              }}>
                🤖
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
                  JudolGuard AI
                </div>
                <div style={{ fontSize: '0.65rem', color: '#0078d4', fontWeight: 500 }}>
                  ✦ Fraud Intelligence Assistant
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

          {/* Azure badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 8px', borderRadius: 20,
            background: 'rgba(0,120,212,0.08)',
            border: '1px solid rgba(0,120,212,0.2)',
            fontSize: '0.6rem', color: '#4da6ff',
          }}>
            ☁️ Powered by Azure OpenAI GPT-4o
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
              placeholder="Tanya tentang fraud, ancaman, model AI..."
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
            Enter = kirim · Shift+Enter = baris baru
          </div>
        </div>
      </div>
    </>
  )
}
