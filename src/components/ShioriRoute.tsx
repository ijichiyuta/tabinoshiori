import { Link, useParams } from 'react-router-dom'
import { findShiori } from '../lib/docs'
import type { Shiori } from '../lib/types'

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
export function withShiori(Inner: (props: { shiori: Shiori }) => JSX.Element) {
  return function ShioriRoute() {
    const { slug } = useParams()
    const shiori = findShiori(slug)
    if (!shiori) return <NotFound />
    return <Inner shiori={shiori} />
  }
}
