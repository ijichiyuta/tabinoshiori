import type { Expense, Member } from './types'

export interface Settlement {
  total: number
  perHead: number
  transfers: { fromId: string; toId: string; amount: number }[]
}

/** 立替額から均等割りの精算を計算する(端数は幹事側が吸収)。 */
export function computeSettlement(expenses: Expense[], members: Member[]): Settlement {
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const perHead = Math.round(total / members.length)
  const balance = new Map<string, number>()
  for (const m of members) balance.set(m.id, -perHead)
  for (const e of expenses) balance.set(e.payerId, (balance.get(e.payerId) ?? 0) + e.amount)

  const debtors = members
    .filter((m) => (balance.get(m.id) ?? 0) < 0)
    .map((m) => ({ id: m.id, amt: -(balance.get(m.id) ?? 0) }))
  const creditors = members
    .filter((m) => (balance.get(m.id) ?? 0) > 0)
    .map((m) => ({ id: m.id, amt: balance.get(m.id) ?? 0 }))

  const transfers: Settlement['transfers'] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt)
    if (pay > 0) transfers.push({ fromId: debtors[i].id, toId: creditors[j].id, amount: pay })
    debtors[i].amt -= pay
    creditors[j].amt -= pay
    if (debtors[i].amt <= 0) i++
    if (creditors[j].amt <= 0) j++
  }
  return { total, perHead, transfers }
}

export function yen(n: number): string {
  return `¥${n.toLocaleString('ja-JP')}`
}
