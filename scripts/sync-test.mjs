// マルチデバイス同期テスト(要: cd server && npx wrangler dev --port 8787)
// 幹事PC・参加者スマホ・添乗員端末を別ブラウザコンテキストで再現し、
// サーバー(Workers+D1)経由でデータが行き来することを検証する。
import { chromium } from 'playwright-core'

const base = process.env.BASE || 'http://localhost:8787'
const browser = await chromium.launch()

let failed = 0
const check = (name, cond) => {
  console.log(cond ? '  ✓' : '  ✗', name)
  if (!cond) failed++
}

const newPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } })
  const page = await ctx.newPage()
  page.on('dialog', (d) => d.accept())
  return page
}

// ===== A: 幹事のPC =====
const A = await newPage()
await A.goto(base + '/')
await A.evaluate(() => localStorage.clear())

// 1) グループしおりを作成して保存(サーバーへpush)
await A.goto(base + '/manage')
await A.click('.add-btn:has-text("グループ")')
await A.waitForURL(/\/manage\/s[a-z0-9]+$/)
const slug = A.url().split('/').pop()
await A.goto(base + `/manage/${slug}/edit`)
await A.fill('.form-row:has(.input-label:text-is("タイトル")) input', '同期テスト温泉旅行')
await A.click('.save-bar button')
await A.waitForSelector('.saved-note')
await A.waitForTimeout(2500) // push完了待ち
const adminKey = await A.evaluate((s) => localStorage.getItem(`admin-key:${s}`), slug)
check('保存でサーバーのadminKeyが発行される', !!adminKey)

// ===== B: 参加者のスマホ(まっさらな別端末) =====
const B = await newPage()
await B.goto(base + `/s/${slug}`)
await B.waitForSelector('.roster button', { timeout: 10000 })
check('別端末がサーバーからしおりを取得できる', (await B.locator('text=名簿からお名前').count()) > 0)
await B.click('.roster button:has-text("幹事")')
await B.waitForURL('**/rsvp')
await B.click('.choice-grid button:has-text("参加")')
await B.click('button:has-text("この内容で回答する")')
await B.waitForURL('**/rsvp/done')
await B.waitForTimeout(2500) // push完了待ち
check('参加者が別端末から回答できる', true)

// 2) 幹事の端末に回答が届く
await A.goto(base + `/manage/${slug}/members`)
await A.waitForTimeout(1200) // pull+マージ待ち
const statusRow = await A.locator('.status-row:has-text("幹事")').innerText()
check('幹事の端末に回答が同期される(参加)', statusRow.includes('参加'))

// 3) 幹事の編集が参加者に届く
await A.goto(base + `/manage/${slug}/edit`)
await A.fill('.form-row:has(.input-label:text-is("タイトル")) input', '同期テスト温泉旅行(改)')
await A.click('.save-bar button')
await A.waitForSelector('.saved-note')
await A.waitForTimeout(2500)
let titleSynced = false
for (let i = 0; i < 6 && !titleSynced; i++) {
  await B.goto(base + `/s/${slug}`)
  await B.waitForTimeout(2000)
  titleSynced = (await B.locator('text=同期テスト温泉旅行(改)').count()) > 0
}
check('幹事の編集が参加者の端末に反映される', titleSynced)

// ===== ツアー: 招待リンク(サーバー照合)と点呼の同期 =====
await A.goto(base + '/manage')
await A.click('.add-btn:has-text("バスツアー")')
await A.waitForURL(/\/manage\/s[a-z0-9]+$/)
const tourSlug = A.url().split('/').pop()
await A.goto(base + `/manage/${tourSlug}/links`)
await A.click('button:has-text("リンクを発行")')
await A.waitForSelector('.hairline-block .mono', { timeout: 5000 })
await A.waitForTimeout(2500) // push完了待ち
const inviteUrl = (await A.locator('.hairline-block .mono').first().innerText()).trim()
check('招待リンクが発行される', inviteUrl.includes(`/s/${tourSlug}?t=`))

// 4) サーバーの公開docにはトークンが含まれない
const pub = await (await fetch(`${base}/api/docs/${tourSlug}`)).json()
const hasToken = JSON.stringify(pub.doc.members).includes('token')
check('公開APIからトークンが除去されている', !hasToken)

// 5) 別端末が招待リンクだけで本人特定される(サーバー照合)
const C = await newPage()
await C.goto(inviteUrl.replace(/^https?:\/\/[^/]+/, base))
await C.waitForSelector('.panel-head', { timeout: 10000 })
check('招待リンクで本人のしおりが開く', (await C.locator('.panel-head:has-text("お客様1")').count()) === 1)

// 6) 幹事の点呼が別端末に同期される(読み取り)
await A.goto(base + `/manage/${tourSlug}/checkin`)
await A.locator('.hairline-block button').first().click()
await A.waitForTimeout(800)
const D = await newPage()
let checkinSynced = false
for (let i = 0; i < 6 && !checkinSynced; i++) {
  await D.goto(base + `/manage/${tourSlug}/checkin`)
  await D.waitForTimeout(2000)
  const summary = await D.locator('.card.accent').innerText()
  checkinSynced = /1\s*\/ 1名/.test(summary.replace(/\n/g, ' '))
}
check('点呼が別端末で見える(1/1)', checkinSynced)

// 7) 名簿非公開モードではトークンなしの書き込みを拒否する
await A.goto(base + `/manage/${tourSlug}/edit`)
await A.click('.inline-check:has-text("名簿一覧を表示しない") >> input')
await A.click('.save-bar button')
await A.waitForSelector('.saved-note')
await A.waitForTimeout(2500)
const token = inviteUrl.split('?t=')[1]
const noToken = await fetch(`${base}/api/state/${tourSlug}/answers/m1`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ attendance: '参加', paid: false }),
})
check('非公開モード: トークンなし書き込みは403', noToken.status === 403)
const withToken = await fetch(`${base}/api/state/${tourSlug}/answers/m1?t=${token}`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ attendance: '参加', paid: false }),
})
check('非公開モード: トークン付き書き込みは200', withToken.status === 200)
const orphan = await fetch(`${base}/api/state/nonexistent99/answers/m1`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ attendance: '参加', paid: false }),
})
check('存在しないしおりへの書き込みは404', orphan.status === 404)

// 後片付け(サーバー側も削除)
await A.goto(base + `/manage/${slug}`)
await A.click('button:has-text("このしおりを削除")')
await A.waitForURL('**/manage')
await A.goto(base + `/manage/${tourSlug}`)
await A.click('button:has-text("このしおりを削除")')
await A.waitForURL('**/manage')
const gone = await fetch(`${base}/api/docs/${slug}`)
check('削除がサーバーにも反映される', gone.status === 404)

await browser.close()
console.log(failed === 0 ? '\nSYNC ALL PASS' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
