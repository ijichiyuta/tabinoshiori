import type { ReactNode } from 'react'
import { TabBar, type TabKey } from './TabBar'
import type { Shiori } from '../lib/types'

/** モバイル1画面ぶんの枠。tab を渡すと下部タブバー付きになる。 */
export function AppFrame({
  shiori,
  tab,
  children,
}: {
  shiori?: Shiori
  tab?: TabKey
  children: ReactNode
}) {
  return (
    <div className="app">
      <div className={`app-body${tab ? ' with-tabbar' : ''}`}>{children}</div>
      {shiori && tab && <TabBar shiori={shiori} active={tab} />}
    </div>
  )
}
