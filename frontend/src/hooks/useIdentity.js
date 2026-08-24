import { useCallback, useEffect, useState } from 'react'

const KEY = 'invest-checkin:identity'

/**
 * 記住「我是誰」。純為便利性，不具驗證效力。
 * 無痕模式或清除快取後會回到身分選擇頁，這是預期行為。
 */
export function useIdentity() {
  const [identity, setIdentity] = useState(() => {
    try {
      return localStorage.getItem(KEY) || null
    } catch {
      return null
    }
  })

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setIdentity(e.newValue)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const choose = useCallback((name) => {
    try {
      localStorage.setItem(KEY, name)
    } catch { /* 無痕模式寫入失敗時仍讓本次工作階段可用 */ }
    setIdentity(name)
  }, [])

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(KEY)
    } catch { /* 同上 */ }
    setIdentity(null)
  }, [])

  return { identity, choose, clear }
}
