/**
 * 共有URLは保存された文字列ではなく、常に実際のオリジンから導出する。
 * (ドメイン変更・ローカル/本番の差異・過去の誤保存に影響されないため)
 */
export function shareUrlFor(slug: string): string {
  return `${window.location.origin}/s/${slug}`
}

/** 表示用(プロトコルなし) */
export function shareDisplay(slug: string): string {
  return `${window.location.host}/s/${slug}`
}
