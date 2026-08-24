import { useRef } from 'react'

/**
 * 票券外框。桌機用 hover 觸發 3D 傾斜，
 * 手機沒有 hover，改成按住時套用同一組 transform。
 */
export default function Ticket({ children, className = '' }) {
  const ref = useRef(null)
  const on = () => ref.current?.classList.add('is-active')
  const off = () => ref.current?.classList.remove('is-active')

  return (
    <div className={`ticket-wrap ${className}`}>
      <div
        ref={ref}
        className="ticket"
        tabIndex={0}
        onTouchStart={on}
        onTouchEnd={off}
        onTouchCancel={off}
        onFocus={on}
        onBlur={off}
      >
        {children}
      </div>
    </div>
  )
}

export function Perforation() {
  return <div className="perf"><span /></div>
}
