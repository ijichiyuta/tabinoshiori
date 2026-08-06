// 主要フローの動作確認スクリプト(要: npm run preview -- --port 4173)
import { chromium } from 'playwright-core'

const base = 'http://localhost:4173'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 900 } })
page.on('dialog', (d) => d.accept())

let failed = 0
const check = (name, cond) => {
  console.log(cond ? '  ✓' : '  ✗', name)
  if (!cond) failed++
}

// 毎回まっさらな状態から始める
await page.goto(base + '/')
await page.evaluate(() => localStorage.clear())

// 1) 本人選択 → 出欠回答 → 送信 → 完了
await page.goto(base + '/s/tob2026')
await page.waitForURL('**/rsvp/who')
await page.click('.roster button:has-text("高橋")')
await page.waitForURL('**/rsvp')
await page.click('.choice-grid button:has-text("1日目のみ")')
await page.click('.radio-list button:has-text("新幹線・電車")')
await page.click('button:has-text("PayPay で送金する")')
await page.waitForTimeout(200)
check('PayPay送金デモで支払い済になる', (await page.locator('.badge:has-text("支払い済")').count()) > 0)
await page.click('button:has-text("この内容で回答する")')
await page.waitForURL('**/rsvp/done')
check('回答を受け付けました', (await page.locator('text=回答を受け付けました').count()) > 0)
check('完了画面に1日目のみ', (await page.locator('text=1日目のみ').count()) > 0)

// 2) 表紙に回答が反映される
await page.goto(base + '/s/tob2026')
await page.waitForSelector('.panel-head')
const head = await page.locator('.panel-head').innerText()
check('表紙カードに回答状態が反映', head.includes('高橋') && head.includes('1日目のみ'))
check('参加数が11に更新(1日目のみ含む)', (await page.locator('text=参加11').count()) > 0)

// 3) 持ち物チェックがリロード後も残る
await page.goto(base + '/s/tob2026/items')
await page.click('.check-list button:has-text("ラケット")')
await page.reload()
await page.waitForSelector('.check-list')
check('チェックが永続化される', (await page.locator('.check-box.on').count()) === 4)

// 4) 課金: プラン選択 → カード支払い → 完了
await page.goto(base + '/publish/tob2026')
check('無料プランが人数超過の警告を表示', (await page.locator('text=上限を超えています').count()) > 0)
await page.click('button:has-text("お支払いへ進む")')
await page.waitForURL('**/pay**')
await page.fill('input[placeholder="1234 5678 9012 3456"]', '4111 1111 1111 3456')
await page.fill('input[placeholder="MM / YY"]', '12 / 28')
await page.fill('input[placeholder="3桁"]', '123')
await page.click('button:has-text("を支払う")')
await page.waitForURL('**/done')
check('支払い完了画面', (await page.locator('text=お支払いが完了しました').count()) > 0)
check('カード末尾表示', (await page.locator('text=カード末尾 3456').count()) > 0)
check('公開中(人数無制限)', (await page.locator('text=人数無制限').count()) > 0)

// 5) 支払い後は印刷の透かしが消える
await page.goto(base + '/s/tob2026/print')
check('透かしなし', (await page.locator('.print-watermark').count()) === 0)

// 6) 少人数版: 精算のPayPayデモ
await page.goto(base + '/s/kino2026/costs')
await page.click('button:has-text("PayPay で送金する")')
await page.waitForTimeout(200)
check('精算済みバッジ', (await page.locator('.badge:has-text("精算済み")').count()) > 0)

// 7) 未知のslugは404
await page.goto(base + '/s/unknown')
check('しおりが見つかりません', (await page.locator('text=しおりが見つかりません').count()) > 0)

await browser.close()
console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
