import { Link } from 'react-router-dom'
import { SHIORI_LIST } from '../lib/data'

const FEATURES = [
  {
    title: 'URLひとつで、全員に届く',
    body: '参加者は登録もアプリのインストールも不要。URLを開いて名簿から自分の名前を選ぶだけ。年配の方でも迷いません。',
  },
  {
    title: '変更は、その場で全員へ',
    body: '集合時刻が変わったら、しおりの上に告知バナー。幹事の編集は参加者のスマホに即反映されます。',
  },
  {
    title: '圏外でも、開ける',
    body: '一度開いたしおりは端末に残ります。山道でもトンネルでも、行程と連絡先はいつでも確認できます。',
  },
]

const TOUR_FEATURES = [
  '乗車地ごとの集合案内(お客様には自分の乗車地だけを表示)',
  '号車・座席の割り当てと、添乗員向けのワンタップ点呼',
  'お客様ごとの個別URL(名簿を見せない・なりすまし防止)',
  'キャンセル規定・旅行条件の電子交付、ツアー後アンケート',
  '予約名簿のCSV取り込み、定期催行向けのしおり複製',
]

export function Home() {
  const reset = () => {
    for (const s of SHIORI_LIST) localStorage.removeItem(`shiori:${s.slug}`)
    window.location.reload()
  }

  return (
    <div className="home">
      <div className="home-inner">
        {/* ヒーロー */}
        <div style={{ padding: '24px 0 8px' }}>
          <div
            className="serif"
            style={{ fontSize: 14, letterSpacing: '0.28em', color: 'var(--muted)' }}
          >
            た　び　あ　わ　せ
          </div>
          <h1 style={{ fontSize: 40, margin: '10px 0 0' }}>旅合わせ</h1>
          <p className="lede" style={{ fontSize: 16.5, marginTop: 14 }}>
            集合も、持ち物も、割り勘も。旅をひとつに合わせる。
            <br />
            紙のしおりの記憶を持つ、旅のしおりサービス。
          </p>
          <div className="home-links" style={{ marginTop: 18 }}>
            <Link className="primary" to="/manage">
              しおりを作る(無料)
            </Link>
            <a href="#demos">デモを見る</a>
          </div>
        </div>

        {/* 特徴 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            marginTop: 28,
          }}
        >
          {FEATURES.map((f) => (
            <div key={f.title} className="home-card" style={{ marginTop: 0 }}>
              <h2 style={{ fontSize: 17 }}>{f.title}</h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--sub)', margin: '8px 0 0' }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>

        {/* 事業者向け */}
        <div className="home-card" style={{ borderColor: 'var(--accent)' }}>
          <div style={{ fontSize: 13, letterSpacing: '0.1em', color: 'var(--accent)', fontWeight: 700 }}>
            バスツアー・旅行会社さまへ
          </div>
          <h2 style={{ marginTop: 6 }}>「集合場所どこ?」の電話を、なくす。</h2>
          <ul style={{ margin: '10px 0 0', paddingLeft: 20, fontSize: 14, lineHeight: 2, color: 'var(--sub)' }}>
            {TOUR_FEATURES.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="home-links">
            <Link className="primary" to="/s/hama2026">
              バスツアーのデモを体験
            </Link>
            <Link to="/manage/hama2026/checkin">添乗員の点呼画面</Link>
          </div>
        </div>

        {/* 料金 */}
        <div className="home-card">
          <h2>料金</h2>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--sub)', margin: '8px 0 0' }}>
            参加者はずっと無料。しおりを公開する幹事・主催者のみ:
            <br />
            <strong style={{ color: 'var(--ink)' }}>無料</strong>(参加者6名まで・印刷は透かし入り)／
            <strong style={{ color: 'var(--ink)' }}>しおり1冊 ¥480</strong>(買い切り・人数無制限・QR共有)／
            <strong style={{ color: 'var(--ink)' }}>年間パス ¥1,800</strong>(しおり無制限・複製)
          </p>
        </div>

        {/* デモ */}
        <h2 id="demos" className="serif" style={{ fontSize: 22, fontWeight: 600, margin: '36px 0 0' }}>
          デモしおり
        </h2>
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
          ・デモしおりの回答・チェックはこの端末にだけ保存されます。{' '}
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

        <div className="home-note" style={{ marginTop: 28 }}>
          <Link to="/terms">利用規約</Link>　<Link to="/privacy">プライバシーポリシー</Link>
          <Link to="/tokushoho">特定商取引法に基づく表記</Link>
          <br />© 旅合わせ(tabiawase.com)
        </div>
      </div>
    </div>
  )
}
