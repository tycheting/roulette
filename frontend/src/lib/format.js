/** 數字與文字格式化工具 */

export function formatMoney(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Math.round(n).toLocaleString('zh-TW')
}

/** 帶正負號的金額，例如 +20,000 / −5,000 */
export function formatSigned(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const v = Math.round(n)
  if (v > 0) return '+' + v.toLocaleString('zh-TW')
  if (v < 0) return '\u2212' + Math.abs(v).toLocaleString('zh-TW')
  return '0'
}

/** 帶正負號的百分比，例如 +1.25% */
export function formatRate(r) {
  if (r === null || r === undefined || Number.isNaN(r)) return '—'
  const v = Number(r).toFixed(2)
  if (Number(r) > 0) return '+' + v + '%'
  if (Number(r) < 0) return '\u2212' + Math.abs(Number(r)).toFixed(2) + '%'
  return '0.00%'
}

/** 漲跌配色：台股慣例，紅漲綠跌 */
export function toneClass(n) {
  if (n === null || n === undefined || Number.isNaN(n) || n === 0) return 'text-ink_text'
  return n > 0 ? 'text-gain' : 'text-loss'
}

/** 輸入框用的千分位字串 <-> 數字 */
export function digitsOnly(s) {
  return String(s).replace(/[^\d]/g, '')
}

export function groupDigits(s) {
  const d = digitsOnly(s)
  if (d === '') return ''
  return Number(d).toLocaleString('zh-TW')
}

/** 距離結束日還有幾天（台北時區，含當天） */
export function daysLeft(endDate) {
  if (!endDate) return null
  const end = new Date(endDate + 'T23:59:59+08:00').getTime()
  const diff = end - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

/** 2026-08 與 2026-06 相差幾期 */
export function monthGap(a, b) {
  if (!a || !b) return 0
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return (ay * 12 + am) - (by * 12 + bm)
}

/** 由名字產生固定的頭像配色 */
const PALETTE = [
  ['#3b2a63', '#c4b5fd'],
  ['#1e3a4f', '#7dd3fc'],
  ['#4a2438', '#f9a8d4'],
  ['#3d3a1e', '#fde047'],
  ['#1e4038', '#6ee7b7'],
  ['#3f2a1e', '#fdba74']
]

export function avatarColors(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function initial(name) {
  return name ? name.slice(-1) : '?'
}
