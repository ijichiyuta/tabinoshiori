import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EditorFrame } from '../components/Editor'
import { InfoGrid } from '../components/InfoGrid'
import {
  createShiori,
  deleteDoc,
  duplicateShiori,
  hasDoc,
  isBuiltin,
  listAllShiori,
  saveDoc,
} from '../lib/docs'
import { useShioriState } from '../lib/store'
import type { Shiori, ShioriKind } from '../lib/types'

/* ---------- 幹事: しおり一覧・新規作成 ---------- */
export function ManageHome() {
  const navigate = useNavigate()
  const [listings] = useState(() => listAllShiori())

  const create = (kind: ShioriKind) => {
    const s = createShiori(kind)
    saveDoc(s)
    navigate(`/manage/${s.slug}`)
  }

  return (
    <EditorFrame title="幹事メニュー" backTo="/">
      <p style={{ margin: '0 0 16px', fontSize: 14.5, lineHeight: 1.75, color: 'var(--sub)' }}>
        しおりの作成・編集はこの画面から。参加者には編集画面は表示されません。
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {listings.map(({ shiori, isCustom, isEdited }) => (
          <Link
            key={shiori.slug}
            to={`/manage/${shiori.slug}`}
            className="card"
            style={{ textDecoration: 'none', color: 'var(--ink)', display: 'block' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <span className="serif" style={{ fontSize: 18, fontWeight: 600 }}>
                {shiori.title} {shiori.subtitle}
              </span>
              <span className="chip">
                {isCustom ? '作成' : isEdited ? 'デモ・編集済' : 'デモ'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
              {shiori.eyebrow}
              <span className="mono">{shiori.slug}</span>
              {shiori.kind === 'duo' ? '少人数' : `${shiori.members.length}名`}
            </div>
          </Link>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <div className="field-label">新しいしおりを作る</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
          <button className="add-btn" onClick={() => create('group')}>
            ＋ グループ
            <div style={{ fontSize: 12, marginTop: 2 }}>名簿・出欠・集金</div>
          </button>
          <button className="add-btn" onClick={() => create('duo')}>
            ＋ 少人数
            <div style={{ fontSize: 12, marginTop: 2 }}>割り勘・予約控え</div>
          </button>
          <button className="add-btn" onClick={() => create('tour')}>
            ＋ バスツアー
            <div style={{ fontSize: 12, marginTop: 2 }}>乗車地・点呼・案内</div>
          </button>
        </div>
      </div>
    </EditorFrame>
  )
}

/* ---------- 幹事: 管理ハブ ---------- */
export function ManageHub({ shiori }: { shiori: Shiori }) {
  const [state] = useShioriState(shiori)
  const navigate = useNavigate()
  const builtin = isBuiltin(shiori.slug)
  const edited = builtin && hasDoc(shiori.slug)
  const billing = state.billing
  const paidPlan = billing && billing.plan !== 'free'

  const publishStatus = !billing
    ? '未公開(下書き)'
    : billing.plan === 'free'
      ? '公開中(無料・6名まで)'
      : billing.plan === 'year'
        ? '公開中(年間パス)'
        : '公開中(1冊 ¥480)'

  const removeOrReset = () => {
    const msg = builtin
      ? 'このデモしおりへの編集をすべて破棄して元に戻しますか？'
      : 'このしおりを削除しますか？(元に戻せません)'
    if (!window.confirm(msg)) return
    deleteDoc(shiori.slug)
    navigate('/manage')
  }

  const base = `/manage/${shiori.slug}`
  return (
    <EditorFrame title={`${shiori.title} ${shiori.subtitle}`} backTo="/manage">
      <InfoGrid
        rows={[
          ['状態', <strong key="s">{publishStatus}</strong>],
          [
            'URL',
            <span key="u">
              <span className="mono" style={{ fontSize: 13 }}>
                {shiori.shareUrl}
              </span>
              {'　'}
              <Link to={`/s/${shiori.slug}`} style={{ fontSize: 13 }}>
                この端末で開く
              </Link>
            </span>,
          ],
          [
            shiori.kind === 'duo' ? '同行' : '参加者',
            shiori.kind === 'duo'
              ? shiori.members.map((m) => m.name).join(' ・ ')
              : `${shiori.members.length}名`,
          ],
        ]}
      />

      <div className="field-label" style={{ marginTop: 18 }}>
        編集
      </div>
      <div className="manage-nav">
        <Link to={`${base}/edit`}>
          <span>基本情報(表紙・参加費)</span>
          <span className="arrow">›</span>
        </Link>
        <Link to={`${base}/schedule`}>
          <span>行程</span>
          <span className="hint">
            {shiori.days.length}日・{shiori.days.reduce((n, d) => n + d.events.length, 0)}件
          </span>
        </Link>
        {shiori.kind === 'tour' && (
          <Link to={`${base}/boarding`}>
            <span>乗車地</span>
            <span className="hint">{(shiori.boardingPoints ?? []).length}か所</span>
          </Link>
        )}
        <Link to={`${base}/members`}>
          <span>
            {shiori.kind === 'duo' ? '同行者' : shiori.kind === 'tour' ? '名簿・座席(CSV取込)' : '名簿・出欠状況'}
          </span>
          <span className="hint">{shiori.members.length}名</span>
        </Link>
        <Link to={`${base}/items`}>
          <span>持ち物</span>
          <span className="hint">{shiori.checklist.length}件</span>
        </Link>
        <Link to={`${base}/contacts`}>
          <span>連絡先</span>
          <span className="hint">{shiori.contacts.length}件</span>
        </Link>
        {shiori.kind === 'duo' && (
          <Link to={`${base}/costs`}>
            <span>費用・予約控え</span>
            <span className="hint">{(shiori.expenses ?? []).length}件</span>
          </Link>
        )}
        {shiori.kind === 'tour' && (
          <Link to={`${base}/notices`}>
            <span>ご案内(旅行条件・FAQ)</span>
            <span className="hint">{(shiori.notices ?? []).length}件</span>
          </Link>
        )}
        <Link to={`${base}/updates`}>
          <span>更新告知</span>
          <span className="hint">{shiori.updates.length}件</span>
        </Link>
      </div>

      {shiori.kind === 'tour' && (
        <>
          <div className="field-label" style={{ marginTop: 18 }}>
            当日の運行
          </div>
          <div className="manage-nav">
            <Link to={`${base}/checkin`}>
              <span>点呼・乗車確認(添乗員)</span>
              <span className="arrow">›</span>
            </Link>
            <Link to={`${base}/links`}>
              <span>招待リンク(お客様ごとの個別URL)</span>
              <span className="arrow">›</span>
            </Link>
            <Link to={`${base}/survey`}>
              <span>アンケート結果</span>
              <span className="arrow">›</span>
            </Link>
          </div>
        </>
      )}

      <div className="field-label" style={{ marginTop: 18 }}>
        公開・共有
      </div>
      <div className="manage-nav">
        <Link to={`/publish/${shiori.slug}`}>
          <span>{billing ? 'お支払い・公開の状態' : '公開する(プラン選択)'}</span>
          <span className="arrow">›</span>
        </Link>
        <Link to={`/s/${shiori.slug}/card`}>
          <span>共有カード(QRコード)</span>
          <span className="hint">{paidPlan ? '' : '有料プランの機能'}</span>
        </Link>
        <Link to={`/s/${shiori.slug}/print`}>
          <span>印刷PDF(A4)</span>
          <span className="hint">{paidPlan ? '透かしなし' : '透かし入り'}</span>
        </Link>
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          className="icon-btn"
          onClick={() => {
            const copy = duplicateShiori(shiori)
            navigate(`/manage/${copy.slug}`)
          }}
        >
          このしおりを複製(次回催行用)
        </button>
        {(edited || !builtin) && (
          <button className="icon-btn danger" onClick={removeOrReset}>
            {builtin ? '編集をリセットしてデモに戻す' : 'このしおりを削除'}
          </button>
        )}
      </div>
    </EditorFrame>
  )
}
