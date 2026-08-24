import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { Loading, ErrorBox, Empty } from '../components/States'
import { useBootstrap } from '../hooks/useBootstrap'
import { useIdentity } from '../hooks/useIdentity'
import { formatRate } from '../lib/format'

export default function WhoAmI() {
  const { data, error, loading, reload } = useBootstrap()
  const { choose } = useIdentity()
  const navigate = useNavigate()

  if (loading) return <Loading text="讀取名單" />
  if (error) return <ErrorBox error={error} onRetry={reload} />

  const { users, leaderboard } = data
  const statusOf = (name) => {
    const row = leaderboard.find((e) => e.name === name)
    if (!row) return '尚未參賽'
    return `第 ${row.rank} 名 · ${formatRate(row.monthlyRate)} · ${row.dataMonth}`
  }

  const pick = (name) => {
    choose(name)
    navigate('/', { replace: true })
  }

  return (
    <div className="pb-10">
      <h1 className="mt-12 font-num text-[34px] font-bold tracking-[-0.03em]">你是誰？</h1>
      <p className="mb-8 mt-1.5 text-[13px] text-muted">選一次就好，這台裝置會記住你</p>

      {users.length === 0 ? (
        <Empty title="名單還是空的" body="請先到 Google Sheets 的 Users 分頁新增用戶。" />
      ) : (
        <div className="flex flex-col gap-3.5">
          {users.map((u) => (
            <button
              key={u.name}
              onClick={() => pick(u.name)}
              className="stub stub-pick px-5 py-6 text-left"
            >
              <Avatar name={u.name} url={u.avatarUrl} size={60} />
              <div className="min-w-0 flex-1">
                <b className="block font-num text-2xl font-bold tracking-[-0.02em]">{u.name}</b>
                <div className="mt-1.5 font-mono text-[10px] tracking-[0.12em] text-muted">
                  {statusOf(u.name)}
                </div>
              </div>
              <span className="font-num text-xl text-muted" aria-hidden="true">&rarr;</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
