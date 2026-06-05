/**
 * api.js — Semua fungsi fetch ke FastAPI JudolGuard
 * ===================================================
 * Ganti BASE_URL ke URL Render/Railway saat deploy production.
 * Saat dev, Vite proxy /api/* → localhost:8000 otomatis.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'https://gevvynta-judolguard2.hf.space'

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Health Check ─────────────────────────────────────────────
export const healthCheck = () => request('/api/health')

// ── 1. Dashboard Summary ──────────────────────────────────────
export const getDashboardSummary = () => request('/api/dashboard-summary')

// ── 2. All Accounts ───────────────────────────────────────────
export const getAccounts = ({ level, profile, limit = 100, offset = 0 } = {}) => {
  const params = new URLSearchParams()
  if (level)   params.set('level', level)
  if (profile) params.set('profile', profile)
  params.set('limit', limit)
  params.set('offset', offset)
  return request(`/api/accounts?${params}`)
}

// ── 3. Account Detail ─────────────────────────────────────────
export const getAccountDetail = (accountId) =>
  request(`/api/accounts/${encodeURIComponent(accountId)}`)

// ── 4. Recalculate Scores ─────────────────────────────────────
export const recalculateScores = (weights) =>
  request('/api/recalculate', {
    method: 'POST',
    body: JSON.stringify(weights),
  })

// ── 5. Network Graph ──────────────────────────────────────────
export const getNetworkGraph = (accountId) =>
  request(`/api/network/${encodeURIComponent(accountId)}`)

// ── 6. Predict Transaction ────────────────────────────────────
export const predictTransaction = (payload) =>
  request('/api/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

// ── 7. AI Co-Pilot ────────────────────────────────────────────
// Persona context dikirim sebagai history pertama — tidak muncul di UI
const JUGU_PERSONA = {
  role: 'assistant',
  content: 'Aku Jugu, AI analyst spesialis fraud detection dan keuangan digital. Aku berkomunikasi seperti teman — menyebut diri sendiri dengan "aku" secara default. Kalau user pakai kata "gue/lo", aku ikut pakai "gue/lo". Kalau user pakai "saya/anda", aku pakai "saya". Aku fokus pada analisis risiko, deteksi fraud, dan kepatuhan regulasi PPATK/OJK.'
}

export const sendCopilotMessage = async ({ message, account_id, conversation, adjustedData, networkData }) => {
  // Selalu sisipkan persona context di awal conversation history
  const enrichedConversation = [JUGU_PERSONA, ...(conversation || [])]

  // Kirim adjusted_context jika user sudah apply parameter weights
  const adjusted_context = adjustedData
    ? { summary: adjustedData.summary }
    : null

  // Kirim network_context jika user sedang buka NetworkGraph
  const network_context = networkData
    ? { 
        account_id: networkData.account_id, 
        risk_score: networkData.risk_score, 
        archetype: networkData.archetype, 
        network_size: networkData.network_size,
        mule_count: networkData.nodes?.filter(n => n.type === 'mule').length || 0,
        collector_count: networkData.nodes?.filter(n => n.type === 'collector').length || 0,
      }
    : null

  const res = await request('/api/copilot', {
    method: 'POST',
    body: JSON.stringify({ message, account_id, conversation: enrichedConversation, adjusted_context, network_context }),
  })
  // Strip semua template label [CAPS] di mana saja dalam teks
  // Contoh: [ANALISIS], [INDIKATOR UTAMA], [TINDAKAN], [OVERVIEW], [SOLUSI], dll.
  if (res?.reply) {
    res.reply = res.reply
      .replace(/\[[A-Z][A-Z\s]{1,30}\]\s*/g, '')  // hapus semua [CAPS LABEL]
      .replace(/\n{3,}/g, '\n\n')                   // rapikan spasi berlebih
      .trim()
  }
  return res
}


// ── 8. ETL Simulate (SSE) ─────────────────────────────────────
// Mengembalikan EventSource — caller harus listen onmessage + onerror + onclose
export const createETLStream = () =>
  new EventSource(`${BASE_URL}/api/etl-simulate`)

// ── 9. EDA Summary ────────────────────────────────────────────
export const getEDASummary = () => request('/api/eda-summary')

// ── 10. Model Metrics ─────────────────────────────────────────
export const getModelMetrics = () => request('/api/model-metrics')

// ── 11. Azure Proof ───────────────────────────────────────────
export const getAzureProof = () => request('/api/azure-proof')

// ── 12. Strategic Insights ────────────────────────────────────
export const getStrategicInsights = () => request('/api/strategic-insights')
