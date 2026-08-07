import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/AppFrame'
import { InfoGrid } from '../components/InfoGrid'
import { yen } from '../lib/settle'
import { effectiveAnswer, feeFor, rosterNote, useShioriState } from '../lib/store'
import { nextEvent, shortDateLabel, useNow } from '../lib/time'
import type { Member, Shiori } from '../lib/types'

/** 名簿非公開モードの入口: 名前+電話下4桁で照合(一覧は見せない) */
function PrivateWhoGate({
  shiori,
  onMatch,
}: {
  shiori: Shiori
  onMatch: (memberId: string) => void
}) {
  const [name, setName] = useState('')
  const [digits, setDigits] = useState('')
  const [error, setError] = useState(false)
  const operatorContact = shiori.operator?.tel
    ? `${shiori.operator.name}(${shiori.operator.tel.display})`
    : '催行会社'

  const submit = () => {
    const n = name.trim()
    const d = digits.replace(/\D/g, '')
    const hit = shiori.members.find((m) => {
      if (m.name !== n) return false
      const l4 = m.tel?.href.replace(/\D/g, '').slice(-4)
      return l4 ? l4 === d : d === '' // 電話未登録のお客様は名前のみ
    })
    if (hit) onMatch(hit.id)
    else setError(true)
  }

  return (
    <AppFrame shiori={shiori}>
      <div style={{ padding: '18px 20px 0' }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 23, fontWeight: 600 }}>
          ご予約の確認
        </h1>
        <p style={{ margin: '7px 0 0', fontSize: 14.5, lineHeight: 1.65, color: 'var(--sub)' }}>
          ご予約確認メールに記載の個別リンク(QRコード)からお開きください。
          リンクがお手元にない場合は、ご予約のお名前と電話番号の下4桁でご確認いただけます。
        </p>
      </div>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div className="input-label">ご予約のお名前(姓)</div>
          <input className="text-input" value={name} onChange={(e) => { setName(e.target.value); setError(false) }} />
        </div>
        <div>
          <div className="input-label">電話番号の下4桁</div>
          <input
            className="text-input"
            inputMode="numeric"
            maxLength={4}
            value={digits}
            onChange={(e) => { setDigits(e.target.value); setError(false) }}
          />
        </div>
        {error && (
          <div className="note-l warn" style={{ color: 'var(--warn)' }}>
            見つかりませんでした。{operatorContact}へご連絡ください。
          </div>
        )}
        <button className="btn sm" onClick={submit}>
          確認して開く
        </button>
      </div>
    </AppFrame>
  )
}

