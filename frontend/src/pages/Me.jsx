import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { Loading, ErrorBox, Empty } from '../components/States'
import { useIdentity } from '../hooks/useIdentity'
import { fetchDetail } from '../api/gasClient'
import { formatMoney, formatSigned, formatRate, toneClass } from '../lib/format'

export default function Me() {
  const { identity } = useIdentity()
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchDetail(identity)
      .then((d) => alive && setDetail(d))
      .catch((err) => alive && setError(err))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [identity])

  if (loading) return <Loading text="讀取你的歷史" />
  if (error) return <ErrorBox error={error} onRetry={() => window.location.reload()} />

  const { user, series } = detail
  const last = series[series.length - 1]

  return (
    <div className="pb-16">
      <header className="mb-8 mt-1.5 flex items-center gap-4">
        <Avatar name={user.name} url={user.avatarUrl} size={52} />
        <div className="flex-1">
          <h1 className="font-num text-2xl font-bold tracking-[-0.02em]">{user.name}</h1>
          <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-muted">
            {series.length} 期紀錄 · {user.accounts.join(' / ')}
          </p>
        </div>
        <Link to="/who" className="label border-b border-dashed border-white/20 pb-0.5">切換</Link>
      </header>

      {series.length === 0 ? (
        <Empty title="還沒有紀錄" body="等打卡開放後送出第一筆，這裡就會有東西。" />
      ) : (
        <>
          <div className="mb-7 grid grid-cols-2 gap-3">
            <Stat label="總本金" value={formatMoney(last.capital)} />
            <Stat label="總市值" value={formatMoney(last.value)} />
            <Stat label="累計損益" value={formatSigned(last.cumPnl)} tone={last.cumPnl} />
            <Stat label="累計報酬率" value={formatRate(last.cumRate)} tone={last.cumRate} />
          </div>

          <div className="label mb-3">逐期報酬率</div>
          <RateChart series={series} />

          <div className="label mb-3 mt-8">歷史明細</div>
          <div className="space-y-2.5">
            {[...series].reverse().map((s) => (
              <details key={s.month} className="rounded-xl border border-white/5 bg-ink-800 px-[18px] py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <span className="font-mono text-[11px] tracking-[0.12em] text-muted">{s.month}</span>
                  <span className="flex items-baseline gap-3">
                    <span className={`num text-[15px] ${toneClass(s.monthlyPnl)}`}>{formatSigned(s.monthlyPnl)}</span>
                    <span className={`num text-lg font-bold ${toneClass(s.monthlyRate)}`}>{formatRate(s.monthlyRate)}</span>
                  </span>
                </summary>
                <div className="mt-4 border-t border-dashed border-white/10 pt-3.5">
                  {Object.entries(s.accounts).map(([name, a]) => (
                    <div key={name} className="flex items-baseline justify-between py-1.5">
                      <span className="text-xs text-muted">{name}</span>
                      <span className="num text-xs">
                        {formatMoney(a.capital)} → {formatMoney(a.value)}
                      </span>
                    </div>
                  ))}
                  {s.newCapital > 0 && (
                    <div className="mt-2 font-mono text-[10px] tracking-wide text-muted">
                      本期加碼 {formatMoney(s.newCapital)}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl bg-ink-800 p-4">
      <div className="label">{label}</div>
      <div className={`num mt-1.5 text-lg font-bold tracking-[-0.02em] ${tone !== undefined ? toneClass(tone) : ''}`}>
        {value}
      </div>
    </div>
  )
}

/** 逐期報酬率長條圖，沿用票券上的條碼語彙但放大 */
function RateChart({ series }) {
  const peak = Math.max(...series.map((s) => Math.abs(s.monthlyRate ?? 0)), 1)
  return (
    <div className="rounded-xl bg-ink-800 p-4">
      <div className="flex h-32 items-center gap-1.5">
        {series.map((s) => {
          const rate = s.monthlyRate ?? 0
          const h = Math.max(4, Math.round((Math.abs(rate) / peak) * 56))
          const up = rate >= 0
          return (
            <div key={s.month} className="flex flex-1 flex-col items-center" title={`${s.month} ${formatRate(s.monthlyRate)}`}>
              <div className="flex h-14 w-full items-end justify-center">
                {up && <div className="w-full max-w-[18px] rounded-sm bg-gain" style={{ height: h }} />}
              </div>
              <div className="h-px w-full bg-white/10" />
              <div className="flex h-14 w-full items-start justify-center">
                {!up && <div className="w-full max-w-[18px] rounded-sm bg-loss" style={{ height: h }} />}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        {series.map((s) => (
          <div key={s.month} className="flex-1 text-center font-mono text-[9px] text-muted">
            {s.month.slice(5)}
          </div>
        ))}
      </div>
    </div>
  )
}
