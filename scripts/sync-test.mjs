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
const unlockIfNeeded = async (page) => {
  if ((await page.locator('input[type="password"]').count()) > 0) {
    await page.fill('input[type="password"]', '4649')
    await page.click('button:has-text("開く")')
  }
}

await A.goto(base + '/manage')
await A.click('.add-btn:has-text("バスツアー")')
await A.waitForURL(/\/manage\/s[a-z0-9]+$/)
const tourSlug = A.url().split('/').pop()
// 招待リンクは作成(保存)時に自動発行される(ツアーの入口はトークン前提)
await A.goto(base + `/manage/${tourSlug}/links`)
await A.waitForSelector('.hairline-block .mono', { timeout: 5000 })
const inviteUrl = (await A.locator('.hairline-block .mono').first().innerText()).trim()
check('招待リンクが自動発行されている', inviteUrl.includes(`/s/${tourSlug}?t=`))
const token = inviteUrl.split('?t=')[1]

// 管理コードを設定(スタッフ端末の点呼参加に必要)
await A.goto(base + `/manage/${tourSlug}/edit`)
await A.fill('.form-row:has(.input-label:text-is("管理コード(任意)")) input', '4649')
await A.click('.save-bar button')
await A.waitForSelector('.saved-note')
await A.waitForTimeout(2500) // push完了待ち

// 4) 公開docは匿名化: トークン・氏名・管理コードを含まない
const pub = await (await fetch(`${base}/api/docs/${tourSlug}`)).json()
const pubMembers = JSON.stringify(pub.doc.members)
const pubDoc = JSON.stringify(pub.doc)
check('公開APIからトークンが除去されている', !pubMembers.includes('token') && !pubMembers.includes(token))
check('ツアーの公開APIに氏名が含まれない(匿名化)', !pubMembers.includes('お客様1') && !pubMembers.includes('"name"'))
check('匿名化後もmember数・IDは残る(人数表示用)', pub.doc.members.length === 1 && pub.doc.members[0].id === 'm1')
check('公開docにadminPin/staffKeyが含まれない', !pubDoc.includes('adminPin') && !pubDoc.includes('staffKey') && !pubDoc.includes('4649'))
check('公開docにhasPinフラグはある', pubDoc.includes('"hasPin":true'))

// 5) 別端末が招待リンクだけで本人特定される(サーバー照合)
const C = await newPage()
await C.goto(inviteUrl.replace(/^https?:\/\/[^/]+/, base))
await C.waitForSelector('.panel-head', { timeout: 10000 })
check('招待リンクで本人のしおりが開く', (await C.locator('.panel-head:has-text("お客様1")').count()) === 1)

// 6) 幹事が点呼 → スタッフ端末(管理コード入力)に同期される
await A.goto(base + `/manage/${tourSlug}/checkin`)
await A.waitForSelector('.card.accent, input[type="password"]', { timeout: 10000 })
await unlockIfNeeded(A)
await A.waitForSelector('.hairline-block button', { timeout: 10000 })
await A.locator('.hairline-block button').first().click()
await A.waitForTimeout(1500)

// 無認証では点呼・回答は読めない(名簿非公開の徹底)
const anonState = await (await fetch(`${base}/api/state/${tourSlug}`)).json()
check(
  '無認証のstateは空(点呼・回答を晒さない)',
  Object.keys(anonState.checkin ?? {}).length === 0 && Object.keys(anonState.answers ?? {}).length === 0,
)

const D = await newPage() // スタッフ端末その1
await D.goto(base + `/manage/${tourSlug}/checkin`)
await D.waitForSelector('input[type="password"]', { timeout: 10000 })
await D.fill('input[type="password"]', '4649')
await D.click('button:has-text("開く")')
await D.waitForSelector('.card.accent', { timeout: 10000 })
let checkinSynced = false
for (let i = 0; i < 6 && !checkinSynced; i++) {
  await D.waitForTimeout(1500)
  const summary = await D.locator('.card.accent').innerText()
  checkinSynced = /1\s*\/ 1名/.test(summary.replace(/\n/g, ' '))
  if (!checkinSynced) await D.reload()
}
check('スタッフ端末で点呼が見える(1/1)', checkinSynced)
check('スタッフ端末に名簿(氏名)が見える', (await D.locator('button:has-text("お客様1")').count()) > 0)
const staffKeyD = await D.evaluate((s) => localStorage.getItem(`staff-key:${s}`), tourSlug)
const staffDocRes = await (
  await fetch(`${base}/api/docs/${tourSlug}`, { headers: { 'x-staff-key': staffKeyD } })
).json()
const staffMembers = JSON.stringify(staffDocRes.doc.members)
check('スタッフ用docは名簿あり・トークンなし', staffMembers.includes('お客様1') && !staffMembers.includes(token))

