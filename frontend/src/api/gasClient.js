/**
 * Google Apps Script API 客戶端。
 *
 * POST 一律用 text/plain 送 JSON 字串：GAS 網頁應用程式無法回應
 * CORS preflight，用 application/json 會被瀏覽器擋下。
 */

const BASE = import.meta.env.VITE_GAS_API_URL

const ERROR_MESSAGES = {
  CLOSED: '目前非打卡時間',
  COMPETITION_ENDED: '競賽已結束',
  MONTH_MISMATCH: '這期收的不是這個月份的資料',
  USER_NOT_FOUND: '查無此用戶，或帳號已停用',
  ACCOUNT_MISMATCH: '證券戶清單對不上，重新整理再試一次',
  INVALID_NUMBER: '金額必須是 0 以上的整數',
  CAPITAL_DECREASED: '本金不得低於上期',
  BUSY: '有人正在送出，稍等幾秒再按一次',
  SERVER_ERROR: '伺服器出了問題',
  NETWORK: '連不上伺服器，檢查網路後再試一次'
}

export class ApiError extends Error {
  constructor(code, message) {
    super(message || ERROR_MESSAGES[code] || '發生未知的錯誤')
    this.code = code
  }
}

function assertConfigured() {
  if (!BASE) {
    throw new ApiError('SERVER_ERROR', '尚未設定 VITE_GAS_API_URL，請看 README 的部署步驟')
  }
}

async function unwrap(res) {
  let json
  try {
    json = await res.json()
  } catch {
    throw new ApiError('SERVER_ERROR', '伺服器回應格式不正確')
  }
  if (!json.ok) {
    throw new ApiError(json.error?.code || 'SERVER_ERROR', json.error?.message)
  }
  return json.data
}

async function withTimeout(promise, ms = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await promise(controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchBootstrap() {
  assertConfigured()
  try {
    const res = await withTimeout((signal) =>
      fetch(`${BASE}?action=bootstrap&t=${Date.now()}`, { signal })
    )
    return await unwrap(res)
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError('NETWORK')
  }
}

export async function fetchDetail(user) {
  assertConfigured()
  try {
    const res = await withTimeout((signal) =>
      fetch(`${BASE}?action=detail&user=${encodeURIComponent(user)}&t=${Date.now()}`, { signal })
    )
    return await unwrap(res)
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError('NETWORK')
  }
}

export async function submitCheckin({ user, month, entries }) {
  assertConfigured()
  try {
    const res = await withTimeout((signal) =>
      fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'checkin', user, month, entries, source: 'web' }),
        redirect: 'follow',
        signal
      })
    , 20000)
    return await unwrap(res)
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError('NETWORK')
  }
}
