import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

/**
 * 法務ページ(利用規約・プライバシーポリシー・特定商取引法に基づく表記)。
 * 【要確認】の箇所は正式リリース前に事業者情報で埋め、弁護士等のレビューを受けること。
 */

function LegalFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="app">
      <div className="app-body" style={{ padding: '0 0 40px' }}>
        <div className="screen-header">
          <span className="title">{title}</span>
          <Link to="/" style={{ fontSize: 13.5 }}>
            トップへ
          </Link>
        </div>
        <div
          style={{ padding: '18px 20px', fontSize: 14, lineHeight: 1.9, color: 'var(--sub)' }}
          className="legal-body"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function H({ children }: { children: ReactNode }) {
  return (
    <div
      className="serif"
      style={{
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--ink)',
        borderBottom: '1px solid var(--line)',
        padding: '18px 0 6px',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

export function Terms() {
  return (
    <LegalFrame title="利用規約">
      <p style={{ margin: 0 }}>
        この規約は、旅合わせ(以下「本サービス」)の利用条件を定めるものです。
        しおりを作成・公開する幹事・事業者(以下「作成者」)と、URLを開いて閲覧・回答する参加者に適用されます。
      </p>
      <H>1. サービス内容</H>
      <p style={{ margin: 0 }}>
        本サービスは、旅行のしおり(行程・持ち物・連絡先・出欠・費用等の情報)を作成・共有するためのツールです。
        本サービスは旅行契約の当事者ではなく、旅行の企画・実施・売買には関与しません。
        ツアー等の旅行契約は、作成者(催行会社等)と参加者の間で成立します。
      </p>
      <H>2. アカウント不要の利用と作成者の責任</H>
      <p style={{ margin: 0 }}>
        参加者は登録なしで利用できます。作成者は、しおりに掲載する情報(名簿・連絡先・行程等)について、
        本人の同意を得るなど適法に取り扱う責任を負います。他人になりすました利用、
        名簿の不正閲覧を目的とした利用を禁止します。
      </p>
      <H>3. 料金</H>
      <p style={{ margin: 0 }}>
        参加者は無料です。作成者向けの有料プラン(しおり1冊 ¥480 買い切り/年間パス ¥1,800)の内容は
        購入画面の表示によります。参加費等の集金は利用者間で行われるものであり、本サービスは資金を預かりません。
      </p>
      <H>4. 禁止事項</H>
      <p style={{ margin: 0 }}>
        法令違反、第三者の権利侵害、虚偽情報の掲載、本サービスの運営を妨げる行為、
        システムへの不正アクセス・過度な負荷を与える行為を禁止します。
      </p>
      <H>5. 免責</H>
      <p style={{ margin: 0 }}>
        本サービスは現状有姿で提供されます。旅行の実施・変更・中止・事故、利用者間の金銭トラブル、
        通信・端末環境による表示不良について、運営者は責任を負いません。
        運営者の損害賠償責任は、有料プランについて作成者が支払った直近12ヶ月の利用料金を上限とします。
      </p>
      <H>6. 規約の変更・準拠法</H>
      <p style={{ margin: 0 }}>
        本規約は必要に応じて変更されることがあります。本規約は日本法に準拠し、
        紛争は運営者所在地を管轄する裁判所を第一審の専属的合意管轄とします。
      </p>
      <p style={{ marginTop: 18, fontSize: 12.5, color: 'var(--muted)' }}>
        制定日: 2026年8月7日　運営者: スマートコネクト(
        <a href="https://smcn-jp.com" target="_blank" rel="noreferrer">
          smcn-jp.com
        </a>
        )
      </p>
    </LegalFrame>
  )
}

export function Privacy() {
  return (
    <LegalFrame title="プライバシーポリシー">
      <p style={{ margin: 0 }}>
        旅合わせ(以下「本サービス」)における個人情報の取扱いについて定めます。
      </p>
      <H>1. 取得する情報</H>
      <p style={{ margin: 0 }}>
        作成者がしおりに登録する情報(氏名・電話番号・乗車地・座席等)、参加者が入力する情報
        (出欠・交通手段・持ち物チェック・アンケート回答等)、有料プラン購入時の決済情報
        (決済代行事業者が取り扱い、本サービスはカード番号を保持しません)。
      </p>
      <H>2. 利用目的</H>
      <p style={{ margin: 0 }}>
        しおりの表示・共有・出欠管理・点呼・アンケート集計など本サービスの提供、
        本人確認(電話番号下4桁の照合)、不正利用の防止、お問い合わせ対応。
      </p>
      <H>3. 名簿情報の位置づけ</H>
      <p style={{ margin: 0 }}>
        名簿はしおりの作成者が管理するものであり、本サービスは作成者の委託を受けて取り扱います。
        名簿の掲載についての同意取得、削除依頼への一次対応は作成者が行います。
        参加者は、自身の情報の削除を作成者または運営者に求めることができます。
      </p>
      <H>4. 第三者提供・委託</H>
      <p style={{ margin: 0 }}>
        法令に基づく場合を除き、本人の同意なく第三者に提供しません。
        サービス運営のためのクラウド基盤(Cloudflare, Inc.)・決済代行(Stripe, Inc.)への委託を行っています。
      </p>
      <H>5. 保存期間・削除</H>
      <p style={{ margin: 0 }}>
        しおりは作成者が削除でき、削除後は復元されません。
        最終更新から18ヶ月を経過したしおりは、関連する回答・点呼・アンケートとともに自動的に削除されます。
      </p>
      <H>6. お問い合わせ</H>
      <p style={{ margin: 0 }}>
        個人情報の開示・訂正・削除のご請求: info@smcn-jp.com(運営: スマートコネクト)
      </p>
      <p style={{ marginTop: 18, fontSize: 12.5, color: 'var(--muted)' }}>
        制定日: 2026年8月7日　運営者: スマートコネクト(
        <a href="https://smcn-jp.com" target="_blank" rel="noreferrer">
          smcn-jp.com
        </a>
        )
      </p>
    </LegalFrame>
  )
}

export function Tokushoho() {
  const rows: [string, string][] = [
    ['販売事業者', 'スマートコネクト(SMART CONNECT)'],
    ['運営責任者', '請求があった場合、遅滞なく開示いたします'],
    ['所在地', '愛知県名古屋市(詳細は請求があった場合、遅滞なく開示いたします)'],
    ['連絡先', 'info@smcn-jp.com'],
    ['販売価格', 'しおり1冊 480円(税込) / 年間パス 1,800円(税込)。購入画面に表示'],
    ['商品代金以外の必要料金', 'インターネット接続にかかる通信料'],
    ['支払方法', 'クレジットカード等(購入画面に表示)'],
    ['提供時期', '決済完了後ただちに利用できます'],
    [
      '返品・キャンセル',
      'デジタルコンテンツの性質上、決済完了後の返金には応じられません。動作不良の場合はご連絡ください',
    ],
    ['動作環境', 'モダンブラウザ(iOS Safari / Android Chrome / PC各種)'],
  ]
  return (
    <LegalFrame title="特定商取引法に基づく表記">
      <div className="igrid roomy hairline-block" style={{ fontSize: 14 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <span className="k">{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 18, fontSize: 12.5, color: 'var(--muted)' }}>
        旅合わせは スマートコネクト(
        <a href="https://smcn-jp.com" target="_blank" rel="noreferrer">
          smcn-jp.com
        </a>
        )が運営するサービスです。
      </p>
    </LegalFrame>
  )
}
