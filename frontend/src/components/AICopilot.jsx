import { useState, useRef, useEffect } from 'react'
import { sendCopilotMessage, getAccounts } from '../api'

const QUICK_PROMPTS = [
  { icon: '🚨', label: 'Akun Critical teratas', msg: 'Siapa saja akun dengan risk score tertinggi dan apa tindakan prioritas yang harus diambil?' },
  { icon: '🕸️', label: 'Analisis smurfing',    msg: 'Jelaskan pola smurfing yang terdeteksi dan bagaimana contagion risk bekerja di JudolGuard?' },
  { icon: '🌙', label: 'Midnight Chaser',       msg: 'Berapa banyak akun yang teridentifikasi sebagai Midnight Chaser dan apa risikonya?' },
  { icon: '📱', label: 'QRIS Ghost pattern',    msg: 'Jelaskan bagaimana QRIS Ghost mengeksploitasi celah regulasi dan apa rekomendasi mitigasinya?' },
  { icon: '📊', label: 'Ringkasan sistem',      msg: 'Berikan ringkasan performa sistem JudolGuard saat ini: metrik model, distribusi akun, dan aksi prioritas.' },
  { icon: '📋', label: 'STR ke PPATK',          msg: 'Akun mana saja yang sudah memenuhi kriteria Suspicious Transaction Report (STR) ke PPATK?' },
]

// Render markdown sederhana: **bold**, *italic*, baris baru
function renderMarkdown(text) {
  if (!text) return null
  return text.split('\n').map((line, li) => {
    // Proses bold dan italic dalam satu baris
    const parts = []
    const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*/g
    let last = 0, m
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index))
      if (m[1] !== undefined) parts.push(<strong key={m.index} style={{ color: '#e2e8f0', fontWeight: 700 }}>{m[1]}</strong>)
      else if (m[2] !== undefined) parts.push(<em key={m.index} style={{ color: '#93c5fd', fontStyle: 'normal', fontWeight: 600 }}>{m[2]}</em>)
      last = m.index + m[0].length
    }
    if (last < line.length) parts.push(line.slice(last))
    return <span key={li}>{parts.length ? parts : line}{li < text.split('\n').length - 1 && <br />}</span>
  })
}

function ChatBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10,
      marginBottom: 14,
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isUser ? 'rgba(59,130,246,0.18)' : 'linear-gradient(135deg, rgba(0,120,212,0.2), rgba(139,92,246,0.18))',
        border: `1px solid ${isUser ? 'rgba(59,130,246,0.3)' : 'rgba(0,120,212,0.35)'}`,
        color: isUser ? '#3b82f6' : '#00d4ff',
        boxShadow: isUser ? 'none' : '0 0 10px rgba(0,120,212,0.2)',
      }}>
        {isUser
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="9" width="16" height="11" rx="2"/><circle cx="9" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1" fill="currentColor" stroke="none"/><path d="M9 17.5c.7.4 1.5.6 3 .6s2.3-.2 3-.6"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></svg>
        }
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '78%',
        padding: '10px 14px',
        borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
        background: isUser
          ? 'rgba(59,130,246,0.12)'
          : 'rgba(15,22,41,0.9)',
        border: `1px solid ${isUser ? 'rgba(59,130,246,0.2)' : 'var(--border-md)'}`,
        fontSize: '0.8rem',
        lineHeight: 1.65,
        color: 'var(--text-primary)',
        whiteSpace: 'pre-wrap',
      }}>
        {msg.loading
          ? <span className="log-cursor" style={{ background: '#3b82f6' }} />
          : renderMarkdown(msg.content)
        }
      </div>
    </div>
  )
}

