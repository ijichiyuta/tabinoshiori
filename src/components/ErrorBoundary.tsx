import { Component, type ReactNode } from 'react'

interface State {
  hasError: boolean
}

/**
 * 最後の砦。未知のエラーでも白画面にせず、復帰手段を出す。
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('ErrorBoundary caught:', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="app">
        <div className="app-body" style={{ padding: '48px 24px' }}>
          <h1 className="serif" style={{ fontSize: 23, fontWeight: 600, margin: 0 }}>
            表示に失敗しました
          </h1>
          <p style={{ color: 'var(--sub)', lineHeight: 1.8, fontSize: 14.5 }}>
            ご迷惑をおかけしています。再読み込みで直ることがほとんどです。
            直らない場合は、トップページから開き直してください。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 18 }}>
            <button className="btn sm" onClick={() => window.location.reload()}>
              再読み込み
            </button>
            <a className="btn-ghost" href="/">
              トップページへ
            </a>
          </div>
        </div>
      </div>
    )
  }
}
