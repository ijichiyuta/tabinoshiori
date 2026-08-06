// 全画面スクリーンショット(要: npm run preview -- --port 4173)
// 出力先: /tmp/shiori-shots
import { chromium } from 'playwright-core'

const base = 'http://localhost:4173'
const out = '/tmp/shiori-shots'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 900 } })

// 高橋として本人選択済み+持ち物3件チェック済みの状態を作る
await page.goto(base + '/s/tob2026')
await page.evaluate(() => {
  const raw = localStorage.getItem('shiori:tob2026')
  const s = raw ? JSON.parse(raw) : { answers: {}, checked: ['wear', 'towel', 'meds'] }
  s.memberId = 'takahashi'
  localStorage.setItem('shiori:tob2026', JSON.stringify(s))
})

const shots = [
  ['/s/tob2026', '02-cover'],
  ['/s/tob2026?photo=1', '03-cover-photo'],
  ['/s/tob2026/schedule?now=2026-08-22T10:42', '04-schedule-now'],
  ['/s/tob2026/schedule?now=2026-08-22T11:30', '05-schedule-live'],
  ['/s/tob2026/items', '06-items'],
  ['/s/tob2026/contacts', '07-contacts'],
  ['/s/tob2026/rsvp', '08-rsvp-form'],
  ['/publish/tob2026', '09-publish-plan'],
  ['/publish/tob2026/pay', '10-publish-pay'],
  ['/s/kino2026', '11-duo-cover'],
  ['/s/kino2026/costs', '12-duo-costs'],
  ['/s/tob2026/print', '13-print'],
  ['/', '14-home'],
  ['/s/tob2026/card', '16-share-card'],
  ['/manage', '20-manage-home'],
  ['/manage/tob2026', '21-manage-hub'],
  ['/manage/tob2026/edit', '22-manage-edit'],
  ['/manage/tob2026/schedule', '23-manage-schedule'],
  ['/manage/tob2026/members', '24-manage-members'],
  ['/manage/kino2026/costs', '25-manage-costs'],
]

for (const [path, name] of shots) {
  await page.goto(base + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true })
  console.log('shot', name)
}

await browser.close()