export default function AICopilot() {
  const [messages,   setMessages]   = useState([
    {
      role: 'assistant',
      content: 'Halo! Aku Jugu 👋\n\nAku spesialis fraud detection & financial risk analysis yang udah ngelihat ribuan pola transaksi mencurigakan. Kamu bisa tanya aku soal:\n• Analisis akun spesifik yang mencurigakan\n• Pola smurfing, QRIS Ghost, Midnight Chaser\n• Langkah compliance yang harus diambil\n• Interpretasi risk score dan artinya buat bisnis kamu\n\nMau mulai dari mana?'
    }
  ])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [accountId,  setAccountId]  = useState('')
  const [accounts,   setAccounts]   = useState([])
  const [showAccSug, setShowAccSug] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Load top accounts untuk context selector
  useEffect(() => {
    getAccounts({ level: 'Critical', limit: 20 })
      .then(d => setAccounts(d.accounts || []))
      .catch(() => {})
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])

    // Placeholder loading bubble
    setMessages(prev => [...prev, { role: 'assistant', content: '', loading: true }])
    setLoading(true)

    try {
      // Build conversation history (skip system messages, max 8 pesan terakhir)
      const history = messages
        .filter(m => !m.loading)
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await sendCopilotMessage({
        message:      msg,
        account_id:   accountId || undefined,
        conversation: history,
      })

      // Ganti loading bubble dengan reply
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: res.reply }
      ])
    } catch(e) {
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
      content: 'Chat dibersihkan. Aku di sini kalau kamu mau analisis lagi — tanya apa aja soal data fraud-nya!'
    }])
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <h2>Jugu — AI Fraud Analyst</h2>
        <p>Partner analisis risiko kamu — spesialis fraud detection, data science keuangan, dan compliance</p>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
        {/* ── Left: Sidebar ─────────────────────────────────── */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Account context selector */}
          <div className="card" style={{ padding: '14px' }}>
            <div className="card-title">🎯 Konteks Akun</div>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                placeholder="Opsional: Account ID..."
                value={accountId}
                onChange={e => { setAccountId(e.target.value); setShowAccSug(true) }}
                onFocus={() => setShowAccSug(true)}
                onBlur={() => setTimeout(() => setShowAccSug(false), 150)}
                style={{ fontSize: '0.75rem' }}
              />
              {showAccSug && accounts.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30,
                  background: 'var(--bg-card)', border: '1px solid var(--border-md)',
                  borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                  boxShadow: 'var(--shadow-lg)', maxHeight: 180, overflowY: 'auto',
                }}>
                  <div
                    onMouseDown={() => { setAccountId(''); setShowAccSug(false) }}
                    style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}
                  >
                    Tanpa konteks akun
                  </div>
                  {accounts
                    .filter(a => !accountId || a.account_id.toLowerCase().includes(accountId.toLowerCase()))
                    .slice(0, 8)
                    .map(a => (
                      <div
                        key={a.account_id}
                        onMouseDown={() => { setAccountId(a.account_id); setShowAccSug(false) }}
                        style={{
                          padding: '7px 12px', cursor: 'pointer', fontSize: '0.72rem',
                          borderBottom: '1px solid var(--border)',
                          display: 'flex', justifyContent: 'space-between',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span className="mono" style={{ color: 'var(--brand-from)' }}>{a.account_id}</span>
                        <span style={{ color: 'var(--critical)', fontWeight: 700, fontSize: '0.65rem' }}>{a.final_risk_score}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
            {accountId && (
              <div style={{ marginTop: 6, fontSize: '0.65rem', color: 'var(--brand-from)' }}>
                ✓ AI akan fokus pada akun: <strong>{accountId}</strong>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          <div className="card" style={{ padding: '14px', flex: 1 }}>
            <div className="card-title">⚡ Quick Prompts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p.label}
                  onClick={() => send(p.msg)}
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--bg-surface)', cursor: 'pointer',
                    fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Azure badge */}
          <div style={{
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            background: 'rgba(0,120,212,0.08)', border: '1px solid rgba(0,120,212,0.2)',
            fontSize: '0.68rem', color: 'var(--text-muted)',
          }}>
            <div style={{ color: '#0078d4', fontWeight: 700, marginBottom: 4 }}>☁️ Powered by Azure OpenAI</div>
            <div>GPT-4o · Endpoint: projekjudol.openai.azure.com</div>
          </div>
        </div>

        {/* ── Right: Chat window ────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '4px 0 12px',
            display: 'flex', flexDirection: 'column',
          }}>
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-md)',
            borderRadius: 'var(--radius-lg)', padding: '12px 14px',
            display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              className="input"
              placeholder="Tanyakan sesuatu tentang data risiko JudolGuard..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={2}
              style={{
                flex: 1, resize: 'none', lineHeight: 1.5,
                minHeight: 44, maxHeight: 120,
              }}
              disabled={loading}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                className="btn btn-primary"
                style={{ padding: '10px 18px', justifyContent: 'center' }}
                onClick={() => send()}
                disabled={loading || !input.trim()}
              >
                {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '↑ Send'}
              </button>
              <button
                className="btn btn-ghost"
                style={{ padding: '5px 10px', fontSize: '0.65rem', justifyContent: 'center' }}
                onClick={clearChat}
              >
                Clear
              </button>
            </div>
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
            Enter = kirim · Shift+Enter = baris baru · Konteks percakapan: 8 pesan terakhir
          </div>
        </div>
      </div>
    </div>
  )
}
