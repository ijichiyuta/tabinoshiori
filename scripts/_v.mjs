import { chromium } from 'playwright-core'
const base='http://localhost:8787'
const b=await chromium.launch()
// LPヒーロー(PC・ビューポート)
const pc=await (await b.newContext({viewport:{width:1180,height:760},deviceScaleFactor:1})).newPage()
await pc.goto(base+'/',{waitUntil:'load'}); await pc.waitForTimeout(700)
await pc.screenshot({path:'/tmp/v-hero.png'})
await pc.evaluate(()=>document.querySelector('.lp-faq')?.scrollIntoView()); await pc.waitForTimeout(400)
await pc.screenshot({path:'/tmp/v-faq.png'})
// 参加者フレーム(PC) — 物理ボタン確認
await pc.goto(base+'/s/tob2026',{waitUntil:'load'}); await pc.waitForTimeout(600)
await pc.screenshot({path:'/tmp/v-participant.png'})
await b.close(); console.log('done')
