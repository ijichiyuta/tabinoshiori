// 主要フローの動作確認スクリプト(要: npm run preview -- --port 4173)
import { chromium } from 'playwright-core'

const base = process.env.BASE || 'http://localhost:4173'
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
await page.waitForSelector('text=しおりが見つかりません', { timeout: 10000 })
check('しおりが見つかりません', true)

// 8) 幹事: デモしおりの編集(copy-on-write)とリセット
await page.goto(base + '/manage/tob2026')
await page.click('.manage-nav a:has-text("基本情報")')
await page.waitForURL('**/manage/tob2026/edit')
await page.fill('.form-row:has(.input-label:text-is("タイトル")) input', '秋合宿 2026')
await page.click('.save-bar button')
await page.waitForSelector('.saved-note')
await page.goto(base + '/s/tob2026')
check('編集がしおり表紙に反映', (await page.locator('text=秋合宿 2026').count()) > 0)
await page.goto(base + '/manage/tob2026')
await page.click('button:has-text("編集をリセットしてデモに戻す")')
await page.waitForURL('**/manage')
await page.goto(base + '/s/tob2026')
check('リセットでデモに戻る', (await page.locator('text=夏合宿 2026').count()) > 0)

// 9) 幹事: 新規グループしおり作成 → 編集 → 参加者フロー
await page.goto(base + '/manage')
await page.click('.add-btn:has-text("グループ")')
await page.waitForURL(/\/manage\/s[a-z0-9]+$/)
const newSlug = page.url().split('/').pop()
await page.goto(base + `/manage/${newSlug}/edit`)
await page.fill('.form-row:has(.input-label:text-is("タイトル")) input', '町内会 秋祭り')
await page.click('.save-bar button')
await page.waitForSelector('.saved-note')
await page.goto(base + `/s/${newSlug}`)
await page.waitForURL('**/rsvp/who')
await page.click('.roster button:has-text("幹事")')
await page.waitForURL(`**/s/${newSlug}/rsvp`)
await page.click('.choice-grid button:has-text("参加")')
await page.click('button:has-text("この内容で回答する")')
await page.waitForURL('**/rsvp/done')
await page.click('a:has-text("しおりを見る")')
await page.waitForURL(`**/s/${newSlug}`)
check('新規しおりの表紙にタイトル表示', (await page.locator('text=町内会 秋祭り').count()) > 0)

// 10) 幹事: 6名以下は無料公開できる → 共有カードはゲートされる
await page.goto(base + `/publish/${newSlug}`)
check('6名以下では超過警告なし', (await page.locator('text=上限を超えています').count()) === 0)
await page.click('.plan-card:has-text("無料")')
await page.click('button:has-text("無料で公開する")')
await page.waitForURL('**/done')
check('無料プランで公開', (await page.locator('text=無料プランで公開しました').count()) > 0)
await page.goto(base + `/s/${newSlug}/card`)
check('無料プランでは共有カードがゲート', (await page.locator('text=有料プランの機能です').count()) > 0)

// 11) 有料プラン(tob2026)は共有カードのQRが出る
await page.goto(base + '/s/tob2026/card')
await page.waitForSelector('img[alt="しおりを開くQRコード"]', { timeout: 5000 })
check('共有カードにQRコード', true)

// 12) 幹事: 少人数の立替を追加すると精算が自動再計算される
await page.goto(base + '/manage/kino2026/costs')
await page.click('.add-btn:has-text("立替を追加")')
const lastItem = page.locator('.editor-item').last()
await lastItem.locator('.form-row:has(.input-label:text-is("項目")) input').fill('お土産')
await lastItem.locator('.form-row:has(.input-label:text-is("金額(円)")) input').fill('2000')
await page.click('.save-bar button')
await page.waitForSelector('.saved-note')
await page.goto(base + '/s/kino2026/costs')
check('合計が再計算される(¥70,400)', (await page.locator('text=¥70,400').count()) > 0)
check('精算が再計算される(¥16,800)', (await page.locator('text=¥16,800').count()) > 0)
await page.goto(base + '/manage/kino2026')
await page.click('button:has-text("編集をリセットしてデモに戻す")')
await page.waitForURL('**/manage')

// 13) 幹事: 集金チェックの切り替え
await page.goto(base + '/manage/tob2026/members')
const nakamuraRow = page.locator('.status-row:has-text("中村")')
check('未集金メンバーは「未」表示', (await nakamuraRow.locator('text=未').count()) > 0)
await nakamuraRow.locator('input[type="checkbox"]').click()
await page.waitForTimeout(200)
check('チェックで「済」に変わる', (await nakamuraRow.locator('text=済').count()) > 0)

// 14) しおり削除
await page.goto(base + `/manage/${newSlug}`)
await page.click('button:has-text("このしおりを削除")')
await page.waitForURL('**/manage')
await page.goto(base + `/s/${newSlug}`)
await page.waitForSelector('text=しおりが見つかりません', { timeout: 10000 })
check('削除後は404', true)

