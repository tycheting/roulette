export function Loading({ text = '讀取中' }) {
  return (
    <div className="py-20 text-center">
      <div className="label animate-pulse">{text}</div>
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-white/15 p-5 text-center">
      <p className="text-sm text-ink_text">{error?.message || '發生未知的錯誤'}</p>
      {onRetry && (
        <button onClick={onRetry} className="cta mt-4">重新載入</button>
      )}
    </div>
  )
}

export function Empty({ title, body }) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-white/12 p-6 text-center">
      <p className="font-num text-lg font-bold">{title}</p>
      {body && <p className="mt-2 text-xs leading-relaxed text-muted">{body}</p>}
    </div>
  )
}
