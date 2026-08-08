import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { findShiori } from '../lib/docs'
import { verifyPin } from '../lib/sync'
import { useShioriSync } from '../lib/useShioriSync'
import type { Shiori } from '../lib/types'

function LoadingScreen() {
  return (
    <div className="app">
      <div
        className="app-body"
        style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14.5 }}
      >
        しおりを開いています…
      </div>
    </div>
  )
}

const pinKey = (slug: string) => `pin:${slug}`
const pinOkKey = (slug: string) => `pin-ok:${slug}`

function pinRemembered(shiori: Shiori): boolean {
  const sec = shiori.security
  const localPin = sec?.adminPin
  // ローカル文書にPINがある(幹事端末・組み込みデモ)か、サーバーがPINありと言っている(スタッフ端末)
  if (!localPin && !sec?.hasPin) return true
  try {
    if (localPin) return sessionStorage.getItem(pinKey(shiori.slug)) === localPin
    return sessionStorage.getItem(pinOkKey(shiori.slug)) === '1'
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
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ok = pinRemembered(shiori) || unlockedSlug === shiori.slug

  if (ok) return <>{children}</>

  const unlock = (storageKey: string, value: string) => {
    try {
      sessionStorage.setItem(storageKey, value)
    } catch {
      // 保存できなくてもこのタブでは通す
    }
    setUnlockedSlug(shiori.slug)
    setInput('')
  }

  const submit = async () => {
    const value = input.trim()
    if (!value) return
    const localPin = shiori.security?.adminPin
    if (localPin) {
      // 幹事端末・組み込みデモ: ローカル照合
      if (value === localPin) unlock(pinKey(shiori.slug), value)
      else setError('管理コードが違います。')
      return
    }
    // スタッフ端末: サーバー照合(成功で点呼用スタッフキーも受け取る)
    setBusy(true)
    const res = await verifyPin(shiori.slug, value)
    setBusy(false)
    if (res === 'ok') unlock(pinOkKey(shiori.slug), '1')
    else if (res === 'wrong') setError('管理コードが違います。')
    else setError('通信できませんでした。電波の良い場所でもう一度お試しください。')
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
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            style={{ fontSize: 20, textAlign: 'center', letterSpacing: '0.2em' }}
          />
          {error && (
            <div className="note-l warn" style={{ color: 'var(--warn)' }}>
              {error}
            </div>
          )}
          <button className="btn sm" onClick={() => void submit()} disabled={busy}>
            {busy ? '確認しています…' : '開く'}
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

/** URLの :slug からしおりを解決してページに渡す(サーバー同期つき) */
export function withShiori(Inner: (props: { shiori: Shiori }) => JSX.Element | null) {
  return function ShioriRoute() {
    const { slug } = useParams()
    const status = useShioriSync(slug)
    const shiori = findShiori(slug)
    if (!shiori) return status === 'loading' ? <LoadingScreen /> : <NotFound />
    return <Inner shiori={shiori} />
  }
}

/** 管理画面用: しおり解決+サーバー同期+管理コードゲート */
export function withManagedShiori(Inner: (props: { shiori: Shiori }) => JSX.Element | null) {
  return function ManagedShioriRoute() {
    const { slug } = useParams()
    const status = useShioriSync(slug)
    const shiori = findShiori(slug)
    if (!shiori) return status === 'loading' ? <LoadingScreen /> : <NotFound />
    return (
      <PinGate shiori={shiori}>
        <Inner shiori={shiori} />
      </PinGate>
    )
  }
}
