import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { useShioriState } from '../lib/store'
import { themeClass } from '../lib/theme'
import { shareDisplay, shareUrlFor } from '../lib/share'
import type { Shiori } from '../lib/types'

/**
 * 共有カード(QRコード)。有料プランの機能(要件定義 04: QRコード・共有カード)。
 */
export function ShareCard({ shiori }: { shiori: Shiori }) {
  const [state] = useShioriState(shiori)
  const [qr, setQr] = useState('')
  const paid = !!state.billing && state.billing.plan !== 'free'

  useEffect(() => {
    if (!paid) return
    QRCode.toDataURL(shareUrlFor(shiori.slug), {
      width: 480,
      margin: 1,
      color: { dark: '#1F1D1A', light: '#FFFFFF' },
    })
      .then(setQr)
      .catch(() => setQr(''))
  }, [paid, shiori.slug])

  if (!paid) {
    return (
      <div className={`app${themeClass(shiori)}`}>
        <div className="app-body" style={{ padding: '48px 24px' }}>
          <h1 className="serif" style={{ fontSize: 23, fontWeight: 600, margin: 0 }}>
            共有カードは有料プランの機能です
          </h1>
          <p style={{ color: 'var(--sub)', lineHeight: 1.8, fontSize: 14.5 }}>
            QRコード付きの共有カードは「しおり 1冊(¥480 買い切り)」または「年間パス」で
            公開すると使えるようになります。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 18 }}>
            <Link className="btn sm" to={`/publish/${shiori.slug}`}>
              公開プランを見る
            </Link>
            <Link className="btn-ghost" to={`/manage/${shiori.slug}`}>
              管理にもどる
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={themeClass(shiori)}>
      <div className="print-toolbar">
        <Link to={`/manage/${shiori.slug}`} style={{ fontSize: 14 }}>
          ‹ 戻る
        </Link>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          印刷して配れば、スマホで読み取るだけでしおりが開きます
        </span>
        <button
          className="btn sm"
          style={{ width: 'auto', padding: '9px 18px' }}
          onClick={() => window.print()}
        >
          印刷 / PDF保存
        </button>
      </div>
      <div className="print-sheet" style={{ maxWidth: 460, textAlign: 'center' }}>
        <div className="cover-rule" style={{ textAlign: 'left' }}>
          <span className="label">{shiori.coverLabel}</span>
          <span className="corner">{shiori.cornerNote}</span>
        </div>
        <div style={{ padding: '22px 0 4px' }}>
          <div className="cover-eyebrow">{shiori.eyebrow}</div>
          <h2 className="serif" style={{ margin: '8px 0 0', fontSize: 32, fontWeight: 600, lineHeight: 1.3 }}>
            {shiori.title}　{shiori.subtitle}
          </h2>
          <div style={{ fontSize: 14.5, color: 'var(--sub)', marginTop: 8 }} className="tnum">
            {shiori.dateLabel}
          </div>
        </div>
        {qr && (
          <img
            src={qr}
            alt="しおりを開くQRコード"
            style={{ width: 240, height: 240, marginTop: 18, border: '1px solid var(--line)', padding: 10, background: 'white' }}
          />
        )}
        <div className="mono" style={{ fontSize: 14, marginTop: 14 }}>
          {shareDisplay(shiori.slug)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, paddingBottom: 8 }}>
          スマホのカメラで読み取ってください。登録・ログインは不要です。
        </div>
      </div>
    </div>
  )
}
