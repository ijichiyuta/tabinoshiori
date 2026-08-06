import type { ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AppFrame } from '../components/AppFrame'
import { InfoGrid } from '../components/InfoGrid'
import { UpdateBanner } from '../components/UpdateBanner'
import { computeSettlement, yen } from '../lib/settle'
import {
  attendanceCounts,
  effectiveAnswer,
  feeFor,
  useShioriState,
} from '../lib/store'
import { nextEvent, shortDateLabel, useNow } from '../lib/time'
import type { Shiori } from '../lib/types'

function NextEventBlock({ shiori, label }: { shiori: Shiori; label: string }) {
  const now = useNow()
  const next = nextEvent(shiori, now)
  if (!next) return null
  const d = new Date(`${next.day.date}T00:00:00`)
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</div>
      <div className="big-time">
        {shortDateLabel(d)} {next.ev.time}
      </div>
      {(next.ev.desc || next.ev.title) && (
        <div style={{ fontSize: 15, lineHeight: 1.6 }}>
          {next.ev.desc}
          {next.ev.title !== '集合' && <>　{next.ev.title}</>}
        </div>
      )}
      {next.ev.note && (
        <div className="note-l" style={{ marginTop: 4 }}>
          {next.ev.note}
        </div>
      )}
    </div>
  )
}

function GroupPersonalCard({ shiori }: { shiori: Shiori }) {
  const [state] = useShioriState(shiori)
  const me = shiori.members.find((m) => m.id === state.memberId)
  if (!me) return null
  const answer = effectiveAnswer(shiori, state, me.id)
  const fee = feeFor(shiori, me.id)
  const status = answer ? answer.attendance : '未回答'
  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <div className="panel-head">
        <span>{me.name} さんの予定</span>
        <span className="right">{status}</span>
      </div>
      <div className="panel-body">
        <NextEventBlock shiori={shiori} label="次の集合" />
        {fee && (
          <div
            style={{
              borderTop: '1px solid var(--line)',
              paddingTop: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                あなたの参加費({fee.category})
              </div>
              <div className="big-amount">{yen(fee.amount)}</div>
            </div>
            {answer?.paid ? (
              <span className="badge">支払い済 ✓</span>
            ) : (
              <span className="badge warn">未払い ／ 要対応</span>
            )}
          </div>
        )}
        {!answer ? (
          <Link className="btn sm" to={`/s/${shiori.slug}/rsvp`}>
            出欠の回答に進む
          </Link>
        ) : !answer.paid ? (
          <Link className="btn sm" to={`/s/${shiori.slug}/rsvp`}>
            支払いに進む
          </Link>
        ) : (
          <Link className="btn-ghost" to={`/s/${shiori.slug}/rsvp/done`}>
            回答を確認する
          </Link>
        )}
      </div>
    </div>
  )
}

function DuoBudgetCard({ shiori }: { shiori: Shiori }) {
  const settle =
    shiori.expenses && shiori.expenses.length > 0
      ? computeSettlement(shiori.expenses, shiori.members)
      : null
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="panel-head">
        <span>次の予定</span>
      </div>
      <div className="panel-body" style={{ gap: 11 }}>
        <NextEventBlock shiori={shiori} label="" />
        {settle && (
          <div
            style={{
              borderTop: '1px solid var(--line)',
              paddingTop: 11,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>ふたりの予算</div>
              <div className="big-amount">{yen(settle.total)}</div>
              <div style={{ fontSize: 13, color: 'var(--sub)' }} className="tnum">
                1人あたり {yen(settle.perHead)}
              </div>
            </div>
            {shiori.coverBadge && <span className="badge">{shiori.coverBadge}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export function Cover({ shiori }: { shiori: Shiori }) {
  const [state] = useShioriState(shiori)
  const [sp] = useSearchParams()

  // 名簿から本人を選ぶまでは表紙を出さない(ログインの代わり)
  if (shiori.kind === 'group' && !state.memberId) {
    return <Navigate to={`/s/${shiori.slug}/rsvp/who`} replace />
  }

  const counts = attendanceCounts(shiori, state)
  // 写真は幹事が用意する。データ未設定でも ?photo=1 でプレースホルダー帯を確認できる
  const showPhotoBand = !!shiori.photo || sp.get('photo') === '1'

  const infoRows: [string, ReactNode][] =
    shiori.kind === 'group'
      ? [
          ['日程', shiori.dateLabel],
          ['行き先', shiori.destination ?? ''],
          [
            '参加',
            `${counts.total}名(参加${counts.attend}／不参加${counts.absent}／未回答${counts.pending})`,
          ],
        ]
      : [
          ['日程', shiori.dateLabel],
          [
            '宿',
            <>
              {shiori.lodging?.name}
              {shiori.lodging?.tel && <>　TEL {shiori.lodging.tel.display}</>}
            </>,
          ],
          ['同行', shiori.members.map((m) => m.name).join(' ・ ')],
        ]

  return (
    <AppFrame shiori={shiori} tab="cover">
      <UpdateBanner updates={shiori.updates} />
      {showPhotoBand && (
        <div
          className="cover-photo"
          style={
            shiori.photo
              ? { backgroundImage: `url(${shiori.photo})` }
              : { display: 'flex', alignItems: 'flex-end', padding: 18 }
          }
          role="img"
          aria-label="表紙写真"
        >
          {!shiori.photo && (
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--gray-tx)',
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                padding: '3px 7px',
              }}
            >
              photo — 幹事が用意(未設定時はタイポグラフィ表紙)
            </span>
          )}
        </div>
      )}
      <div style={{ padding: showPhotoBand ? '20px 22px 12px' : '26px 22px 12px' }}>
        {!showPhotoBand && (
          <div className="cover-rule">
            <span className="label">{shiori.coverLabel}</span>
            <span className="corner">{shiori.cornerNote}</span>
          </div>
        )}
        <div style={{ padding: showPhotoBand ? '0 0 16px' : '18px 0 16px' }}>
          <div className="cover-eyebrow">{shiori.eyebrow}</div>
          <h2 className={`cover-title${showPhotoBand ? ' compact' : ''}`}>
            {shiori.title}
            <br />
            <span className="sub">{shiori.subtitle}</span>
          </h2>
        </div>
        <InfoGrid rows={infoRows} />
        {shiori.kind === 'group' ? (
          <GroupPersonalCard shiori={shiori} />
        ) : (
          <DuoBudgetCard shiori={shiori} />
        )}
      </div>
    </AppFrame>
  )
}
