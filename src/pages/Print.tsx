import { Link } from 'react-router-dom'
import { TimelineDay } from '../components/TimelineDay'
import { InfoGrid } from '../components/InfoGrid'
import { computeSettlement, yen } from '../lib/settle'
import { attendanceCounts, useShioriState } from '../lib/store'
import { themeClass } from '../lib/theme'
import { useNow } from '../lib/time'
import type { ReactNode } from 'react'
import type { Shiori } from '../lib/types'

function Sheet({ watermark, children }: { watermark: boolean; children: ReactNode }) {
  return (
    <div className="print-sheet">
      {watermark && <div className="print-watermark">無料版サンプル ・ trip-shiori.jp</div>}
      {children}
    </div>
  )
}

export function Print({ shiori }: { shiori: Shiori }) {
  const [state] = useShioriState(shiori)
  const now = useNow()
  const watermark = !state.billing || state.billing.plan === 'free'
  const counts = attendanceCounts(shiori, state)
  const settle =
    shiori.expenses && shiori.expenses.length > 0
      ? computeSettlement(shiori.expenses, shiori.members)
      : null
  const name = (id: string) => shiori.members.find((m) => m.id === id)?.name ?? id

  return (
    <div className={themeClass(shiori)}>
      <div className="print-toolbar">
        <Link to={`/s/${shiori.slug}`} style={{ fontSize: 14 }}>
          ‹ しおりに戻る
        </Link>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          {watermark ? '無料プランのため透かしが入ります' : 'A4縦・透かしなし'}
        </span>
        <button
          className="btn sm"
          style={{ width: 'auto', padding: '9px 18px' }}
          onClick={() => window.print()}
        >
          印刷 / PDF保存
        </button>
      </div>

      {/* 表紙 */}
      <Sheet watermark={watermark}>
        <div className="cover-rule">
          <span className="label">{shiori.coverLabel}</span>
          <span className="corner">{shiori.cornerNote}</span>
        </div>
        <div style={{ padding: '26px 0 20px' }}>
          <div className="cover-eyebrow">{shiori.eyebrow}</div>
          <h2 className="cover-title">
            {shiori.title}
            <br />
            <span className="sub">{shiori.subtitle}</span>
          </h2>
        </div>
        <InfoGrid
          rows={
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
                  ['宿', shiori.lodging?.name ?? ''],
                  ['同行', shiori.members.map((m) => m.name).join(' ・ ')],
                ]
          }
        />
        <div style={{ marginTop: 28, fontSize: 13, color: 'var(--muted)' }} className="mono">
          {shiori.shareUrl}
        </div>
      </Sheet>

      {/* 行程 */}
      {shiori.days.map((day) => (
        <Sheet key={day.id} watermark={watermark}>
          <h3 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: '0 0 18px' }}>
            行程　<span className="tnum">{day.label}</span>
          </h3>
          <TimelineDay day={day} now={now} />
        </Sheet>
      ))}

      {/* 持ち物 */}
      <Sheet watermark={watermark}>
        <h3 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: '0 0 18px' }}>
          持ち物
        </h3>
        <div className="hairline-block">
          {shiori.checklist.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                padding: '12px 2px',
                borderBottom: '1px solid var(--line-lt)',
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  border: '1px solid var(--ink)',
                  borderRadius: 3,
                  flexShrink: 0,
                  marginTop: 3,
                }}
              />
              <span>
                <span style={{ fontSize: 16 }}>{c.label}</span>
                {c.note && <span style={{ fontSize: 13, color: 'var(--muted)' }}>　{c.note}</span>}
              </span>
            </div>
          ))}
        </div>
      </Sheet>

      {/* 連絡先 / 費用と予約 */}
      <Sheet watermark={watermark}>
        {shiori.kind === 'group' ? (
          <>
            <h3 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: '0 0 18px' }}>
              連絡先
            </h3>
            <InfoGrid
              roomy
              rows={shiori.contacts.map((c) => [
                c.label,
                <span key={c.id}>
                  {c.name}
                  {c.tel && <span className="tnum">　{c.tel.display}</span>}
                  {c.note && (
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>　{c.note}</span>
                  )}
                </span>,
              ])}
            />
          </>
        ) : (
          <>
            <h3 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: '0 0 18px' }}>
              費用と予約
            </h3>
            {shiori.expenses && settle && (
              <div className="cost-table" style={{ marginBottom: 24 }}>
                {shiori.expenses.map((e) => (
                  <div key={e.id} className="cost-row">
                    <span>{e.label}</span>
                    <span className="payer">{name(e.payerId)}</span>
                    <span className="amt">{yen(e.amount)}</span>
                  </div>
                ))}
                <div className="cost-row total">
                  <span>合計(1人 {yen(settle.perHead)})</span>
                  <span className="amt">{yen(settle.total)}</span>
                </div>
              </div>
            )}
            {shiori.reservations && (
              <>
                <div className="field-label">予約控え</div>
                <div className="card" style={{ fontSize: 14.5, lineHeight: 1.9 }}>
                  {shiori.reservations.map((line, i) => (
                    <div key={i} className="tnum">
                      {line}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </Sheet>
    </div>
  )
}
