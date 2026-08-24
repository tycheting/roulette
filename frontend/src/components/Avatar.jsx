import { avatarColors, initial } from '../lib/format'

/**
 * 頭像。Users 分頁的「頭像網址」有填就顯示圖片，
 * 沒填就用名字末字生成固定配色的字母頭像。
 */
export default function Avatar({ name, url, size = 60, className = '' }) {
  const [bg, fg] = avatarColors(name || '')
  const style = { width: size, height: size, flex: `0 0 ${size}px` }

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={style}
        className={`rounded-full object-cover border border-white/10 ${className}`}
      />
    )
  }

  return (
    <div
      style={{ ...style, background: bg, color: fg, fontSize: Math.round(size * 0.4) }}
      className={`rounded-full grid place-items-center font-num font-bold ${className}`}
    >
      {initial(name)}
    </div>
  )
}
