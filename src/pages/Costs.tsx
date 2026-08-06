import { AppFrame } from '../components/AppFrame'
import { computeSettlement, yen } from '../lib/settle'
import { useShioriState } from '../lib/store'
import type { Shiori } from '../lib/types'

export function Costs({ shiori }: { shiori: Shiori }) {
  const [state, update] = useShioriState(shiori)
  const expenses = shiori.expenses ?? []
  const settle = computeSettlement(expenses, shiori.members)
  const name = (id: string) => shiori.members.find((m) => m.id === id)?.name ?? id

  const paypay = () => {
    const ok = window.confirm(
      'PayPayでの送金はデモのため実行されません。\n「精算済み」として記録しますか？',
    )
    if (ok) update({ settled: true })
  }

  return (
    <AppFrame shiori={shiori} tab="costs">
      <div className="screen-header">
        <span className="title">費用と予約</span>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>
          {shiori.members.length}名で割り勘
        </span>
      </div>
      <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="cost-table">
          <div className="cost-row head">
            <span>項目</span>
            <span>立替</span>
            <span className="amt">金額</span>
          </div>
          {expenses.map((e) => (
            <div key={e.id} className="cost-row">
              <span>{e.label}</span>
              <span className="payer">{name(e.payerId)}</span>
              <span className="amt">{yen(e.amount)}</span>
            </div>
          ))}
          <div className="cost-row total">
            <span>合計</span>
            <span className="amt">{yen(settle.total)}</span>
          </div>
        </div>

        <div className="card accent">
          <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>精算</div>
          {settle.transfers.length === 0 ? (
            <div className="serif" style={{ fontSize: 20, fontWeight: 600, marginTop: 3 }}>
              精算は不要です
            </div>
          ) : (
            settle.transfers.map((t, i) => (
              <div
                key={i}
                className="serif"
                style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.4, marginTop: 3 }}
              >
                {name(t.fromId)} → {name(t.toId)}　<span className="tnum">{yen(t.amount)}</span>
              </div>
            ))
          )}
          <div style={{ fontSize: 13.5, color: 'var(--sub)', marginTop: 4 }} className="tnum">
            1人 {yen(settle.perHead)} として計算
          </div>
          {state.settled ? (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <span className="badge">精算済み ✓</span>
            </div>
          ) : (
            settle.transfers.length > 0 && (
              <button className="btn sm" style={{ marginTop: 12 }} onClick={paypay}>
                PayPay で送金する
              </button>
            )
          )}
        </div>

        {shiori.reservations && shiori.reservations.length > 0 && (
          <div>
            <div className="field-label">予約控え</div>
            <div className="card" style={{ padding: '12px 14px', fontSize: 14.5, lineHeight: 1.8 }}>
              {shiori.reservations.map((line, i) => (
                <div key={i} className="tnum">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppFrame>
  )
}
