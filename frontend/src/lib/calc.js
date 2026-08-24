/**
 * 核心計算 — 純函式，與 GAS 後端 Code.gs 的邏輯一一對應。
 * 後端負責產生排行榜，前端這份用於打卡頁的即時試算，
 * 以及需要在不重新請求 API 的情況下重算的場合。
 */

const round2 = (n) => Math.round(n * 100) / 100

/** 單月加總：把各證券戶的本金與市值加起來 */
export function aggregateMonth(entries) {
  let capital = 0
  let value = 0
  for (const e of entries) {
    capital += Number(e.capital) || 0
    value += Number(e.marketValue ?? e.value) || 0
  }
  const cumPnl = value - capital
  return {
    capital,
    value,
    cumPnl,
    cumRate: capital > 0 ? round2((cumPnl / capital) * 100) : null
  }
}

/**
 * 當期表現：排除加碼干擾。
 * @param current  本期加總結果（aggregateMonth 的輸出）
 * @param previous 上一期有紀錄的加總結果，首次打卡傳 null
 */
export function computeMonthlyPerformance(current, previous) {
  if (!previous) {
    return {
      newCapital: 0,
      monthlyPnl: current.cumPnl,
      monthlyRate: current.capital > 0 ? round2((current.cumPnl / current.capital) * 100) : null
    }
  }
  const newCapital = current.capital - previous.capital
  const monthlyPnl = current.cumPnl - (previous.value - previous.capital)
  const denom = previous.value + newCapital
  return {
    newCapital,
    monthlyPnl,
    monthlyRate: denom > 0 ? round2((monthlyPnl / denom) * 100) : null
  }
}

/** 排序：當期報酬率高者在前，無法計算者殿後 */
export function buildLeaderboard(entries) {
  const sorted = [...entries].sort((a, b) => {
    const ar = a.monthlyRate
    const br = b.monthlyRate
    if (ar === null && br !== null) return 1
    if (br === null && ar !== null) return -1
    if (ar !== br) return br - ar
    if (a.monthlyPnl !== b.monthlyPnl) return b.monthlyPnl - a.monthlyPnl
    if (a.dataMonth !== b.dataMonth) return a.dataMonth < b.dataMonth ? 1 : -1
    return a.name < b.name ? -1 : 1
  })
  return sorted.map((e, i) => ({ ...e, rank: i + 1 }))
}

/**
 * 獎金池：每人以當期損益絕對值的 ratio 出資，第一名整池帶走。
 * poolNet 為正代表可收，為負代表應付。
 */
export function computePrizePool(ranked, ratio = 0.5) {
  const withContribution = ranked.map((e) => ({
    ...e,
    poolContribution: Math.round(Math.abs(e.monthlyPnl) * ratio)
  }))
  const total = withContribution.reduce((sum, e) => sum + e.poolContribution, 0)
  const entries = withContribution.map((e, i) => ({
    ...e,
    poolNet: i === 0 ? total - e.poolContribution : -e.poolContribution
  }))
  return {
    entries,
    total,
    participants: entries.length,
    winner: entries.length ? entries[0].name : null,
    ratio
  }
}

/** 打卡表單的即時試算 */
export function previewCheckin(entries, previous) {
  const current = aggregateMonth(entries)
  const perf = computeMonthlyPerformance(current, previous)
  return { ...current, ...perf }
}

/** 本金只允許加碼：回傳違規的證券戶名稱清單 */
export function findCapitalViolations(entries, previousAccounts) {
  if (!previousAccounts) return []
  return entries
    .filter((e) => {
      const before = previousAccounts[e.account]
      return before && Number(e.capital) < Number(before.capital)
    })
    .map((e) => e.account)
}
