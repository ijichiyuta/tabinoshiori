import { Link } from 'react-router-dom'
import { SHIORI_LIST } from '../lib/data'
import { shareDisplay } from '../lib/share'

const FEATURES = [
  {
    img: '/img/app-tour.png',
    eyebrow: '乗車地・座席',
    title: 'お客様は、自分の乗車地と座席だけを見る。',
    body: 'お客様ごとに「あなたの集合」を表紙に表示。乗車地・集合時刻・号車・座席がひと目で分かります。「私の集合場所どこ?」という当日朝の電話が、まるごと消えます。',
  },
  {
    img: '/img/app-checkin.png',
    eyebrow: '添乗員の点呼',
    title: '乗車確認は、名前をタップするだけ。',
    body: '乗車地ごとに名簿を表示。タップで乗車済みに。複数の添乗員・スタッフの端末でリアルタイム共有され、「あと何名・誰が未乗車か」がその場で分かります。',
    rev: true,
  },
  {
    img: '/img/app-schedule.png',
    eyebrow: '当日の行程',
    title: '渋滞で予定が変わっても、全員にすぐ届く。',
    body: '現在時刻のマーカーが行程を追いかけます。到着遅れや集合時刻の変更は、上部の告知バナーでお客様全員に即共有。トンネルや山間部の圏外でも、一度開いたしおりは表示できます。',
  },
  {
    img: '/img/app-cover.png',
    eyebrow: '個別URL・名簿非公開',
    title: '予約確認メールに、専用URLを貼るだけ。',
    body: 'お客様ごとの個別URLを発行。開いた瞬間にご本人のしおりが表示されます。名簿は他のお客様に一切表示されず、なりすましも防止(照合はサーバー側で実施)。個人情報の扱いも安心です。',
    rev: true,
  },
]

const STEPS = [
  {
    title: '作る',
    body: '行程・乗車地・ご案内を入力。予約システムからの名簿CSVを貼り付ければ、号車・座席・乗車地もまとめて取り込めます。定期催行は前回のしおりを複製。',
  },
  {
    title: '配る',
    body: '予約確認メールやSMSに、お客様ごとの個別URLを貼るだけ。QRコードや印刷用A4しおりも出力できます。お客様は登録もアプリも不要。',
  },
  {
    title: '当日',
    body: '「いま」マーカー付きの行程、遅延の告知、添乗員のワンタップ点呼。ツアー後にはアンケートも自動で。圏外でも一度開いたしおりは表示できます。',
  },
]

const FAQS = [
  {
    q: 'お客様はアプリのインストールが必要ですか?',
    a: 'いいえ。URLを開くだけで、登録もログインも不要です。ホーム画面に追加すればアプリのように使え、圏外でも表示できます。年配のお客様にも配慮した、紙のしおりに近い見た目です。',
  },
  {
    q: '名簿の個人情報は大丈夫ですか?',
    a: 'お客様には他の方の名簿は一切表示されません。個別URL、または「予約名+電話番号下4桁」で、ご本人のしおりだけが開きます(照合はサーバー側で実施)。管理画面は管理コードでロックでき、添乗員には点呼だけを共有できます。',
  },
  {
    q: '予約システムの名簿を取り込めますか?',
    a: 'はい。名前・乗車地・号車・座席・電話番号をカンマ/タブ区切りで貼り付けると、まとめて取り込めます。乗車地は名前の一部一致で自動割り当てします。',
  },
  {
    q: '圏外(山間部・トンネル)ではどうなりますか?',
    a: '一度開いたしおりは端末に保存されるため、圏外でも行程・乗車地・ご案内・連絡先を確認できます。添乗員の点呼も、電波が戻ったときにまとめて同期されます。',
  },
  {
    q: 'キャンセル規定や旅行条件も渡せますか?',
    a: 'はい。ご案内(旅行条件・FAQ)としてしおり内で電子交付できます。ツアー終了後はお客様の表紙にアンケートのお願いが自動で表示され、満足度を集計できます。',
  },
]

