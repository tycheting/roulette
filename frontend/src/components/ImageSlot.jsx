/**
 * 圖片佔位。
 * 有 src 就顯示圖，沒有就畫一個標了尺寸的虛線框，
 * 方便日後把圖片放進 public/images/ 再填進來。
 */
export default function ImageSlot({ src, alt = '', ratio = '16 / 9', hint = '圖片', className = '' }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        style={{ aspectRatio: ratio }}
        className={`w-full rounded-xl object-cover border border-white/10 ${className}`}
      />
    )
  }
  return (
    <div style={{ aspectRatio: ratio }} className={`img-slot w-full ${className}`}>
      {hint}
    </div>
  )
}
