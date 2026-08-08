import { SHIORI_LIST } from './data'
import { deleteDocRemote, pushDoc } from './sync'
import type { Shiori, ShioriKind } from './types'

/**
 * しおり文書のリポジトリ。
 * 組み込みデモ(data.ts)はそのまま、編集・新規作成分は localStorage に保存する。
 * 組み込みデモを編集すると copy-on-write で localStorage 側が優先される。
 */
const INDEX_KEY = 'shiori-docs'
const docKey = (slug: string) => `shiori-doc:${slug}`

export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 8)
}

/** 招待リンク用トークン。なりすまし防止の資格情報なので暗号乱数で生成する(URL安全) */
export function newMemberToken(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function readIndex(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr.filter((x) => typeof x === 'string')
    }
  } catch {
    // 壊れていたら空扱い
  }
  return []
}

function writeIndex(slugs: string[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify([...new Set(slugs)]))
}

/** 手で改ざんされた文書でも描画がクラッシュしない最低限の形を検証する */
function isShioriDoc(x: unknown): x is Shiori {
  if (typeof x !== 'object' || x === null) return false
  const s = x as Record<string, unknown>
  return (
    typeof s.slug === 'string' &&
    typeof s.title === 'string' &&
    (s.kind === 'group' || s.kind === 'duo' || s.kind === 'tour') &&
    Array.isArray(s.members) &&
    s.members.every((m) => typeof m === 'object' && m !== null) &&
    Array.isArray(s.days) &&
    s.days.every(
      (d) => typeof d === 'object' && d !== null && Array.isArray((d as { events?: unknown }).events),
    ) &&
    Array.isArray(s.checklist) &&
    Array.isArray(s.contacts) &&
    Array.isArray(s.updates)
  )
}

export function loadDoc(slug: string): Shiori | null {
  try {
    const raw = localStorage.getItem(docKey(slug))
    if (raw) {
      const parsed = JSON.parse(raw)
      if (isShioriDoc(parsed)) return parsed
    }
  } catch {
    // 壊れた文書は無視して組み込みへフォールバック
  }
  return null
}

const docTsKey = (slug: string) => `doc-ts:${slug}`

