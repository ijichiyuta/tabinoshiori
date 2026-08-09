import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles/global.css'

// PWA: ホーム画面に追加すれば(一度開いたしおりは)圏外でも開ける。
// autoUpdate方針。新しいServiceWorkerが有効化されたら一度だけ自動リロードして
// 古いアプリのまま使い続けないようにする(二重リロード防止のガード付き)。
registerSW({ immediate: true })
if ('serviceWorker' in navigator) {
  // 初回訪問(clientsClaimによる最初のcontroller獲得)ではリロードしない。
  // すでにcontrollerがある=更新の切り替えのときだけ、一度だけリロードする。
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return
    reloaded = true
    window.location.reload()
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