// 7) ツアーは標準でトークンなしの書き込みを拒否する(名簿非公開が標準仕様)
const noToken = await fetch(`${base}/api/state/${tourSlug}/answers/m1`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ attendance: '参加', paid: false }),
})
check('ツアー標準: トークンなし書き込みは403', noToken.status === 403)
const unknownMember = await fetch(`${base}/api/state/${tourSlug}/answers/mx99`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ attendance: '参加', paid: false }),
})
check('ツアー標準: 名簿にないmemberIdへの書き込みは403', unknownMember.status === 403)
const withToken = await fetch(`${base}/api/state/${tourSlug}/answers/m1?t=${token}`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ attendance: '参加', paid: false }),
})
check('ツアー標準: トークン付き書き込みは200', withToken.status === 200)
const selfState = await (await fetch(`${base}/api/state/${tourSlug}?t=${token}`)).json()
check('本人トークンのstateは自分の分だけ', !!selfState.answers?.m1 && Object.keys(selfState.answers).length === 1)
const orphan = await fetch(`${base}/api/state/nonexistent99/answers/m1`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ attendance: '参加', paid: false }),
})
check('存在しないしおりへの書き込みは404', orphan.status === 404)

// 8) 本人照合API(名前+下4桁→memberId+token)。電話未登録は照合対象外
const vNoTel = await fetch(`${base}/api/verify/${tourSlug}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'お客様1', digits: '' }),
})
check('電話未登録のお客様は氏名だけで照合できない(なりすまし防止)', vNoTel.status === 404)
// 電話を登録すると氏名+下4桁で照合できる
const tourAdminKey = await A.evaluate((s) => localStorage.getItem(`admin-key:${s}`), tourSlug)
const fullDoc = (
  await (await fetch(`${base}/api/docs/${tourSlug}`, { headers: { 'x-admin-key': tourAdminKey } })).json()
).doc
fullDoc.members[0].tel = { display: '090-1234-5678', href: 'tel:09012345678' }
await fetch(`${base}/api/docs/${tourSlug}`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json', 'x-admin-key': tourAdminKey },
  body: JSON.stringify({ doc: fullDoc }),
})
const vOk = await fetch(`${base}/api/verify/${tourSlug}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'お客様1', digits: '5678' }),
})
const vData = await vOk.json()
check('照合APIが本人にtokenを返す(氏名+下4桁)', vOk.status === 200 && vData.memberId === 'm1' && vData.token === token)
const vBad = await fetch(`${base}/api/verify/${tourSlug}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'お客様1', digits: '9999' }),
})
check('照合APIは不一致を404で弾く', vBad.status === 404)

// 9) スタッフ端末その2: 間違ったコードは弾く+点呼の書き込みが同期される
const E = await newPage()
await E.goto(base + `/manage/${tourSlug}/checkin`)
await E.waitForSelector('input[type="password"]', { timeout: 10000 })
await E.fill('input[type="password"]', '9999')
await E.click('button:has-text("開く")')
await E.waitForSelector('text=管理コードが違います')
check('スタッフ端末: 違うコードは弾く(サーバー照合)', true)
await E.fill('input[type="password"]', '4649')
await E.click('button:has-text("開く")')
await E.waitForSelector('.card.accent', { timeout: 10000 })
check('スタッフ端末: 正しいコードで点呼が開く', true)
// 手順6でAがm1を点呼済み(true)にしているため、Eのタップで解除(false)になるのが正。
// サーバー状態(✓)が画面に反映されてからタップする(pullがタップより遅れると逆になる)
await E.waitForSelector('.check-box.on', { timeout: 15000 })
await E.locator('.hairline-block button').first().click()
await E.waitForTimeout(2500)
const staffKeyE = await E.evaluate((s) => localStorage.getItem(`staff-key:${s}`), tourSlug)
const staffState = await (
  await fetch(`${base}/api/state/${tourSlug}`, { headers: { 'x-staff-key': staffKeyE } })
).json()
check('スタッフの点呼操作がサーバーに反映される', staffState.checkin && staffState.checkin.m1 === false)

// 後片付け(サーバー側も削除)
await A.goto(base + `/manage/${slug}`)
await A.click('button:has-text("このしおりを削除")')
await A.waitForURL('**/manage')
await A.goto(base + `/manage/${tourSlug}`)
if ((await A.locator('input[type="password"]').count()) > 0) {
  await A.fill('input[type="password"]', '4649')
  await A.click('button:has-text("開く")')
  await A.waitForSelector('button:has-text("このしおりを削除")')
}
await A.click('button:has-text("このしおりを削除")')
await A.waitForURL('**/manage')
const gone = await fetch(`${base}/api/docs/${slug}`)
check('削除がサーバーにも反映される', gone.status === 404)

await browser.close()
console.log(failed === 0 ? '\nSYNC ALL PASS' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)
