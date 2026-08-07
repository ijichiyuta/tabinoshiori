import { useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AppFrame } from '../components/AppFrame'
import { InfoGrid } from '../components/InfoGrid'
import { yen } from '../lib/settle'
import { useShioriState } from '../lib/store'
import { themeClass } from '../lib/theme'
import type { Shiori } from '../lib/types'

const FREE_LIMIT = 6

const PAID_PLANS = {
  one: {
    name: 'しおり 1冊(買い切り)',
    price: 480,
    priceLabel: '¥480',
    form: '買い切り(自動更新なし)',
    itemLabel: 'しおり 1冊',
  },
  year: {
    name: '年間パス',
    price: 1800,
    priceLabel: '¥1,800／年',
    form: '年間パス(自動更新なし・期限前にお知らせ)',
    itemLabel: '年間パス',
  },
} as const

type PaidPlanKey = keyof typeof PAID_PLANS

function fmtStamp(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

/* ---------- 04 プラン選択(幹事のみ) ---------- */
export function PublishPlan({ shiori }: { shiori: Shiori }) {
  const [state, update] = useShioriState(shiori)
  const overLimit = shiori.members.length > FREE_LIMIT
  const [plan, setPlan] = useState<'free' | PaidPlanKey>('one')
  const navigate = useNavigate()

  if (state.billing) return <Navigate to={`/publish/${shiori.slug}/done`} replace />

  const firstFee = shiori.fee?.rows[0]
  const amount = plan === 'free' ? 0 : PAID_PLANS[plan].price

  const proceed = () => {
    if (plan === 'free') {
      update({ billing: { plan: 'free', paidAt: new Date().toISOString() } })
      navigate(`/publish/${shiori.slug}/done`)
    } else {
      navigate(`/publish/${shiori.slug}/pay?plan=${plan}`)
    }
  }

  const selectedBorder = { border: '2px solid var(--accent)' } as const

  return (
    <AppFrame shiori={shiori}>
      <div style={{ padding: '18px 20px 0' }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 23, fontWeight: 600 }}>
          しおりを公開する
        </h1>
        <p style={{ margin: '7px 0 0', fontSize: 14.5, lineHeight: 1.7, color: 'var(--sub)' }}>
          お支払いは<strong style={{ fontWeight: 700 }}>幹事だけ</strong>
          。参加者は無料で、登録もなくURLを開くだけです。
        </p>
      </div>
      <div
        style={{
          padding: '14px 20px 140px',
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
        }}
      >
        <button
          className={`plan-card${overLimit ? ' disabled' : ''}`}
          style={plan === 'free' ? selectedBorder : undefined}
          onClick={() => !overLimit && setPlan('free')}
        >
          <div className="row">
            <span className="name">無料</span>
            <span className="price">¥0</span>
          </div>
          <div className="desc">参加者{FREE_LIMIT}名まで／印刷PDFは透かし入り</div>
          {overLimit && (
            <div
              className="note-l warn"
              style={{ marginTop: 5, fontSize: 13, color: 'var(--warn)' }}
            >
              この旅行は{shiori.members.length}名のため上限を超えています
            </div>
          )}
        </button>

        {plan === 'one' ? (
          <div className="plan-card selected-wrap">
            <div className="plan-selected-head">
              <span>この旅行に必要なプラン</span>
              <span className="right">選択中</span>
            </div>
            <div className="plan-selected-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="name">しおり 1冊(買い切り)</span>
                <span className="price">¥480</span>
              </div>
              <div className="desc" style={{ lineHeight: 1.8, marginTop: 4 }}>
                人数無制限／A4印刷PDF(透かしなし)
                <br />
                QRコード・更新告知・共有カード
              </div>
            </div>
          </div>
        ) : (
          <button className="plan-card" onClick={() => setPlan('one')}>
            <div className="row">
              <span className="name">しおり 1冊(買い切り)</span>
              <span className="price">¥480</span>
            </div>
            <div className="desc">人数無制限／A4印刷PDF(透かしなし)／QRコード・更新告知・共有カード</div>
          </button>
        )}

        <button
          className="plan-card"
          style={plan === 'year' ? selectedBorder : undefined}
          onClick={() => setPlan('year')}
        >
          <div className="row">
            <span className="name">年間パス</span>
            <span className="price" style={{ fontSize: 18, fontWeight: 700 }}>
              ¥1,800
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>／年</span>
            </span>
          </div>
          <div className="desc">しおり無制限・前年のしおりを複製。年3回以上作る方へ</div>
        </button>

        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
          {firstFee
            ? `参加費の集金(${yen(firstFee.amount)} など)とは別のお支払いです。参加者に請求は行きません。`
            : '旅の費用の精算とは別のお支払いです。同行者に請求は行きません。'}
        </div>
      </div>
      <div className="sticky-footer">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: 15,
            marginBottom: 9,
          }}
        >
          <span style={{ color: 'var(--muted)' }}>お支払い金額(税込)</span>
          <span className="serif tnum" style={{ fontSize: 24, fontWeight: 600 }}>
            {yen(amount)}
          </span>
        </div>
        <button className="btn" onClick={proceed}>
          {plan === 'free' ? '無料で公開する' : 'お支払いへ進む'}
        </button>
      </div>
    </AppFrame>
  )
}

