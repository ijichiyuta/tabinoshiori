import { Link } from 'react-router-dom'
import { SHIORI_LIST } from '../lib/data'

const FEATURES = [
  {
    img: '/img/app-cover.png',
    eyebrow: 'ひとりずつの表紙',
    title: '開いた人の「知りたいこと」だけが、最初にある。',
    body: '次の集合はいつ・どこか。自分の参加費は払ったか。名簿から名前を選ぶだけで、その人専用のしおりに。集合時刻が変われば、上部の告知バナーで全員に知らせます。',
  },
  {
    img: '/img/app-schedule.png',
    eyebrow: '行程表',
    title: '当日は「いま」が動く行程表。',
    body: '紙のしおりの美しさそのままに、当日は現在時刻のマーカーが行程を追いかけます。「いまどのへん?」の問い合わせが消えます。地図・電話へのリンクもワンタップ。',
    rev: true,
  },
  {
    img: '/img/app-costs.png',
    eyebrow: '割り勘・精算',
    title: '「誰がいくら立て替えた」も、しおりの中で。',
    body: '立替を記録すると合計・1人あたり・精算(誰が誰へいくら)を自動計算。旅のあとの気まずい集計が、その場で終わります。',
  },
  {
    img: '/img/app-casual.png',
    eyebrow: 'テーマ',
    title: '旅に合わせて、しおりが着替える。',
    body: '結婚記念日の温泉旅は端正な明朝の「きっちり」。サークル合宿は明るい「カジュアル」。ワンタップで切り替わります。',
    rev: true,
  },
]

const STEPS = [
  {
    title: '作る',
    body: '行程・持ち物・名簿を入力。予約システムからのCSV貼り付けや、前回のしおりの複製もできます。',
  },
  {
    title: '配る',
    body: 'URLかQRコードを共有するだけ。ひとりずつの個別リンクを発行すれば、名簿を見せずになりすましも防げます。',
  },
  {
    title: '当日',
    body: '「いま」マーカー付きの行程、遅延の告知、添乗員の点呼。圏外でも一度開いたしおりは表示できます。',
  },
]

const FAQS = [
  {
    q: '参加者はアプリのインストールが必要ですか?',
    a: 'いいえ。URLを開くだけで、登録もログインも不要です。ホーム画面に追加すればアプリのように使え、圏外でも表示できます。',
  },
  {
    q: '年配の参加者でも使えますか?',
    a: '「URLを開いて自分の名前を選ぶ」の2手だけで、その人専用のしおりが表示されます。紙のしおりに近い見た目を大切にしているので、スマホが苦手な方でも迷いません。印刷用のA4しおりも出力できます。',
  },
  {
    q: '圏外(山間部・トンネル)ではどうなりますか?',
    a: '一度開いたしおりは端末に保存されるため、圏外でも行程・持ち物・連絡先を確認できます。',
  },
  {
    q: '参加費の集金もできますか?',
    a: '参加費の金額と支払い状況をしおりで管理できます。送金自体はPayPayなどで参加者同士が直接行う方式のため、当サービスがお金を預かることはありません。',
  },
  {
    q: '名簿の個人情報は大丈夫ですか?',
    a: 'バスツアーでは名簿は参加者に表示されません。個別リンクか「予約名+電話下4桁」で、ご本人のしおりだけが開きます(照合はサーバー側で実施)。管理画面は管理コードでロックできます。',
  },
]

