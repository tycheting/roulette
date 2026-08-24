import { Link, useNavigate } from 'react-router-dom'
import Ticket, { Perforation } from '../components/Ticket'
import Barcode from '../components/Barcode'
import Avatar from '../components/Avatar'
import ImageSlot from '../components/ImageSlot'
import { Loading, ErrorBox, Empty } from '../components/States'
import { useBootstrap } from '../hooks/useBootstrap'
import { useIdentity } from '../hooks/useIdentity'
import {
  formatMoney, formatSigned, formatRate, toneClass, daysLeft, monthGap
} from '../lib/format'

export default function Dashboard() {
  const { data, error, loading, reload } = useBootstrap()
  const { identity } = useIdentity()
  const navigate = useNavigate()

  if (loading) return <Loading text="讀取排行榜" />
  if (error) return <ErrorBox error={error} onRetry={reload} />

  const { settings, leaderboard, notCheckedIn, prizePool, users } = data
  const days = daysLeft(settings.endDate)
  const me = leaderboard.find((e) => e.name === identity)
  const myUser = users.find((u) => u.name === identity)
  const alreadyChecked = me && me.dataMonth === settings.currentMonth

  return (
    <div className="pb-28">
      <header className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold tracking-wide">{settings.competitionName}</h1>
          <p className="mt-0.5 text-[11px] text-muted">
            {days === 0
              ? '競賽已結束'
              : <>距結束 <span className="num font-bold text-ink_text">{days}</span> 天</>}
          </p>
        </div>
        <button onClick={() => navigate('/who')} aria-label="切換身分">
          <Avatar name={identity} url={myUser?.avatarUrl} size={38} />
        </button>
      </header>

      {/* 選填：Settings 分頁填入「首頁橫幅圖網址」後這裡會顯示圖片 */}
      {settings.bannerImage && (
        <ImageSlot src={settings.bannerImage} alt="競賽橫幅" className="mb-6" />
      )}

      <Ticket>
        <div className="ticket-top">
          <div className="mb-5 flex items-center justify-between">
            <span className="label">獎金池</span>
            <span className="pop-3 rounded-full border border-violet px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-violet-soft">
              Live
            </span>
          </div>

          <div
            className="pop-1 num text-[56px] font-bold leading-[0.95] tracking-[-0.035em]"
            style={{ textShadow: '0 0 26px rgba(124,58,237,.45)' }}
          >
            <small className="mr-1.5 text-[22px] font-medium text-muted" style={{ textShadow: 'none' }}>NT$</small>
            {formatMoney(prizePool.total)}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted">
            每人以最新一筆的當期損益，取絕對值的 {Math.round(prizePool.ratio * 100)}% 出資
            <br />第一名整池帶走
          </p>

          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <div className="label">參賽人數</div>
              <div className="num mt-1 text-[17px] font-medium">{prizePool.participants} 人</div>
            </div>
            <div>
              <div className="label">目前領先</div>
              <div className="num mt-1 text-[17px] font-medium">{prizePool.winner || '—'}</div>
            </div>
          </div>
        </div>

        <Perforation />

        <div className="ticket-bottom">
          <div className="label mb-2.5">
            {me ? (me.poolNet >= 0 ? '你的預估淨得' : '你的預估應付') : '選定身分後顯示你的收付'}
          </div>
          <div className="flex items-end justify-between">
            <div className={`pop-2 num text-[30px] font-bold leading-none tracking-[-0.03em] ${me ? toneClass(me.poolNet) : 'text-muted'}`}>
              {me ? formatSigned(me.poolNet) : '—'}
            </div>
            {me && <Barcode history={me.history} />}
          </div>
          <div className="mt-4 font-mono text-[11px] tracking-[0.14em] text-muted">
            {me
              ? `${me.dataMonth} · ${me.name} · ${me.history.length} 期紀錄`
              : `${settings.currentMonth} · 尚未選定身分`}
          </div>
        </div>
      </Ticket>

      <div className="mb-3.5 mt-8 flex items-baseline justify-between">
        <span className="label">排行榜 · 當期報酬率</span>
        <span className="label opacity-60">{leaderboard.length} 人</span>
      </div>

      {leaderboard.length === 0 ? (
        <Empty title="還沒有人打卡" body="等第一筆紀錄進來，排行榜就會出現。" />
      ) : (
        leaderboard.map((row) => (
          <StubRow
            key={row.name}
            row={row}
            isMe={row.name === identity}
            currentMonth={settings.currentMonth}
          />
        ))
      )}

      {notCheckedIn.length > 0 && (
        <div className="mt-7">
          <div className="label mb-2.5">尚未參賽</div>
          <div className="flex flex-wrap gap-2">
            {notCheckedIn.map((n) => (
              <span key={n} className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-muted">{n}</span>
            ))}
          </div>
        </div>
      )}

      {settings.checkinOpen && days !== 0 && myUser && (
        <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-ink-900 via-ink-900/95 to-transparent px-5 pb-6 pt-8">
          <Link to="/checkin" className="cta block text-center">
            {alreadyChecked ? '更新我的紀錄' : '立即打卡'}
          </Link>
        </div>
      )}
    </div>
  )
}

function StubRow({ row, isMe, currentMonth }) {
  const gap = monthGap(currentMonth, row.dataMonth)
  return (
    <div className={`stub stub-hover mb-2.5 py-4 pl-6 pr-4 ${isMe ? 'stub-me' : ''} ${row.isStale ? 'opacity-60' : ''}`}>
      <div className={`num min-w-[44px] text-[30px] font-bold tracking-[-0.04em] ${row.rank === 1 ? 'text-violet-soft' : ''}`}
           style={row.rank === 1 ? { textShadow: '0 0 18px rgba(124,58,237,.45)' } : undefined}>
        {String(row.rank).padStart(2, '0')}
      </div>
      <div className="min-w-0 flex-1">
        <b className="block text-[15px] font-medium">{row.name}</b>
        <div className={`mt-1 font-mono text-[10px] tracking-[0.1em] ${row.isStale ? 'text-stale' : 'text-muted'}`}>
          {row.dataMonth}{row.isStale && gap > 0 ? ` · 落後 ${gap} 期` : ''}
        </div>
      </div>
      <div className="text-right">
        <div className={`num text-[20px] font-bold ${toneClass(row.monthlyRate)}`}>
          {formatRate(row.monthlyRate)}
        </div>
        <div className="num mt-0.5 text-xs text-muted">{formatSigned(row.monthlyPnl)}</div>
      </div>
    </div>
  )
}