// 15) テーマ切り替え(カジュアル=完全ゴシック)
await page.goto(base + '/manage/tob2026/edit')
await page.click('.radio-list button:has-text("カジュアル(ゴシック)")')
await page.click('.save-bar button')
await page.waitForSelector('.saved-note')
await page.goto(base + '/s/tob2026')
check('カジュアルテーマが表紙に適用', (await page.locator('.app.theme-casual').count()) === 1)
await page.goto(base + '/s/tob2026/rsvp')
check('回答フォームにも適用', (await page.locator('.app.theme-casual').count()) === 1)
await page.goto(base + '/manage/tob2026')
await page.click('button:has-text("編集をリセットしてデモに戻す")')
await page.waitForURL('**/manage')
await page.goto(base + '/s/tob2026')
check('リセットで既定テーマに戻る', (await page.locator('.app.theme-casual').count()) === 0)

// 16) 更新告知: 一覧ページと既読(×)
await page.goto(base + '/s/tob2026')
check('更新バナーが表示される', (await page.locator('.update-banner').count()) === 1)
await page.click('.update-banner a')
await page.waitForURL('**/updates')
check('お知らせ一覧に内容が出る', (await page.locator('text=集合時刻が 7:30 に変更されました').count()) > 0)
await page.goto(base + '/s/tob2026')
await page.click('.update-banner button[aria-label="この告知を閉じる"]')
await page.waitForTimeout(150)
check('×で既読になり消える', (await page.locator('.update-banner').count()) === 0)
await page.reload()
await page.waitForTimeout(300)
check('リロード後も既読が保持される', (await page.locator('.update-banner').count()) === 0)

// 16b) カード未入力で支払いを押すとエラー表示(遷移しない)
await page.goto(base + '/publish/kino2026')
await page.click('button:has-text("お支払いへ進む")')
await page.waitForURL('**/pay**')
await page.click('button:has-text("を支払う")')
await page.waitForTimeout(200)
check('未入力エラーが表示される', (await page.locator('text=カード情報を入力してください').count()) > 0)
check('支払いページに留まる', page.url().includes('/pay'))

// 16c) 行程を全削除しても行程ページが壊れない
await page.goto(base + '/manage/kino2026/schedule')
for (let i = 0; i < 3; i++) {
  if ((await page.locator('button:has-text("日を削除")').count()) === 0) break
  await page.locator('button:has-text("日を削除")').first().click()
  await page.waitForTimeout(100)
}
await page.click('.save-bar button')
await page.waitForSelector('.saved-note')
await page.goto(base + '/s/kino2026/schedule')
check('空の行程は案内文を表示', (await page.locator('text=行程はまだ登録されていません').count()) > 0)
await page.goto(base + '/manage/kino2026')
await page.click('button:has-text("編集をリセットしてデモに戻す")')
await page.waitForURL('**/manage')

// 16d) 選択済みメンバーが名簿から消えたら選び直しへ
await page.goto(base + '/')
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('shiori:tob2026') || '{}')
  s.memberId = 'ghost-no-longer-exists'
  localStorage.setItem('shiori:tob2026', JSON.stringify(s))
})
await page.goto(base + '/s/tob2026')
await page.waitForURL('**/rsvp/who')
check('消えた本人IDは本人選択へ戻る', true)
await page.click('.roster button:has-text("高橋")')

// 17) PWA: オフラインでもしおりが開ける
await page.goto(base + '/')
await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
await page.waitForTimeout(800) // precache完了待ち
await page.reload()
await page.waitForTimeout(500)
await page.context().setOffline(true)
await page.goto(base + '/s/kino2026')
check('オフラインで表紙が開く', (await page.locator('text=城崎温泉').count()) > 0)
await page.goto(base + '/s/kino2026/costs')
check('オフラインで割り勘も開く', (await page.locator('text=¥68,400').count()) > 0)
await page.context().setOffline(false)

// 18) ツアー: 名簿は一切表示されず、姓+電話下4桁で本人のみ開ける
await page.goto(base + '/s/hama2026')
await page.waitForSelector('text=ご予約の確認')
check('ツアーでは名簿が表示されない', (await page.locator('.roster').count()) === 0)
await page.fill('.text-input >> nth=0', '木村')
await page.fill('input[inputmode="numeric"]', '0008')
await page.click('button:has-text("確認して開く")')
await page.waitForSelector('.panel-head')
check('姓+下4桁で本人のしおりが開く(木村)', (await page.locator('.panel-head:has-text("木村")').count()) === 1)
check('表紙に自分の乗車地(7:10)', (await page.locator('text=7:10').count()) > 0)
check('表紙に号車・座席', (await page.locator('text=2号車 2B').count()) > 0)
// 19) 行程に乗車地一覧+「あなた」チップ
await page.goto(base + '/s/hama2026/schedule')
check('乗車地一覧が出る', (await page.locator('text=金山駅 南口').count()) > 0)
check('自分の乗車地にチップ', (await page.locator('text=/^あなた$/').count()) === 1)

