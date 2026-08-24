import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loading, ErrorBox } from '../components/States'
import { useIdentity } from '../hooks/useIdentity'
import { fetchDetail, submitCheckin } from '../api/gasClient'
import { previewCheckin, findCapitalViolations } from '../lib/calc'
import { formatMoney, formatSigned, formatRate, toneClass, digitsOnly, groupDigits } from '../lib/format'

export default function Checkin() {
  const { identity } = useIdentity()
  const navigate = useNavigate()

  const [detail, setDetail] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchDetail(identity)
      .then((d) => {
        if (!alive) return
        setDetail(d)
        const seed = {}
        d.user.accounts.forEach((acc) => {
          const filled = d.current?.accounts?.[acc]
          const prev = d.previous?.accounts?.[acc]
          seed[acc] = {
            capital: filled ? String(filled.capital) : prev ? String(prev.capital) : '',
            marketValue: filled ? String(filled.value) : ''
          }
        })
        setForm(seed)
      })
      .catch((err) => alive && setError(err))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [identity])

  const entries = useMemo(() => {
    if (!detail) return []
    return detail.user.accounts.map((acc) => ({
      account: acc,
      capital: Number(digitsOnly(form[acc]?.capital ?? '')) || 0,
      marketValue: Number(digitsOnly(form[acc]?.marketValue ?? '')) || 0
    }))
  }, [detail, form])

  const preview = useMemo(
    () => previewCheckin(entries, detail?.previous || null),
    [entries, detail]
  )

  const violations = useMemo(
    () => findCapitalViolations(entries, detail?.previous?.accounts),
    [entries, detail]
  )

  const allFilled = detail
    ? detail.user.accounts.every((acc) =>
        digitsOnly(form[acc]?.capital ?? '') !== '' &&
        digitsOnly(form[acc]?.marketValue ?? '') !== '')
    : false

  if (loading) return <Loading text="讀取你的資料" />
  if (error) return <ErrorBox error={error} onRetry={() => window.location.reload()} />

  const { settings, user } = detail
  const isOpen = settings.checkinOpen
  const alreadyFilled = Boolean(detail.current)

  const setField = (acc, key, raw) => {
    setForm((f) => ({ ...f, [acc]: { ...f[acc], [key]: digitsOnly(raw) } }))
    setSubmitError(null)
  }

  const onSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await submitCheckin({ user: user.name, month: settings.currentMonth, entries })
      navigate('/', { replace: true })
    } catch (err) {
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pb-16">
      <header className="mb-7 mt-1.5">
        <h1 className="font-num text-[26px] font-bold tracking-[-0.02em]">
          {settings.currentMonth} 打卡
        </h1>
        <p className="mt-2 text-xs text-muted">
          {user.name} · {user.accounts.length} 個證券戶 &nbsp;·&nbsp;
          <Link to="/who" className="border-b border-dashed border-violet-soft/40 text-violet-soft">
            不是我？
          </Link>
        </p>
      </header>

      {!isOpen && (
        <div className="mb-6 rounded-xl border border-dashed border-white/18 p-4 text-center text-xs leading-relaxed text-muted">
          目前非打卡時間
          <br />管理員開放後這裡會亮起來
        </div>
      )}

      {user.accounts.map((acc, i) => {
        const prev = detail.previous?.accounts?.[acc]
        const violated = violations.includes(acc)
        return (
          <div key={acc} className="mb-3 rounded-2xl border border-white/5 bg-ink-800 p-[18px]">
            <div className="mb-4 flex items-center justify-between">
              <b className="text-sm font-medium tracking-wide">{acc}</b>
              <span className="label">
                {String(i + 1).padStart(2, '0')} / {String(user.accounts.length).padStart(2, '0')}
              </span>
            </div>

            <div className="mb-3.5">
              <div className="label">總本金</div>
              <input
                className="field-input"
                inputMode="numeric"
                disabled={!isOpen}
                value={groupDigits(form[acc]?.capital ?? '')}
                onChange={(e) => setField(acc, 'capital', e.target.value)}
                placeholder="0"
              />
              {prev && (
                <div className={`mt-1.5 font-mono text-[10px] tracking-wide ${violated ? 'text-gain' : 'text-muted'}`}>
                  {violated
                    ? `不得低於上期的 ${formatMoney(prev.capital)}`
                    : `上期 ${formatMoney(prev.capital)} · 只能增加`}
                </div>
              )}
            </div>

            <div>
              <div className="label">總市值</div>
              <input
                className="field-input"
                inputMode="numeric"
                disabled={!isOpen}
                value={groupDigits(form[acc]?.marketValue ?? '')}
                onChange={(e) => setField(acc, 'marketValue', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        )
      })}

      <div className="mt-[18px] rounded-2xl bg-ink-700 p-[18px]">
        <Row label="總本金" value={formatMoney(preview.capital)} />
        <Row label="總市值" value={formatMoney(preview.value)} />
        <Row label="累計報酬率" value={formatRate(preview.cumRate)} tone={preview.cumRate} />
        <div className="mt-2 border-t border-dashed border-white/15 pt-3.5">
          <Row label="本期損益" value={formatSigned(preview.monthlyPnl)} tone={preview.monthlyPnl} big />
        </div>
        <Row label="本期報酬率" value={formatRate(preview.monthlyRate)} tone={preview.monthlyRate} />
        {preview.newCapital > 0 && (
          <Row label="本期加碼" value={formatMoney(preview.newCapital)} />
        )}
      </div>

      {submitError && (
        <p className="mt-4 text-center text-xs text-gain">{submitError.message}</p>
      )}

      <button
        className="cta mt-5"
        disabled={!isOpen || submitting || !allFilled || violations.length > 0}
        onClick={onSubmit}
      >
        {submitting ? '送出中' : alreadyFilled ? '更新本期紀錄' : '送出本期紀錄'}
      </button>

      {isOpen && !allFilled && (
        <p className="mt-3 text-center text-[11px] text-muted">每個證券戶的本金與市值都要填</p>
      )}
    </div>
  )
}

function Row({ label, value, tone, big }) {
  return (
    <div className="flex items-baseline justify-between py-[7px]">
      <span className="label">{label}</span>
      <span className={`num font-medium ${big ? 'text-2xl font-bold tracking-[-0.02em]' : 'text-[15px]'} ${tone !== undefined ? toneClass(tone) : ''}`}>
        {value}
      </span>
    </div>
  )
}
