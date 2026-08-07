import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { findShiori } from '../lib/docs'
import type { Shiori } from '../lib/types'

const pinKey = (slug: string) => `pin:${slug}`

function pinRemembered(shiori: Shiori): boolean {
  const pin = shiori.security?.adminPin
  if (!pin) return true
  try {
    return sessionStorage.getItem(pinKey(shiori.slug)) === pin
  } catch {
    return false
  }
}

/** 管理コード(PIN)ゲート。しおりに adminPin が設定されていれば要求する。
 *  ルートが同一コンポーネントのまま slug だけ変わるケース(複製直後など)があるため、
 *  解錠状態は slug 単位で判定する。 */
function PinGate({ shiori, children }: { shiori: Shiori; children: ReactNode }) {
  const [unlockedSlug, setUnlockedSlug] = useState('')
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const ok = pinRemembered(shiori) || unlockedSlug === shiori.slug

  if (ok) return <>{children}</>

  const submit = () => {
    if (input.trim() === shiori.security?.adminPin) {
      try {
        sessionStorage.setItem(pinKey(shiori.slug), input.trim())
      } catch {
        // 保存できなくてもこのタブでは通す
      }
      setUnlockedSlug(shiori.slug)
      setInput('')
    } else {
      setError(true)
    }
  }

  return (
    <div className="app">
      <div className="app-body" style={{ padding: '48px 24px' }}>
        <h1 className="serif" style={{ fontSize: 23, fontWeight: 600, margin: 0 }}>
          管理コード
        </h1>
        <p style={{ color: 'var(--sub)', lineHeight: 1.8, fontSize: 14.5 }}>
          このしおりの管理画面はロックされています。幹事(担当者)が設定した管理コードを入力してください。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          <input
            className="text-input"
            type="password"
            inputMode="numeric"
            placeholder="管理コード"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setError(false)
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={{ fontSize: 20, textAlign: 'center', letterSpacing: '0.2em' }}
          />
          {error && (
            <div className="note-l warn" style={{ color: 'var(--warn)' }}>
              管理コードが違います。
            </div>
          )}
          <button className="btn sm" onClick={submit}>
            開く
          </button>
          <Link className="btn-ghost" to="/manage">
            しおり一覧にもどる
          </Link>
        </div>
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="app">
      <div className="app-body" style={{ padding: '48px 24px' }}>
        <h1 className="serif" style={{ fontSize: 23, fontWeight: 600, margin: 0 }}>
          しおりが見つかりません
        </h1>
        <p style={{ color: 'var(--sub)', lineHeight: 1.8 }}>
          URLをお確かめのうえ、幹事の方にご確認ください。
        </p>
        <p>
          <Link to="/">トップへ戻る</Link>
        </p>
      </div>
    </div>
  )
}

/** URLの :slug からしおりを解決してページに渡す */
export function withShiori(Inner: (props: { shiori: Shiori }) => JSX.Element | null) {
  return function ShioriRoute() {
    const { slug } = useParams()
    const shiori = findShiori(slug)
    if (!shiori) return <NotFound />
    return <Inner shiori={shiori} />
  }
}

/** 管理画面用: しおり解決+管理コードゲート */
export function withManagedShiori(Inner: (props: { shiori: Shiori }) => JSX.Element | null) {
  return function ManagedShioriRoute() {
    const { slug } = useParams()
    const shiori = findShiori(slug)
    if (!shiori) return <NotFound />
    return (
      <PinGate shiori={shiori}>
        <Inner shiori={shiori} />
      </PinGate>
    )
  }
}