// 20) ご案内(旅行条件・FAQ)
await page.goto(base + '/s/hama2026/notices')
check('キャンセル規定が読める', (await page.locator('text=キャンセル規定').count()) > 0)
check('当日連絡先が出る', (await page.locator('text=催行会社・当日連絡先').count()) > 0)

// 21) 管理コード(PIN)ゲート → 添乗員: 点呼(乗車確認)が保存される
await page.goto(base + '/manage/hama2026/checkin')
await page.waitForSelector('input[type="password"]')
check('管理画面がコードでロックされる', true)
await page.fill('input[type="password"]', '9999')
await page.click('button:has-text("開く")')
check('間違ったコードは弾く', (await page.locator('text=管理コードが違います').count()) > 0)
await page.fill('input[type="password"]', '0829')
await page.click('button:has-text("開く")')
await page.waitForSelector('.card.accent')
check('正しいコードで開く', true)
await page.locator('.hairline-block button').first().click()
await page.locator('.hairline-block button').nth(1).click()
await page.waitForTimeout(200)
let summary = await page.locator('.card.accent').innerText()
check('点呼カウントが 2/24 になる', summary.includes('2') && summary.includes('24'))
await page.reload()
await page.waitForSelector('.card.accent')
summary = await page.locator('.card.accent').innerText()
check('点呼がリロード後も残る', summary.includes('2') && summary.includes('24'))

// 22) アンケート回答→集計に反映
await page.goto(base + '/s/hama2026/survey')
await page.click('.choice-grid button:has-text("大満足")')
await page.fill('textarea', 'うなぎが最高でした')
await page.click('button:has-text("送信する")')
await page.waitForSelector('text=ご回答ありがとうございました')
check('アンケート送信完了', true)
await page.goto(base + '/manage/hama2026/survey')
check('集計に平均が出る', (await page.locator('text=5.0').count()) > 0)
check('コメントが出る', (await page.locator('text=うなぎが最高でした').count()) > 0)

// 23) CSVで名簿を一括取り込み
await page.goto(base + '/manage/hama2026/members')
await page.fill(
  'textarea',
  '試験太郎, 金山, 2, 9A, 090-9999-0001\n試験花子, 名古屋駅, 1, 9B',
)
await page.click('button:has-text("取り込む")')
check('CSV取込メッセージ', (await page.locator('text=2名を追加しました').count()) > 0)
await page.click('.save-bar button')
await page.waitForSelector('.saved-note')
await page.goto(base + '/manage/hama2026')
check('名簿が26名に増える', (await page.locator('text=26名').count()) > 0)

// 24) しおりの複製(定期催行)→削除→ツアー編集リセット
await page.click('button:has-text("このしおりを複製")')
await page.waitForURL(/\/manage\/s[a-z0-9]+$/)
// 複製には管理コードも引き継がれる
await page.waitForSelector('input[type="password"]')
await page.fill('input[type="password"]', '0829')
await page.click('button:has-text("開く")')
check('複製が作られる(コード引き継ぎ)', (await page.locator('text=(コピー)').count()) > 0)
await page.click('button:has-text("このしおりを削除")')
await page.waitForURL('**/manage')
await page.goto(base + '/manage/hama2026')
await page.click('button:has-text("編集をリセットしてデモに戻す")')
await page.waitForURL('**/manage')
await page.goto(base + '/manage/hama2026')
check('リセットで24名に戻る', (await page.locator('text=24名').count()) > 0)

// 25) 個別URL(招待リンク): 名簿を経由せず本人のしおりが開く
await page.goto(base + '/manage/hama2026/links')
await page.waitForSelector('.hairline-block')
const inviteUrl = await page.locator('.hairline-block .mono').first().innerText() // 青木さん
await page.evaluate(() => localStorage.removeItem('shiori:hama2026'))
await page.goto(inviteUrl.trim())
await page.waitForSelector('.panel-head')
check('個別URLで本人特定(青木)', (await page.locator('.panel-head:has-text("青木")').count()) === 1)

// 26) 照合の堅牢性: 誤入力は弾き、電話未登録は名前のみで開ける
await page.evaluate(() => localStorage.removeItem('shiori:hama2026'))
await page.goto(base + '/s/hama2026/rsvp/who')
await page.waitForSelector('text=ご予約の確認')
await page.fill('.text-input >> nth=0', '木村')
await page.fill('input[inputmode="numeric"]', '0000')
await page.click('button:has-text("確認して開く")')
await page.waitForSelector('text=見つかりませんでした')
check('間違った下4桁は弾く', true)
await page.fill('.text-input >> nth=0', '石田')
await page.fill('input[inputmode="numeric"]', '')
await page.click('button:has-text("確認して開く")')
await page.waitForSelector('.panel-head')
check('電話未登録は名前のみで開ける(石田)', (await page.locator('.panel-head:has-text("石田")').count()) === 1)

await browser.close()
console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
