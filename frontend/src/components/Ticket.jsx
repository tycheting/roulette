import { useRef } from 'react'

export default function Ticket({ children, className = '' }) {
  const ref = useRef(null)
  const touch = useRef(null)

  const on = () => ref.current?.classList.add('is-active')
  const off = () => ref.current?.classList.remove('is-active')

  const handleStart = (e) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY, cancelled: false }
    // 等 120ms，確認手指沒在捲動才翻
    touch.current.timer = setTimeout(() => {
      if (touch.current && !touch.current.cancelled) on()
    }, 120)
  }

  const handleMove = (e) => {
    const s = touch.current
    if (!s || s.cancelled) return
    const t = e.touches[0]
    if (Math.abs(t.clientX - s.x) + Math.abs(t.clientY - s.y) > 8) {
      s.cancelled = true
      clearTimeout(s.timer)
      off()
    }
  }

  const handleEnd = () => {
    const s = touch.current
    touch.current = null
    if (!s) return
    clearTimeout(s.timer)
    if (s.cancelled) { off(); return }
    on()
    setTimeout(off, 700)   // 快速輕點也看得到，停 0.7 秒再收
  }

  return (
    <div className={`ticket-wrap ${className}`}>
      <div
        ref={ref}
        className="ticket"
        tabIndex={0}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        onFocus={on}
        onBlur={off}
      >
        {children}
      </div>
    </div>
  )
}
