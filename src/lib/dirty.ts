// 編集中の未保存フラグ(単一のエディタしか同時にマウントされない前提の軽量シングルトン)。
// PCではサイドバーで別セクションへ移動できるため、未保存のまま離脱して
// 入力が消える事故を防ぐ。

let dirty = false

export function setDirty(v: boolean): void {
  dirty = v
}

export function isDirty(): boolean {
  return dirty
}

/** 未保存の変更があれば確認する。移動してよければ true を返す(その際フラグは下ろす)。 */
export function confirmLeave(): boolean {
  if (!dirty) return true
  const ok = window.confirm('保存していない変更があります。破棄して移動しますか?')
  if (ok) dirty = false
  return ok
}
