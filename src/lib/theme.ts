import type { Shiori } from './types'

/**
 * しおりごとのテーマ。
 * classic: 和・明朝(既定、要件定義のデザイン)
 * casual: 完全ゴシック+白地+大きめ角丸+明るめの藍
 */
export function themeClass(shiori?: Shiori): string {
  return shiori?.theme === 'casual' ? ' theme-casual' : ''
}
