import { Link } from 'react-router-dom'
import { SHIORI_LIST } from '../lib/data'

export function Home() {
  const reset = () => {
    for (const s of SHIORI_LIST) localStorage.removeItem(`shiori:${s.slug}`)
    window.location.reload()
  }

  return (
    <div className="home">
      <div className="home-inner">
        <h1>旅合わせ</h1>
        <p className="lede">
          紙のしおりの記憶を持つデジタル。参加者は登録もログインもなく、URLを開くだけ。
          出欠の回答・行程・持ち物・連絡先をひとつのしおりにまとめます。
          お支払いは幹事だけ(1冊 ¥480 買い切り／年間パス ¥1,800)。
        </p>

        <div className="home-card">
          <h2>幹事メニュー</h2>
          <div className="sub">しおりの新規作成・編集・出欠状況の確認・公開・QR共有カード</div>
          <div className="home-links">
            <Link className="primary" to="/manage">
              しおりを作成・編集する
            </Link>
          </div>
        </div>

        {SHIORI_LIST.map((s) => (
          <div key={s.slug} className="home-card">
            <h2>
              {s.eyebrow}　{s.title} {s.subtitle}
            </h2>
            <div className="sub mono">
              {s.shareUrl}
              {s.kind === 'group'
                ? `　${s.members.length}名(名簿・出欠あり)`
                : s.kind === 'tour'
                  ? `　${s.members.length}名(バスツアー・乗車地/点呼/案内)`
                  : '　2名(割り勘・予約控え)'}
            </div>
            <div className="home-links">
              <Link className="primary" to={`/s/${s.slug}`}>
                しおりを見る(参加者)
              </Link>
              <Link to={`/publish/${s.slug}`}>幹事: 公開・お支払い</Link>
              <Link to={`/s/${s.slug}/print`}>印刷PDF</Link>
              {s.kind === 'group' && (
                <>
                  <Link to={`/s/${s.slug}/rsvp/who`}>出欠の回答</Link>
                  <Link to={`/s/${s.slug}?photo=1`}>表紙(写真あり案)</Link>
                </>
              )}
              {s.kind === 'tour' && (
                <>
                  <Link to={`/manage/${s.slug}/checkin`}>添乗員: 点呼</Link>
                  <Link to={`/s/${s.slug}/notices`}>ご案内(キャンセル規定)</Link>
                </>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>
              {s.kind === 'tour' &&
                '管理画面の管理コード: 0829 ／ 名簿選択後は電話下4桁で本人照合(例: 木村→0008)'}
            </div>
          </div>
        ))}

        <div className="home-note">
          デモの操作:
          <br />
          ・「いま」マーカーの確認 →{' '}
          <Link to="/s/tob2026/schedule?now=2026-08-22T10:42">
            <code>?now=2026-08-22T10:42</code> を付けて行程を開く
          </Link>
          <br />
          ・回答・チェック・お支払いはこの端末(localStorage)にだけ保存されます。{' '}
          <a
            href="#reset"
            onClick={(e) => {
              e.preventDefault()
              reset()
            }}
          >
            デモデータをリセット
          </a>
        </div>
      </div>
    </div>
  )
}
