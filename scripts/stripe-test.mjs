// Stripeテスト決済のE2E(要: STRIPE_SECRET_KEYがテストキーで設定済みの環境)
// しおり作成→公開→Stripe Checkout(テストカード)→完了→課金記録→透かし解除→削除
import { chromium } from 'playwright-core'

const base = process.env.BASE || 'https://tabiawase.com'
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 500, height: 950 } })).newPage()
page.on('dialog', (d) => d.accept())

let failed = 0
const check = (name, cond) => {
  console.log(cond ? '  ✓' : '  ✗', name)
  if (!cond) failed++
}

// 1) しおりを作成(デモではなく実スラッグ=Stripe対象)
await page.goto(base + '/')
await page.evaluate(() => localStorage.clear())
await page.goto(base + '/manage')
await page.click('.create-btn:has-text("バスツアー")')
await page.waitForURL(/\/manage\/s[a-z0-9]+$/)
const slug = page.url().split('/').pop()
console.log('  slug:', slug)
await page.waitForTimeout(2500) // サーバーへのpush待ち

// 2) 公開フロー: 有料プランへ
await page.goto(base + `/publish/${slug}`)
await page.click('button:has-text("お支払いへ進む")')
await page.waitForURL('**/pay**')
await page.waitForSelector('text=Stripeの安全な決済ページ', { timeout: 10000 })
check('Stripeモードの支払い画面(カード欄なし)', (await page.locator('input[placeholder="1234 5678 9012 3456"]').count()) === 0)

// 3) Checkoutへリダイレクト → テストカードで支払う
await page.click('button:has-text("を支払う")')
await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20000 })
check('Stripe Checkoutへ遷移', true)
await page.waitForSelector('input[name="cardNumber"]', { timeout: 20000 })
await page.fill('input[name="email"]', 'test@example.com')
await page.fill('input[name="cardNumber"]', '4242 4242 4242 4242')
await page.fill('input[name="cardExpiry"]', '12 / 34')
await page.fill('input[name="cardCvc"]', '123')
await page.fill('input[name="billingName"]', 'テスト タロウ')
await page.click('.SubmitButton, button[type="submit"]')

// 4) 戻り→確認→完了画面
await page.waitForURL(/\/publish\/.+\/(stripe|done)/, { timeout: 40000 })
await page.waitForSelector('text=お支払いが完了しました', { timeout: 20000 })
check('完了画面(お支払いが完了しました)', true)

// 5) サーバーに課金が記録されている
const state = await (await fetch(`${base}/api/state/${slug}`)).json()
check('D1に課金記録(plan=one)', state.billing?.plan === 'one')
check('金額が¥480', state.billing?.amount === 480)

// 6) 透かしが消え、共有カードが解放される
await page.goto(base + `/s/${slug}/print`)
await page.waitForTimeout(800)
check('印刷の透かしなし', (await page.locator('.print-watermark').count()) === 0)

// 7) 後片付け(しおり削除→課金記録も消える)
await page.goto(base + `/manage/${slug}`)
await page.click('button:has-text("このしおりを削除")')
await page.waitForURL('**/manage')
await page.waitForTimeout(1500)
const gone = await (await fetch(`${base}/api/state/${slug}`)).json()
check('削除で課金記録もクリーンアップ', !gone.billing)

await browser.close()
console.log(failed === 0 ? '\nSTRIPE ALL PASS' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
