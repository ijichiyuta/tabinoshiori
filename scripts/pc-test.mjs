// PC最適化レイアウト(管理画面2ペイン)と参加者スマホ枠維持の検証
import { chromium } from 'playwright-core'

const base = process.env.BASE || 'http://localhost:8787'
const browser = await chromium.launch()

let failed = 0
const check = (name, cond) => {
  console.log(cond ? '  ✓' : '  ✗', name)
  if (!cond) failed++
}

// ===== PC幅: 管理画面は2ペイン(左サイドバー+右編集) =====
const pc = await browser.newPage({ viewport: { width: 1280, height: 900 } })
// ダイアログは各テストで個別に扱う(未保存離脱ガードの確認を検証するため、
// ここでは一律 accept しない)。

await pc.goto(base + '/manage/tob2026/schedule', { waitUntil: 'load' })
await pc.waitForSelector('.manage-sidenav', { timeout: 8000 })
check('PC: 編集画面に左サイドバーが表示される', await pc.locator('.manage-side').isVisible())
check(
  'PC: 現在のセクション(行程)がハイライトされる',
  (await pc.locator('.manage-sidenav a.on:has-text("行程")').count()) === 1,
)
check('PC: 戻るリンクはPCでは非表示', !(await pc.locator('.manage-shell .manage-header .back').isVisible()))
check('PC: 保存バーが表示される', await pc.locator('.save-bar button').isVisible())

// サイドバーから別セクションへ移動できる
await pc.click('.manage-sidenav a:has-text("持ち物")')
await pc.waitForURL('**/manage/tob2026/items')
check(
  'PC: サイドバーからセクション移動できる',
  (await pc.locator('.manage-sidenav a.on:has-text("持ち物")').count()) === 1,
)

// 概要(ハブ)へ戻れる & 在ページの編集ナビはPCで隠れる(重複回避)
await pc.click('.manage-sidenav-hub')
await pc.waitForURL(/\/manage\/tob2026$/)
check('PC: 概要(ハブ)へ戻れる', (await pc.locator('text=公開・共有').count()) > 0)
check('PC: ハブでは在ページの編集ナビが隠れる', !(await pc.locator('.hub-edit-nav').isVisible()))

// ツアーのサイドバーには当日運行(点呼・招待リンク・アンケート)が出る
await pc.goto(base + '/manage/hama2026', { waitUntil: 'load' })
if ((await pc.locator('input[type="password"]').count()) > 0) {
  await pc.fill('input[type="password"]', '0829')
  await pc.click('button:has-text("開く")')
  await pc.waitForTimeout(500)
}
await pc.waitForSelector('.manage-sidenav', { timeout: 8000 })
check('PC(ツアー): 乗車地がサイドバーにある', (await pc.locator('.manage-sidenav a:has-text("乗車地")').count()) === 1)
check('PC(ツアー): 点呼・乗車確認がサイドバーにある', (await pc.locator('.manage-sidenav a:has-text("点呼")').count()) === 1)

// 参加者ページはPCでもスマホ枠(manage-appにならない)
await pc.goto(base + '/s/tob2026', { waitUntil: 'load' })
await pc.waitForSelector('.app', { timeout: 8000 })
check(
  'PC: 参加者ページはスマホ枠のまま(manage-appでない)',
  (await pc.locator('.app.manage-app').count()) === 0 && (await pc.locator('.app').count()) >= 1,
)

// 未保存離脱ガード: 編集後にサイドバーで移動しようとすると確認が出る。
// 確認をキャンセル(dismiss)すると /edit に留まることを検証。
let leaveAsked = false
pc.on('dialog', (d) => {
  leaveAsked = true
  d.dismiss().catch(() => {})
})
await pc.goto(base + '/manage/tob2026/edit', { waitUntil: 'load' })
await pc.waitForSelector('.manage-content input.text-input', { timeout: 8000 })
await pc.locator('.manage-content input.text-input').first().fill('未保存の編集テスト')
await pc.waitForTimeout(150)
await pc.locator('.manage-sidenav a:has-text("持ち物")').click()
await pc.waitForTimeout(500)
check(
  'PC: 未保存で移動しようとすると確認が出て、キャンセルで留まる',
  leaveAsked && pc.url().includes('/edit'),
)

// ===== モバイル幅: サイドバーは出ず、従来の1カラム =====
const mob = await browser.newPage({ viewport: { width: 390, height: 900 } })
await mob.goto(base + '/manage/tob2026/schedule', { waitUntil: 'load' })
await mob.waitForSelector('.manage-app', { timeout: 8000 })
check('モバイル: サイドバーは非表示', !(await mob.locator('.manage-side').isVisible()))
check('モバイル: 戻るリンクが表示される', await mob.locator('.manage-header .back').isVisible())

await browser.close()
console.log(failed === 0 ? '\nPC ALL PASS' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