/* ---------- 04' 支払い方法・確認 ---------- */
export function PublishPay({ shiori }: { shiori: Shiori }) {
  const [state, update] = useShioriState(shiori)
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const planKey: PaidPlanKey = sp.get('plan') === 'year' ? 'year' : 'one'
  const plan = PAID_PLANS[planKey]

  const [method, setMethod] = useState('クレジットカード')
  const [cardNo, setCardNo] = useState('')
  const [exp, setExp] = useState('')
  const [cvc, setCvc] = useState('')
  const [error, setError] = useState('')

  if (state.billing) return <Navigate to={`/publish/${shiori.slug}/done`} replace />

  const pay = () => {
    let last4: string | undefined
    if (method === 'クレジットカード') {
      const digits = cardNo.replace(/\D/g, '')
      if (digits.length < 14 || !exp.trim() || !cvc.trim()) {
        setError('カード情報を入力してください(デモのためダミーの番号で構いません)')
        return
      }
      last4 = digits.slice(-4)
    }
    update({
      billing: { plan: planKey, paidAt: new Date().toISOString(), last4, method },
    })
    navigate(`/publish/${shiori.slug}/done`)
  }

  return (
    <AppFrame shiori={shiori}>
      <div className="screen-header">
        <span className="title">お支払い</span>
        <span style={{ fontSize: 14, color: 'var(--muted)' }} className="tnum">
          {plan.itemLabel} {yen(plan.price)}
        </span>
      </div>
      <div style={{ padding: '18px 20px 160px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div className="field-label">支払い方法</div>
          <div className="radio-list">
            {['クレジットカード', 'PayPay', 'キャリア決済'].map((opt) => (
              <button key={opt} className={method === opt ? 'on' : ''} onClick={() => setMethod(opt)}>
                <span className="radio" />
                {opt}
              </button>
            ))}
          </div>
        </div>
        {method === 'クレジットカード' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div>
              <div className="input-label">カード番号</div>
              <input
                className="text-input"
                inputMode="numeric"
                placeholder="1234 5678 9012 3456"
                value={cardNo}
                onChange={(e) => setCardNo(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <div>
                <div className="input-label">有効期限</div>
                <input
                  className="text-input"
                  placeholder="MM / YY"
                  value={exp}
                  onChange={(e) => setExp(e.target.value)}
                />
              </div>
              <div>
                <div className="input-label">セキュリティコード</div>
                <input
                  className="text-input"
                  inputMode="numeric"
                  placeholder="3桁"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        {method !== 'クレジットカード' && (
          <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7 }}>
            デモのため、{method}のお支払い画面へは遷移せずにそのまま完了します。
          </div>
        )}
        <InfoGrid
          rows={[
            ['内容', `${plan.itemLabel}　${shiori.eyebrow} ${shiori.title}`],
            ['形式', plan.form],
            [
              '合計',
              <strong key="t" className="tnum">
                {yen(plan.price)}(税込)
              </strong>,
            ],
          ]}
        />
        {error && (
          <div className="note-l warn" style={{ color: 'var(--warn)' }}>
            {error}
          </div>
        )}
      </div>
      <div className="sticky-footer">
        <button className="btn" onClick={pay}>
          {yen(plan.price)} を支払う
        </button>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
          自動更新はありません。
          <Link to="/tokushoho" style={{ fontSize: 12.5 }}>
            特定商取引法に基づく表記
          </Link>
        </div>
      </div>
    </AppFrame>
  )
}

/* ---------- 04'' 完了・公開 ---------- */
export function PublishDone({ shiori }: { shiori: Shiori }) {
  const [state] = useShioriState(shiori)
  const [copied, setCopied] = useState(false)
  const billing = state.billing

  if (!billing) return <Navigate to={`/publish/${shiori.slug}`} replace />

  const isFree = billing.plan === 'free'
  const price = billing.plan === 'year' ? 1800 : 480

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${shiori.shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('このURLをコピーしてください', `https://${shiori.shareUrl}`)
    }
  }

  return (
    <AppFrame shiori={shiori}>
      <div style={{ padding: '22px 20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="done-banner">
          <div className="head">
            <span className="circle">✓</span>
            <span className="title">
              {isFree ? '無料プランで公開しました' : 'お支払いが完了しました'}
            </span>
          </div>
          <div className="meta">
            {fmtStamp(billing.paidAt)}
            {!isFree && (
              <>
                　{yen(price)}(税込)
                {billing.last4 && `　カード末尾 ${billing.last4}`}
              </>
            )}
          </div>
        </div>
        <InfoGrid
          rows={[
            ['しおり', `${shiori.eyebrow} ${shiori.title}`],
            [
              '状態',
              <strong key="s">
                公開中({isFree ? `参加者${FREE_LIMIT}名まで` : '人数無制限'})
              </strong>,
            ],
            ['印刷PDF', isFree ? '透かし入りで出力されます' : '透かしなしで出力できます'],
            ...(isFree
              ? []
              : ([
                  [
                    '領収書',
                    <Link key="r" to={`/publish/${shiori.slug}/receipt`}>
                      PDFをダウンロード
                    </Link>,
                  ],
                ] as [string, ReactNode][])),
          ]}
        />
        <div className="card">
          <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>参加者用URL</div>
          <div className="mono" style={{ fontSize: 14, marginTop: 5, wordBreak: 'break-all' }}>
            {shiori.shareUrl}
          </div>
          <button className="btn-outline" style={{ marginTop: 11 }} onClick={copy}>
            {copied ? 'コピーしました ✓' : 'URLをコピーして共有'}
          </button>
        </div>
        <Link className="btn" to={`/s/${shiori.slug}`}>
          しおりを見る
        </Link>
        {!isFree && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, fontSize: 13.5 }}>
            <Link to={`/s/${shiori.slug}/card`}>共有カード(QR)</Link>
            <Link to={`/s/${shiori.slug}/print`}>印刷PDF</Link>
          </div>
        )}
      </div>
    </AppFrame>
  )
}

/* ---------- 領収書(印刷用) ---------- */
export function Receipt({ shiori }: { shiori: Shiori }) {
  const [state] = useShioriState(shiori)
  const billing = state.billing
  if (!billing || billing.plan === 'free') return <Navigate to={`/publish/${shiori.slug}`} replace />
  const price = billing.plan === 'year' ? 1800 : 480
  const d = new Date(billing.paidAt)
  return (
    <div className={themeClass(shiori)}>
      <div className="print-toolbar">
        <Link to={`/publish/${shiori.slug}/done`} style={{ fontSize: 14 }}>
          ‹ 戻る
        </Link>
        <button className="btn sm" style={{ width: 'auto', padding: '9px 18px' }} onClick={() => window.print()}>
          印刷 / PDF保存
        </button>
      </div>
      <div className="print-sheet" style={{ maxWidth: 560 }}>
        <h1 className="serif" style={{ textAlign: 'center', fontSize: 26, fontWeight: 600, letterSpacing: '0.3em', margin: 0 }}>
          領　収　書
        </h1>
        <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--muted)', marginTop: 12 }} className="tnum">
          {d.getFullYear()}年{d.getMonth() + 1}月{d.getDate()}日
        </div>
        <div style={{ borderBottom: '1px solid var(--ink)', padding: '24px 4px 6px', fontSize: 16 }}>
          　　　　　　　　　　様
        </div>
        <div className="serif tnum" style={{ textAlign: 'center', fontSize: 34, fontWeight: 600, padding: '28px 0' }}>
          {yen(price)} −
        </div>
        <div style={{ fontSize: 14, color: 'var(--sub)' }}>
          但し 旅合わせ {PAID_PLANS[billing.plan === 'year' ? 'year' : 'one'].itemLabel}
          利用料として(税込)
        </div>
        <div style={{ fontSize: 14, color: 'var(--sub)', marginTop: 4 }}>
          上記正に領収いたしました
        </div>
        <div style={{ marginTop: 40, textAlign: 'right', fontSize: 13.5, lineHeight: 1.9, color: 'var(--sub)' }}>
          旅合わせ tabiawase.jp(デモ)
          <br />
          支払方法: {billing.method ?? '—'}
          {billing.last4 && `(末尾 ${billing.last4})`}
        </div>
      </div>
    </div>
  )
}