function fmtStamp(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

const last4 = (m: Member) => m.tel?.href.replace(/\D/g, '').slice(-4)

/* ---------- 03 本人選択(ログインの代わり) ---------- */
export function RsvpWho({ shiori }: { shiori: Shiori }) {
  const [state, update] = useShioriState(shiori)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<Member | null>(null) // 下4桁の照合待ち
  const [digits, setDigits] = useState('')
  const [verifyError, setVerifyError] = useState(false)
  const isTour = shiori.kind === 'tour'
  const security = shiori.security ?? {}
  const organizer = shiori.contacts.find((c) => c.label === '幹事')

  const proceed = (memberId: string) => {
    update({ memberId })
    if (isTour) {
      navigate(`/s/${shiori.slug}`)
      return
    }
    const answered = effectiveAnswer(shiori, state, memberId)
    navigate(answered ? `/s/${shiori.slug}` : `/s/${shiori.slug}/rsvp`)
  }

  const choose = (memberId: string) => {
    const m = shiori.members.find((x) => x.id === memberId)
    if (!m) return
    // ツアーで本人照合が有効かつ電話番号の登録がある場合は下4桁を確認
    if (isTour && security.requireVerify && last4(m)) {
      setPending(m)
      setDigits('')
      setVerifyError(false)
      return
    }
    proceed(memberId)
  }

  const verify = () => {
    if (!pending) return
    if (digits.replace(/\D/g, '') === last4(pending)) {
      proceed(pending.id)
    } else {
      setVerifyError(true)
    }
  }

  const operatorContact = shiori.operator?.tel
    ? `${shiori.operator.name}(${shiori.operator.tel.display})`
    : '催行会社'

  // 照合ステップ
  if (pending) {
    return (
      <AppFrame shiori={shiori}>
        <div style={{ padding: '18px 20px 0' }}>
          <h1 className="serif" style={{ margin: 0, fontSize: 23, fontWeight: 600 }}>
            ご本人確認
          </h1>
          <p style={{ margin: '7px 0 0', fontSize: 14.5, lineHeight: 1.65, color: 'var(--sub)' }}>
            <strong>{pending.name}</strong> 様ですね。なりすまし防止のため、
            ご予約時の電話番号の<strong>下4桁</strong>を入力してください。
          </p>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            className="text-input"
            inputMode="numeric"
            maxLength={4}
            placeholder="0000"
            value={digits}
            onChange={(e) => {
              setDigits(e.target.value)
              setVerifyError(false)
            }}
            style={{ fontSize: 22, textAlign: 'center', letterSpacing: '0.3em' }}
          />
          {verifyError && (
            <div className="note-l warn" style={{ color: 'var(--warn)' }}>
              一致しませんでした。ご予約時の電話番号をお確かめください。
              ご不明な場合は{operatorContact}へご連絡ください。
            </div>
          )}
          <button className="btn sm" onClick={verify}>
            確認して開く
          </button>
          <button className="btn-ghost" onClick={() => setPending(null)}>
            名簿にもどる
          </button>
        </div>
      </AppFrame>
    )
  }

  // 名簿非公開モード: 一覧を出さず、名前+下4桁で照合
  if (isTour && security.privateRoster) {
    return <PrivateWhoGate shiori={shiori} onMatch={(id) => proceed(id)} />
  }

  const members = query.trim()
    ? shiori.members.filter((m) => m.name.includes(query.trim()))
    : shiori.members

  const contactNote = isTour
    ? shiori.operator?.tel
      ? `お名前が見つからない場合は${shiori.operator.name}(${shiori.operator.tel.display})までご連絡ください。`
      : 'お名前が見つからない場合は催行会社までご連絡ください。'
    : `名前がない場合は幹事${organizer?.tel ? `(${organizer.name} ${organizer.tel.display})` : ''}までご連絡ください。`

  return (
    <AppFrame shiori={shiori}>
      <div style={{ padding: '18px 20px 0' }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 23, fontWeight: 600 }}>
          {isTour ? 'ご予約のお名前をお選びください' : 'あなたは どなたですか？'}
        </h1>
        <p style={{ margin: '7px 0 0', fontSize: 14.5, lineHeight: 1.65, color: 'var(--sub)' }}>
          名簿からお名前を選んでください。登録やログインは不要です。{contactNote}
        </p>
      </div>
      {shiori.members.length > 12 && (
        <div style={{ margin: '14px 20px 0' }}>
          <input
            className="text-input"
            placeholder="お名前で検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}
      <div style={{ margin: '14px 20px 24px' }} className="roster">
        {members.map((m) => (
          <button key={m.id} onClick={() => choose(m.id)}>
            <span>{m.name}</span>
            <span className="note tnum">{rosterNote(shiori, state, m.id)}</span>
          </button>
        ))}
        {members.length === 0 && (
          <p style={{ padding: '14px 2px', margin: 0, fontSize: 14, color: 'var(--muted)' }}>
            「{query}」は見つかりませんでした。
          </p>
        )}
      </div>
    </AppFrame>
  )
}

/* ---------- 03' 出欠・支払い回答フォーム ---------- */
export function RsvpForm({ shiori }: { shiori: Shiori }) {
  const [state, update] = useShioriState(shiori)
  const navigate = useNavigate()
  const me = shiori.members.find((m) => m.id === state.memberId)
  const existing = me ? effectiveAnswer(shiori, state, me.id) : null

  const [attendance, setAttendance] = useState(
    existing?.attendance ?? shiori.attendanceOptions[0] ?? '参加',
  )
  const [transport, setTransport] = useState(existing?.transport)
  const [paid, setPaid] = useState(existing?.paid ?? false)

  if (shiori.kind === 'tour') return <Navigate to={`/s/${shiori.slug}`} replace />
  if (!me) return <Navigate to={`/s/${shiori.slug}/rsvp/who`} replace />
  const fee = feeFor(shiori, me.id)

  const feeNote = (() => {
    if (!shiori.fee) return ''
    const others = shiori.fee.rows
      .filter((r) => r.category !== fee?.category)
      .map((r) => `${r.category}は ${yen(r.amount)}`)
      .join('、')
    const deadline = shiori.fee.deadline ? `締切 ${shiori.fee.deadline}` : ''
    return [others, deadline].filter(Boolean).join('。')
  })()

  const paypay = () => {
    const ok = window.confirm(
      'PayPayでの送金はデモのため実行されません。\n「送金済み」として記録しますか？',
    )
    if (!ok) return
    setPaid(true)
    update((s) => ({
      answers: {
        ...s.answers,
        [me.id]: {
          ...(effectiveAnswer(shiori, s, me.id) ?? { attendance }),
          attendance: effectiveAnswer(shiori, s, me.id)?.attendance ?? attendance,
          transport,
          paid: true,
        },
      },
    }))
  }

  const submit = () => {
    update((s) => ({
      answers: {
        ...s.answers,
        [me.id]: { attendance, transport, paid, answeredAt: new Date().toISOString() },
      },
    }))
    navigate(`/s/${shiori.slug}/rsvp/done`)
  }

  return (
    <AppFrame shiori={shiori}>
      <div className="screen-header">
        <span className="title">出欠のご回答</span>
        <span style={{ fontSize: 14, color: 'var(--sub)' }}>
          {me.name} さん{'　'}
          <Link to={`/s/${shiori.slug}/rsvp/who`} style={{ fontSize: 13 }}>
            変更
          </Link>
        </span>
      </div>
      <div style={{ padding: '18px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div className="field-label">出欠</div>
          <div className="choice-grid">
            {shiori.attendanceOptions.map((opt) => (
              <button
                key={opt}
                className={attendance === opt ? 'on' : ''}
                onClick={() => setAttendance(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="field-label">交通手段</div>
          <div className="radio-list">
            {shiori.transportOptions.map((opt) => (
              <button
                key={opt}
                className={transport === opt ? 'on' : ''}
                onClick={() => setTransport(opt)}
              >
                <span className="radio" />
                {opt}
              </button>
            ))}
          </div>
        </div>
        {fee && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>参加費({fee.category})</span>
              {paid ? (
                <span className="badge">支払い済 ✓</span>
              ) : (
                <span className="badge warn">未払い</span>
              )}
            </div>
            <div
              className="serif tnum"
              style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}
            >
              {yen(fee.amount)}
            </div>
            {feeNote && (
              <div style={{ fontSize: 13.5, color: 'var(--sub)', marginTop: 2 }}>{feeNote}</div>
            )}
            {!paid && (
              <button className="btn-outline" style={{ marginTop: 12 }} onClick={paypay}>
                PayPay で送金する
              </button>
            )}
          </div>
        )}
        <button className="btn" onClick={submit}>
          この内容で回答する
        </button>
      </div>
    </AppFrame>
  )
}

/* ---------- 03'' 回答後 ---------- */
export function RsvpDone({ shiori }: { shiori: Shiori }) {
  const [state] = useShioriState(shiori)
  const now = useNow()
  const me = shiori.members.find((m) => m.id === state.memberId)
  const answer = me ? effectiveAnswer(shiori, state, me.id) : null

  if (shiori.kind === 'tour') return <Navigate to={`/s/${shiori.slug}`} replace />
  if (!me) return <Navigate to={`/s/${shiori.slug}/rsvp/who`} replace />
  if (!answer) return <Navigate to={`/s/${shiori.slug}/rsvp`} replace />

  const fee = feeFor(shiori, me.id)
  const next = nextEvent(shiori, now)
  const checkedSet = new Set(state.checked)
  const unchecked = shiori.checklist.filter((c) => !checkedSet.has(c.id))

  const attendanceLabel =
    answer.attendance === '参加' && shiori.days.length > 1
      ? `参加(${shiori.days.length}日間)`
      : answer.attendance

  return (
    <AppFrame shiori={shiori}>
      <div className="screen-header">
        <span className="title">出欠のご回答</span>
      </div>
      <div style={{ padding: '22px 20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="done-banner">
          <div className="head">
            <span className="circle">✓</span>
            <span className="title">回答を受け付けました</span>
          </div>
          <div className="meta">
            {answer.answeredAt ? `${fmtStamp(answer.answeredAt)} 送信　` : ''}
            {me.name} さん
          </div>
        </div>
        <InfoGrid
          roomy
          rows={[
            ['出欠', <strong key="a">{attendanceLabel}</strong>],
            ['交通', answer.transport ?? '—'],
            [
              '参加費',
              fee ? (
                <>
                  {yen(fee.amount)}
                  {'　'}
                  {answer.paid ? (
                    <span className="badge">支払い済 ✓</span>
                  ) : (
                    <span className="badge warn">未払い</span>
                  )}
                </>
              ) : (
                '—'
              ),
            ],
            [
              '集合',
              next
                ? `${shortDateLabel(new Date(`${next.day.date}T00:00:00`))} ${next.ev.time}　${next.ev.desc ?? ''}`
                : '—',
            ],
          ]}
        />
        <div style={{ fontSize: 14.5, lineHeight: 1.8, color: 'var(--sub)' }}>
          回答は締切{shiori.fee?.deadline ? `(${shiori.fee.deadline})` : ''}
          まで変更できます。変更があった場合はしおりに反映され、上部に告知が出ます。
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Link className="btn sm" to={`/s/${shiori.slug}`}>
            しおりを見る
          </Link>
          <Link className="btn-ghost" to={`/s/${shiori.slug}/rsvp`}>
            回答を修正する
          </Link>
        </div>
        {unchecked.length > 0 && (
          <div className="card" style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--sub)' }}>
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--ink)' }}>
              持ち物(未チェック {unchecked.length}件)
            </div>
            {unchecked.map((c) => c.label).join('・')}
            {'　'}
            <Link to={`/s/${shiori.slug}/items`} style={{ fontSize: 13.5 }}>
              確認する
            </Link>
          </div>
        )}
      </div>
    </AppFrame>
  )
}
