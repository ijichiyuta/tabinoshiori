export type ShioriKind = 'group' | 'duo'

export interface Member {
  id: string
  name: string
  role?: string // 幹事 など
  category?: string // 一般 / 学生
}

export interface RsvpAnswer {
  attendance: string // 参加 / 不参加 / 1日目のみ など
  transport?: string
  paid: boolean
  answeredAt?: string // ISO
}

export interface ItineraryEvent {
  id: string
  time: string // "7:30"
  end?: string // "16:00" 期間のあるイベント
  title: string
  kind?: 'event' | 'transit'
  desc?: string // 場所や補足の1行
  mapUrl?: string
  tel?: { display: string; href: string }
  note?: string
  noteLevel?: 'warn' | 'info'
  tag?: string // 自由参加 など
}

export interface ItineraryDay {
  id: string
  date: string // "2026-08-22" (ローカル日付)
  label: string // "1日目 8/22"
  events: ItineraryEvent[]
}

export interface ChecklistItem {
  id: string
  label: string
  note?: string
}

export interface Contact {
  id: string
  label: string // 幹事 / 宿 など
  name: string
  tel?: { display: string; href: string }
  note?: string
}

export interface Update {
  id: string
  date: string // "8/20"
  text: string
}

export interface Expense {
  id: string
  label: string
  payerId: string
  amount: number
}

export interface Fee {
  rows: { category: string; amount: number }[]
  deadline?: string // "8/15"
}

export interface Shiori {
  slug: string
  kind: ShioriKind
  coverLabel: string // し お り / た び の 記 録
  cornerNote: string // No. 2026-08 / 2名
  eyebrow: string // バドミントンサークル / 結婚記念日の旅
  title: string // 夏合宿 2026 / 城崎温泉
  subtitle: string // 三重・鳥羽 / 二泊三日の湯めぐり
  photo?: string // 表紙写真(未設定ならタイポグラフィ表紙)
  dateLabel: string
  destination?: string
  lodging?: { name: string; tel?: { display: string; href: string } }
  members: Member[]
  organizerId: string
  seedRsvps: Record<string, RsvpAnswer | null> // null = 未回答
  attendanceOptions: string[]
  transportOptions: string[]
  fee?: Fee
  days: ItineraryDay[]
  checklist: ChecklistItem[]
  checklistSeedChecked?: string[]
  contacts: Contact[]
  updates: Update[]
  expenses?: Expense[]
  reservations?: string[]
  coverBadge?: string // 宿代 前払済 ✓
  shareUrl: string // trip-shiori.jp/s/tob2026
}

export interface Billing {
  plan: 'free' | 'one' | 'year'
  paidAt: string // ISO
  last4?: string
  method?: string
}
