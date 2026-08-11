import { useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AppFrame } from '../components/AppFrame'
import { InfoGrid } from '../components/InfoGrid'
import { yen } from '../lib/settle'
import { effectiveAnswer, feeFor, rosterNote, useShioriState } from '../lib/store'
import { isBuiltin } from '../lib/docs'
import { verifyIdentity } from '../lib/sync'
import { forceSync } from '../lib/useShioriSync'
import { nextEvent, shortDateLabel, useNow } from '../lib/time'
import type { Shiori } from '../lib/types'

/** 名簿非公開モードの入口: 名前+電話下4桁で照合(一覧は見せない) */
function PrivateWhoGate({
  shiori,
  onMatch,
}: {
  shiori: Shiori
  onMatch: (memberId: string, token?: string) => void | Promise<void>
}) {
  const [name, setName] = useState('')
  const [digits, setDigits] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const operatorContact = shiori.operator?.tel
    ? `${shiori.operator.name}(${shiori.operator.tel.display})`
    : '催行会社'

  const submit = async () => {
    // 全角数字・全角空白(日本語IME)に耐えるようNFKC正規化してから照合する
    const n = name.normalize('NFKC').trim()
    const d = digits.normalize('NFKC').replace(/\D/g, '')
    if (!n) return
    setBusy(true)
    // サーバー照合を優先(名簿もトークンも端末に出さない)
    if (!isBuiltin(shiori.slug)) {
      const res = await verifyIdentity(shiori.slug, n, d)
      if (res === 'nomatch') {
        setBusy(false)
        setError(true)
        return
      }
      if (res) {
        // 本人トークンでしおりを取り直してから開く(匿名docには本人情報がない)
        await onMatch(res.memberId, res.token)
        setBusy(false)
        return
      }
      setBusy(false)
      // null=オフライン等はローカル照合へフォールバック
    } else {
      setBusy(false)
    }
    const hit = shiori.members.find((m) => {
      if (m.name.normalize('NFKC').trim() !== n) return false
      const l4 = m.tel?.href.replace(/\D/g, '').slice(-4)
      return l4 ? l4 === d : d === '' // 電話未登録のお客様は名前のみ
    })
    if (hit) onMatch(hit.id, hit.token)
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
          <label className="input-label" htmlFor="pwg-name">ご予約のお名前(姓)</label>
          <input id="pwg-name" className="text-input" value={name} onChange={(e) => { setName(e.target.value); setError(false) }} />
        </div>
        <div>
          <label className="input-label" htmlFor="pwg-digits">電話番号の下4桁</label>
          <input
            id="pwg-digits"
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
        <button className="btn sm" onClick={() => void submit()} disabled={busy}>
          {busy ? '確認しています…' : '確認して開く'}
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

/* ---------- 03 本人選択(ログインの代わり) ---------- */
export function RsvpWho({ shiori }: { shiori: Shiori }) {
  const [state, update] = useShioriState(shiori)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const isTour = shiori.kind === 'tour'
  const organizer = shiori.contacts.find((c) => c.label === '幹事')

  const proceed = async (memberId: string, token?: string) => {
    update({ memberId, ...(token ? { token } : {}) })
    if (isTour) {
      if (!isBuiltin(shiori.slug)) await forceSync(shiori.slug, token)
      navigate(`/s/${shiori.slug}`)
      return
    }
    const answered = effectiveAnswer(shiori, state, memberId)
    navigate(answered ? `/s/${shiori.slug}` : `/s/${shiori.slug}/rsvp`)
  }

  // 少人数(duo)版は本人選択・出欠がないので表紙へ
  if (shiori.kind === 'duo') return <Navigate to={`/s/${shiori.slug}`} replace />

  // ツアーは名簿を一切表示しない(他のお客様の名前が見えてはいけない)。
  // 入口は「個別リンク」か「姓+電話下4桁」のみ
  if (isTour) {
    return <PrivateWhoGate shiori={shiori} onMatch={(id, token) => proceed(id, token)} />
  }

  const members = query.trim()
    ? shiori.members.filter((m) => m.name.includes(query.trim()))
    : shiori.members

  const contactNote = `名前がない場合は幹事${organizer?.tel ? `(${organizer.name} ${organizer.tel.display})` : ''}までご連絡ください。`

  return (
    <AppFrame shiori={shiori}>
      <div style={{ padding: '18px 20px 0' }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 23, fontWeight: 600 }}>
          あなたは どなたですか？
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
          <button key={m.id} onClick={() => proceed(m.id)}>
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

  // 出欠フォームはグループ版のみ(ツアーは予約済み前提、少人数は出欠なし)
  if (shiori.kind !== 'group') return <Navigate to={`/s/${shiori.slug}`} replace />
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

  const absent = answer.attendance === '不参加'
  const fee = absent ? null : feeFor(shiori, me.id)
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
            ...(absent
              ? []
              : ([
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
                    next && !next.past
                      ? `${shortDateLabel(new Date(`${next.day.date}T00:00:00`))} ${next.ev.time}　${next.ev.desc ?? ''}`
                      : '—',
                  ],
                ] as [string, ReactNode][])),
          ]}
        />
        <div style={{ fontSize: 14.5, lineHeight: 1.8, color: 'var(--sub)' }}>
          {absent
            ? '「不参加」で受け付けました。'
            : ''}
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
