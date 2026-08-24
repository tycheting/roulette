import { toneClass } from '../lib/format'

/**
 * 條碼即績效。
 * 遠看是票券上的條碼，實際每根長條是一期的報酬率：
 * 向上為漲（紅），向下為跌（綠），高度對應幅度。
 */
export default function Barcode({ history = [], max = 10, height = 44 }) {
  const bars = history.slice(-max)
  if (!bars.length) {
    return <div className="label">尚無歷史</div>
  }

  const peak = Math.max(...bars.map((b) => Math.abs(b.monthlyRate ?? 0)), 1)
  const half = height / 2

  return (
    <div className="flex items-center gap-[3px]" style={{ height }} aria-hidden="true">
      {bars.map((b) => {
        const rate = b.monthlyRate ?? 0
        const h = Math.max(3, Math.round((Math.abs(rate) / peak) * (half - 4)))
        const up = rate >= 0
        return (
          <span
            key={b.month}
            title={`${b.month} ${rate.toFixed(2)}%`}
            className={`block w-[4px] rounded-[1px] ${up ? 'bg-gain self-start' : 'bg-loss self-end'}`}
            style={{ height: h, [up ? 'marginTop' : 'marginBottom']: half }}
          />
        )
      })}
    </div>
  )
}

export { toneClass }
