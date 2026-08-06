import type { ReactNode } from 'react'
import { TabBar, type TabKey } from './TabBar'
import { themeClass } from '../lib/theme'
import type { Shiori } from '../lib/types'

/** モバイル1画面ぶんの枠。shiori を渡すとテーマが適用され、tab も渡すと下部タブバー付きになる。 */
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
    <div className={`app${themeClass(shiori)}`}>
      <div className={`app-body${tab ? ' with-tabbar' : ''}`}>{children}</div>
      {shiori && tab && <TabBar shiori={shiori} active={tab} />}
    </div>
  )
}