/** ローカル文書の最終保存時刻(pullの巻き戻し防止に使う) */
export function docSavedAt(slug: string): number {
  try {
    // 不正値でNaNになると `updatedAt >= NaN` が常にfalseになり、
    // その端末が以後サーバー更新を一切受け取れなくなる(NaN毒)。有限数以外は0扱い
    const n = Number(localStorage.getItem(docTsKey(slug)) ?? 0)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

/** ローカル保存のみ(サーバーからのpull反映用。pushしない) */
export function saveDocLocal(doc: Shiori, ts: number = Date.now()) {
  localStorage.setItem(docKey(doc.slug), JSON.stringify(doc))
  try {
    localStorage.setItem(docTsKey(doc.slug), String(ts))
  } catch {
    // no-op
  }
  writeIndex([...readIndex(), doc.slug])
}

export function saveDoc(doc: Shiori) {
  // ツアーの入口は個別リンク(トークン)前提のため、未発行のお客様には保存時に自動発行する
  // (氏名+電話下4桁の照合もトークン発行済みのお客様に限られる)
  if (doc.kind === 'tour' && doc.members.some((m) => !m.token)) {
    doc = { ...doc, members: doc.members.map((m) => (m.token ? m : { ...m, token: newMemberToken() })) }
  }
  saveDocLocal(doc)
  // 組み込みデモはバンドル同梱なので同期しない(slug衝突も防ぐ)
  if (!isBuiltin(doc.slug)) void pushDoc(doc)
}

export function deleteDoc(slug: string) {
  const builtin = isBuiltin(slug)
  try {
    localStorage.removeItem(docKey(slug))
    localStorage.removeItem(docTsKey(slug))
    // 組み込みデモの「デモに戻す」では編集(文書)だけを破棄し、
    // 参加者の状態(回答・課金など)は残す。新規しおりの削除では関連キーも一掃する
    if (!builtin) {
      localStorage.removeItem(`shiori:${slug}`) // 保存済みの回答・点呼など(store.ts)
      sessionStorage.removeItem(`pin:${slug}`)
      sessionStorage.removeItem(`pin-ok:${slug}`)
    }
  } catch {
    // no-op
  }
  writeIndex(readIndex().filter((s) => s !== slug))
  // admin-key / staff-key はサーバー削除の成否を見てから deleteDocRemote 側で消す
  if (!builtin) void deleteDocRemote(slug)
}

export function isBuiltin(slug: string): boolean {
  return SHIORI_LIST.some((s) => s.slug === slug)
}

export function hasDoc(slug: string): boolean {
  return loadDoc(slug) !== null
}

/** 参加者・幹事の全画面が使う解決関数。編集版があればそちらを返す。 */
export function findShiori(slug: string | undefined): Shiori | undefined {
  if (!slug) return undefined
  return loadDoc(slug) ?? SHIORI_LIST.find((s) => s.slug === slug)
}

export interface ShioriListing {
  shiori: Shiori
  isCustom: boolean // 新規作成されたもの
  isEdited: boolean // 組み込みデモを編集したもの
}

export function listAllShiori(): ShioriListing[] {
  const docSlugs = readIndex()
  const builtins: ShioriListing[] = SHIORI_LIST.map((b) => {
    const doc = loadDoc(b.slug)
    return { shiori: doc ?? b, isCustom: false, isEdited: doc !== null }
  })
  const customs: ShioriListing[] = docSlugs
    .filter((s) => !isBuiltin(s))
    .map((s) => loadDoc(s))
    .filter((d): d is Shiori => d !== null)
    .map((d) => ({ shiori: d, isCustom: true, isEdited: false }))
  return [...builtins, ...customs]
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export function dayLabelFromDate(date: string, index: number): string {
  const d = new Date(`${date}T00:00:00`)
  if (isNaN(d.getTime())) return `${index + 1}日目`
  return `${index + 1}日目 ${d.getMonth() + 1}/${d.getDate()}`
}

export function dateLabelRange(dates: string[]): string {
  const valid = dates.filter((s) => !isNaN(new Date(`${s}T00:00:00`).getTime()))
  const firstStr = valid[0]
  if (!firstStr) return ''
  const lastStr = valid[valid.length - 1] ?? firstStr
  const f = (s: string) => {
    const d = new Date(`${s}T00:00:00`)
    return `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()] ?? ''})`
  }
  const first = new Date(`${firstStr}T00:00:00`)
  const head = `${first.getFullYear()}年${f(firstStr)}`
  if (valid.length === 1) return `${head}　日帰り`
  const nights = valid.length - 1
  return `${head} 〜 ${f(lastStr)}　${nights}泊${valid.length}日`
}

/** 既存しおりの複製(定期催行・翌年の旅行向け)。複製後の文書を保存して返す。 */
export function duplicateShiori(src: Shiori): Shiori {
  const copy = structuredClone(src)
  copy.slug = uid('s')
  copy.shareUrl = `tabiawase.com/s/${copy.slug}`
  copy.title = `${src.title}(コピー)`
  saveDoc(copy)
  return copy
}

/** 新規しおりのテンプレート */
export function createShiori(kind: ShioriKind): Shiori {
  const slug = uid('s')
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const base: Shiori = {
    slug,
    kind,
    coverLabel: kind === 'duo' ? 'た　び　の　記　録' : 'し　お　り',
    cornerNote: kind === 'duo' ? '2名' : `No. ${ym}`,
    eyebrow: kind === 'duo' ? 'ふたりの旅' : kind === 'tour' ? '催行会社名' : '団体名',
    title: kind === 'tour' ? '新しいツアー' : '新しい旅',
    subtitle: kind === 'tour' ? '日帰りバスツアー' : '行き先',
    dateLabel: dateLabelRange([date]),
    organizerId: 'm1',
    members:
      kind === 'duo'
        ? [
            { id: 'm1', name: '同行者1' },
            { id: 'm2', name: '同行者2' },
          ]
        : kind === 'tour'
          ? [{ id: 'm1', name: 'お客様1', boardingPointId: 'bp1' }]
          : [{ id: 'm1', name: '幹事', role: '幹事' }],
    seedRsvps: {},
    attendanceOptions: kind === 'group' ? ['参加', '不参加'] : [],
    transportOptions: kind === 'group' ? ['自家用車', '電車', '現地集合'] : [],
    days: [
      {
        id: uid('d'),
        date,
        label: dayLabelFromDate(date, 0),
        events: [
          {
            id: uid('e'),
            time: '9:00',
            title: '集合',
            desc: '集合場所を入力',
          },
        ],
      },
    ],
    checklist: [],
    contacts: [],
    updates: [],
    shareUrl: `tabiawase.com/s/${slug}`,
  }
  if (kind === 'duo') {
    base.expenses = []
    base.reservations = []
  } else if (kind === 'tour') {
    base.destination = ''
    base.boardingPoints = [{ id: 'bp1', name: '乗車地1', time: '8:00' }]
    base.operator = { name: '催行会社名' }
    base.notices = []
  } else {
    base.fee = { rows: [{ category: '一般', amount: 0 }] }
    base.destination = ''
  }
  return base
}

/** "0599-XX-XXXX" のような表示用番号から tel: リンクを作る(数字以外は0扱いでダミー化) */
export function telFromDisplay(display: string): { display: string; href: string } | undefined {
  const t = display.trim()
  if (!t) return undefined
  const digits = t.replace(/[^0-9]/g, (c) => (/[XxＸ×]/.test(c) ? '0' : ''))
  return { display: t, href: `tel:${digits || '0'}` }
}

const MAP_PREFIX = 'https://www.google.com/maps/search/'

export function mapUrlFromQuery(q: string): string | undefined {
  const t = q.trim()
  if (!t) return undefined
  if (/^https?:\/\//.test(t)) return t
  return MAP_PREFIX + encodeURIComponent(t)
}

export function mapQueryFromUrl(url: string | undefined): string {
  if (!url) return ''
  if (url.startsWith(MAP_PREFIX)) {
    try {
      return decodeURIComponent(url.slice(MAP_PREFIX.length))
    } catch {
      return url
    }
  }
  return url
}
