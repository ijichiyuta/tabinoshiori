// 全ルート×異常状態のエラークロール(要: npm run preview -- --port 4173)
// すべてのページを「まっさら/選択済み/支払い済/壊れたstorage/空データのしおり」で開き、
// 未捕捉例外(pageerror)と console.error がゼロであることを検証する。
import { chromium } from 'playwright-core'

const base = 'http://localhost:4173'

const ROUTES = [
  '/',
  '/manage',
  '/s/tob2026',
  '/s/tob2026?photo=1',
  '/s/tob2026/schedule',
  '/s/tob2026/schedule?now=2026-08-22T10:42',
  '/s/tob2026/items',
  '/s/tob2026/contacts',
  '/s/tob2026/costs', // グループに費用ページ(種別違いの直URL)
  '/s/tob2026/updates',
  '/s/tob2026/rsvp/who',
  '/s/tob2026/rsvp',
  '/s/tob2026/rsvp/done',
  '/s/tob2026/print',
  '/s/tob2026/card',
  '/publish/tob2026',
  '/publish/tob2026/pay',
  '/publish/tob2026/pay?plan=year',
  '/publish/tob2026/done',
  '/publish/tob2026/receipt',
  '/manage/tob2026',
  '/manage/tob2026/edit',
  '/manage/tob2026/schedule',
  '/manage/tob2026/members',
  '/manage/tob2026/items',
  '/manage/tob2026/contacts',
  '/manage/tob2026/updates',
  '/manage/tob2026/costs', // グループに費用エディタ(直URL)
  '/s/kino2026',
  '/s/kino2026/schedule',
  '/s/kino2026/items',
  '/s/kino2026/contacts', // 少人数に連絡先(直URL)
  '/s/kino2026/costs',
  '/s/kino2026/updates',
  '/s/kino2026/rsvp/who', // 少人数に出欠(直URL)
  '/s/kino2026/rsvp',
  '/s/kino2026/print',
  '/s/kino2026/card',
  '/manage/kino2026',
  '/manage/kino2026/edit',
  '/manage/kino2026/members',
  '/manage/kino2026/costs',
  '/s/hama2026',
  '/s/hama2026?t=invalidtoken',
  '/manage/hama2026/links',
  '/s/hama2026/schedule',
  '/s/hama2026/schedule?now=2026-08-29T10:30',
  '/s/hama2026/items',
  '/s/hama2026/contacts',
  '/s/hama2026/updates',
  '/s/hama2026/notices',
  '/s/hama2026/survey',
  '/s/hama2026/rsvp/who',
  '/s/hama2026/rsvp', // ツアーに出欠フォーム(直URL) → 表紙へ
  '/s/hama2026/rsvp/done',
  '/s/hama2026/costs',
  '/s/hama2026/print',
  '/s/hama2026/card',
  '/publish/hama2026',
  '/manage/hama2026',
  '/manage/hama2026/edit',
  '/manage/hama2026/schedule',
  '/manage/hama2026/members',
  '/manage/hama2026/boarding',
  '/manage/hama2026/notices',
  '/manage/hama2026/checkin',
  '/manage/hama2026/survey',
  '/manage/hama2026/costs', // ツアーに費用エディタ(直URL)
  '/manage/tob2026/boarding', // グループに乗車地エディタ(直URL)
  '/manage/tob2026/checkin',
  '/s/unknown',
  '/manage/unknown',
  '/publish/unknown',
  '/nonexistent/deep/path',
]

// しおりの必須フィールドだけ埋めた「空っぽ」文書(エディタで全部消した状態の再現)
const EMPTY_DOC = JSON.stringify({
  slug: 'tob2026',
  kind: 'group',
  coverLabel: '',
  cornerNote: '',
  eyebrow: '',
  title: '空のしおり',
  subtitle: '',
  dateLabel: '',
  organizerId: 'x',
  members: [{ id: 'm1', name: '' }],
  seedRsvps: {},
  attendanceOptions: [],
  transportOptions: [],
  fee: { rows: [] },
  days: [],
  checklist: [],
  contacts: [],
  updates: [],
  shareUrl: 'trip-shiori.jp/s/tob2026',
})

const STATES = [
  { name: 'まっさら', setup: `localStorage.clear()` },
  {
    name: '本人選択済み',
    setup: `localStorage.clear(); localStorage.setItem('shiori:tob2026', JSON.stringify({ memberId: 'takahashi', answers: {}, checked: [] }))`,
  },
  {
    name: '支払い済み',
    setup: `localStorage.clear(); localStorage.setItem('shiori:tob2026', JSON.stringify({ memberId: 'takahashi', answers: {}, checked: [], billing: { plan: 'one', paidAt: '2026-08-12T21:11:00', last4: '3456' } }))`,
  },
  {
    name: '壊れたJSON',
    setup: `localStorage.clear(); localStorage.setItem('shiori:tob2026', '{oops'); localStorage.setItem('shiori-doc:tob2026', 'not json'); localStorage.setItem('shiori-docs', '42')`,
  },
  {
    name: '型が壊れた値',
    setup: `localStorage.clear();
      localStorage.setItem('shiori:tob2026', JSON.stringify({ memberId: 99, answers: 'yes', checked: 'abc', billing: { plan: 'gold' }, dismissedUpdates: 7 }));
      localStorage.setItem('shiori:kino2026', JSON.stringify({ answers: { misaki: 'ok' }, checked: [1, 2, null] }));
      localStorage.setItem('shiori-doc:kino2026', JSON.stringify({ slug: 'kino2026', days: 'none' }));
      localStorage.setItem('shiori-docs', JSON.stringify([null, 5, 'ghost']))`,
  },
  {
    name: '空のしおり文書',
    setup: `localStorage.clear(); localStorage.setItem('shiori-docs', JSON.stringify(['tob2026'])); localStorage.setItem('shiori-doc:tob2026', ${JSON.stringify(EMPTY_DOC)}); localStorage.setItem('shiori:tob2026', JSON.stringify({ memberId: 'm1', answers: {}, checked: [] }))`,
  },
]

const browser = await chromium.launch()
let totalErrors = 0

for (const state of STATES) {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } })
  page.on('dialog', (d) => d.accept())
  const errors = []
  page.on('pageerror', (e) => errors.push(`[例外] ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`)
  })

  await page.goto(base + '/')
  await page.evaluate(state.setup)

  for (const route of ROUTES) {
    const before = errors.length
    try {
      await page.goto(base + route, { waitUntil: 'load', timeout: 15000 })
      await page.waitForTimeout(250)
    } catch (e) {
      errors.push(`[navigation] ${route}: ${e.message?.split('\n')[0]}`)
    }
    const added = errors.slice(before)
    for (const err of added) console.log(`  ✗ ${state.name} ${route} ${err}`)
  }

  console.log(
    errors.length === 0
      ? `✓ ${state.name}: ${ROUTES.length}ルート エラーなし`
      : `✗ ${state.name}: エラー ${errors.length}件`,
  )
  totalErrors += errors.length
  await page.close()
}

await browser.close()
console.log(totalErrors === 0 ? '\nALL CLEAN' : `\n${totalErrors} ERRORS`)
process.exit(totalErrors === 0 ? 0 : 1)