export function Home() {
  return (
    <div className="lp">
      {/* ナビ */}
      <nav className="lp-nav">
        <Link to="/" className="brand">
          旅合わせ
        </Link>
        <div className="links">
          <a href="#features">機能</a>
          <a href="#tour">事業者向け</a>
          <a href="#pricing">料金</a>
          <a href="#demos">デモ</a>
          <Link to="/manage" className="cta">
            しおりを作る
          </Link>
        </div>
      </nav>

      {/* ヒーロー */}
      <header className="lp-hero">
        <div className="lp-hero-inner">
          <div className="copy">
            <div className="eyebrow">た　び　あ　わ　せ</div>
            <h1>
              旅のしおりを、
              <br />
              ひとつに合わせる。
            </h1>
            <p className="sub">
              集合も、持ち物も、割り勘も。参加者はURLを開くだけ——
              登録もアプリも不要。紙のしおりの美しさを持つ、旅のしおりサービス。
            </p>
            <div className="ctas">
              <Link to="/manage" className="lp-btn-white">
                しおりを作る(無料)
              </Link>
              <a href="#demos" className="lp-btn-ghost">
                デモを見る
              </a>
            </div>
            <div className="note">クレジットカード登録不要・6名までずっと無料</div>
          </div>
          <div className="lp-phones">
            <div className="lp-phone">
              <img src="/img/app-cover.png" alt="しおりの表紙画面" />
            </div>
            <div className="lp-phone tilt">
              <img src="/img/app-schedule.png" alt="行程画面(いまマーカー)" />
            </div>
          </div>
        </div>
      </header>

      {/* 数字バンド */}
      <div className="lp-stats">
        <div className="lp-stat">
          <div className="num">0秒</div>
          <div className="cap">参加者の登録時間——URLを開くだけ</div>
        </div>
        <div className="lp-stat">
          <div className="num">圏外OK</div>
          <div className="cap">一度開いたしおりはトンネルでも表示</div>
        </div>
        <div className="lp-stat">
          <div className="num">¥0〜</div>
          <div className="cap">6名まで無料。有料でも1冊¥480だけ</div>
        </div>
      </div>

      {/* 機能 */}
      <section className="lp-section" id="features">
        <div className="lp-eyebrow">FEATURES</div>
        <h2 className="lp-h2">幹事の仕事が、しおりひとつで終わる。</h2>
        <p className="lp-lede">
          出欠の回収、集合案内、持ち物の連絡、割り勘の計算、変更の周知——
          バラバラのLINEとスプレッドシートでやっていたことを、一枚のしおりに。
        </p>
        {FEATURES.map((f) => (
          <div key={f.title} className={`lp-feature${f.rev ? ' rev' : ''}`}>
            <div className="txt">
              <div className="lp-eyebrow">{f.eyebrow}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
            <div className="lp-phone">
              <img src={f.img} alt={f.title} loading="lazy" />
            </div>
          </div>
        ))}
      </section>

      {/* 事業者向け */}
      <section className="lp-band" id="tour">
        <div className="lp-band-inner">
          <div className="copy">
            <div className="lp-eyebrow" style={{ color: 'rgba(251,250,247,.8)' }}>
              FOR BUS TOUR OPERATORS
            </div>
            <h2>
              「集合場所どこ?」の電話を、
              <br />
              なくす。
            </h2>
            <ul>
              <li>乗車地ごとの集合案内——お客様には自分の乗車地だけを表示</li>
              <li>号車・座席の割り当てと、添乗員のワンタップ点呼</li>
              <li>お客様ごとの個別URL(名簿を見せない・なりすまし防止)</li>
              <li>キャンセル規定・旅行条件の電子交付、ツアー後アンケート</li>
              <li>予約名簿のCSV取り込み、定期催行のしおり複製</li>
            </ul>
            <div className="ctas" style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              <Link to="/s/hama2026" className="lp-btn-white">
                バスツアーのデモを体験
              </Link>
              <Link to="/manage/hama2026/checkin" className="lp-btn-ghost">
                添乗員の点呼画面
              </Link>
            </div>
          </div>
          <div className="lp-phones">
            <div className="lp-phone">
              <img src="/img/app-tour.png" alt="バスツアーのしおり(乗車地・座席)" loading="lazy" />
            </div>
            <div className="lp-phone tilt">
              <img src="/img/app-checkin.png" alt="添乗員の点呼画面" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* 使い方 */}
      <section className="lp-section">
        <div className="lp-eyebrow">HOW IT WORKS</div>
        <h2 className="lp-h2">使い方は、3つだけ。</h2>
        <div className="lp-steps">
          {STEPS.map((s, i) => (
            <div key={s.title} className="lp-step">
              <div className="n">{i + 1}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 料金 */}
      <section className="lp-section" id="pricing">
        <div className="lp-eyebrow">PRICING</div>
        <h2 className="lp-h2">参加者はずっと無料。支払うのは幹事だけ。</h2>
        <div className="lp-pricing">
          <div className="lp-price">
            <div className="name">無料</div>
            <div className="price">¥0</div>
            <ul>
              <li>参加者6名まで</li>
              <li>出欠・行程・持ち物・割り勘</li>
              <li>印刷PDFは透かし入り</li>
            </ul>
          </div>
          <div className="lp-price featured">
            <div className="tag">いちばん人気</div>
            <div className="name">しおり1冊(買い切り)</div>
            <div className="price">
              ¥480<small>/冊・税込</small>
            </div>
            <ul>
              <li>人数無制限</li>
              <li>A4印刷PDF(透かしなし)</li>
              <li>QRコード・共有カード</li>
              <li>自動更新なし・買い切り</li>
            </ul>
          </div>
          <div className="lp-price">
            <div className="name">年間パス</div>
            <div className="price">
              ¥1,800<small>/年・税込</small>
            </div>
            <ul>
              <li>しおり作り放題</li>
              <li>前年のしおりを複製</li>
              <li>年3回以上つくる方・事業者に</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section">
        <div className="lp-eyebrow">FAQ</div>
        <h2 className="lp-h2">よくある質問</h2>
        <div className="lp-faq">
          {FAQS.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* デモ */}
      <section className="lp-section" id="demos">
        <div className="lp-eyebrow">DEMO</div>
        <h2 className="lp-h2">3つのデモしおりを、そのまま触れます。</h2>
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
                  <Link to={`/s/${s.slug}/schedule?now=2026-08-22T10:42`}>当日の行程(いま)</Link>
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
                '管理画面の管理コード: 0829 ／ 参加者入口は「姓+電話下4桁」(例: 木村→0008)。名簿は表示されません'}
            </div>
          </div>
        ))}
      </section>

      {/* 締めCTA */}
      <section className="lp-cta">
        <div className="lp-cta-inner">
          <h2>次の旅から、旅合わせ。</h2>
          <p>しおり作りは5分。参加者への案内はURLひとつ。</p>
          <Link to="/manage" className="lp-btn-white">
            無料でしおりを作る
          </Link>
        </div>
      </section>

      {/* フッター */}
      <footer className="lp-footer">
        <Link to="/terms">利用規約</Link>　<Link to="/privacy">プライバシーポリシー</Link>
        <Link to="/tokushoho">特定商取引法に基づく表記</Link>
        <br />
        運営:{' '}
        <a href="https://smcn-jp.com" target="_blank" rel="noreferrer">
          スマートコネクト
        </a>
        (ホームページ制作・公式LINE構築・MEO対策) ／ お問い合わせ:{' '}
        <a href="mailto:info@smcn-jp.com">info@smcn-jp.com</a>
        <br />
        写真: Unsplash(商用利用可のフリー画像) ／ © 旅合わせ tabiawase.com
      </footer>
    </div>
  )
}