const TOUR_DEMOS = SHIORI_LIST.filter((s) => s.kind === 'tour')

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
          <a href="#pricing">料金</a>
          <a href="#demos">デモ</a>
          <Link to="/manage" className="cta">
            無料で試す
          </Link>
        </div>
      </nav>

      {/* ヒーロー */}
      <header className="lp-hero">
        <div className="lp-hero-inner">
          <div className="copy">
            <div className="eyebrow">バスツアー運営会社のための、デジタルしおり</div>
            <h1>
              「集合場所どこ?」の
              <br />
              電話を、なくす。
            </h1>
            <p className="sub">
              乗車地・座席・行程・ご案内・当日の点呼まで、ひとつのしおりに。
              <br />
              お客様はURLを開くだけ。登録もアプリも不要です。
            </p>
            <div className="ctas">
              <Link to="/manage" className="lp-btn-white">
                無料でしおりを作る
              </Link>
              <a href="#demos" className="lp-btn-ghost">
                ツアーのデモを見る
              </a>
            </div>
            <div className="note">クレジットカード登録不要・まずは無料でお試し</div>
          </div>
          <div className="lp-phones">
            <div className="lp-phone">
              <img src="/img/app-tour.png" alt="バスツアーのしおり(乗車地・座席)" />
            </div>
            <div className="lp-phone tilt">
              <img src="/img/app-checkin.png" alt="添乗員の点呼画面" />
            </div>
          </div>
        </div>
      </header>

      {/* 機能 */}
      <section className="lp-section" id="features">
        <h2 className="lp-h2">ツアーの案内業務が、しおり一枚で終わる。</h2>
        <p className="lp-lede">
          乗車地の案内、座席の割り当て、当日の点呼、変更の連絡、キャンセル規定の交付——
          電話とFAXと紙でやっていたことを、お客様が開くだけの一枚のしおりに。
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

      {/* 運営会社向けの運用機能 */}
      <section className="lp-band" id="tour">
        <div className="lp-band-inner">
          <div className="copy">
            <h2>
              運営の現場に、
              <br />
              そのまま馴染む。
            </h2>
            <ul>
              <li>予約名簿のCSV/タブ区切り取り込み(号車・座席・乗車地)</li>
              <li>号車・座席の割り当てと、添乗員の複数端末リアルタイム点呼</li>
              <li>お客様ごとの個別URL(名簿を見せない・なりすまし防止)</li>
              <li>キャンセル規定・旅行条件の電子交付、ツアー後アンケート</li>
              <li>定期催行のしおり複製、A4印刷しおりの出力</li>
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
        <h2 className="lp-h2">導入は、3ステップ。</h2>
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
        <h2 className="lp-h2">お客様はずっと無料。支払うのは運営会社だけ。</h2>
        <div className="lp-pricing">
          <div className="lp-price">
            <div className="name">無料でお試し</div>
            <div className="price">¥0</div>
            <ul>
              <li>お客様6名まで</li>
              <li>乗車地・行程・ご案内・点呼</li>
              <li>印刷PDFは透かし入り</li>
            </ul>
          </div>
          <div className="lp-price featured">
            <div className="tag">ツアー単位</div>
            <div className="name">しおり1冊(買い切り)</div>
            <div className="price">
              ¥480<small>/冊・税込</small>
            </div>
            <ul>
              <li>お客様の人数無制限</li>
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
              <li>ツアーのしおり作り放題</li>
              <li>定期催行のしおりを複製</li>
              <li>年に何本も催行する運営会社に</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-section">
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
        <h2 className="lp-h2">バスツアーのデモを、そのまま触れます。</h2>
        {TOUR_DEMOS.map((s) => (
          <div key={s.slug} className="home-card">
            <h3>
              {s.eyebrow}　{s.title} {s.subtitle}
            </h3>
            <div className="sub mono">
              {shareDisplay(s.slug)}
              {`　${s.members.length}名(乗車地・座席・点呼・ご案内)`}
            </div>
            <div className="home-links">
              <Link className="primary" to={`/s/${s.slug}`}>
                しおりを見る(お客様)
              </Link>
              <Link to={`/manage/${s.slug}`}>運営: しおり管理</Link>
              <Link to={`/manage/${s.slug}/checkin`}>添乗員: 点呼</Link>
              <Link to={`/s/${s.slug}/notices`}>ご案内(キャンセル規定)</Link>
              <Link to={`/s/${s.slug}/print`}>印刷PDF</Link>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>
              管理画面の管理コード: 0829 ／ お客様の入口は「姓+電話下4桁」(例: 木村→0008)。名簿は表示されません
            </div>
          </div>
        ))}
      </section>

      {/* 締めCTA */}
      <section className="lp-cta">
        <div className="lp-cta-inner">
          <h2>次のツアーから、旅合わせ。</h2>
          <p>しおり作りは5分。お客様への案内はURLひとつ。</p>
          <div className="ctas" style={{ justifyContent: 'center' }}>
            <Link to="/manage" className="lp-btn-white">
              無料でしおりを作る
            </Link>
            <a href="mailto:info@smcn-jp.com?subject=旅合わせ%20導入のご相談" className="lp-btn-ghost">
              導入のご相談
            </a>
          </div>
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
