import { arrayMove, EditorFrame, Field, RowMenu, TextInput, useDraft } from '../components/Editor'
import { mapQueryFromUrl, mapUrlFromQuery, uid } from '../lib/docs'
import { useShioriState } from '../lib/store'
import type { Shiori } from '../lib/types'

/* ---------- 乗車地エディタ ---------- */
export function ManageBoarding({ shiori }: { shiori: Shiori }) {
  const { draft, patch, save, saved } = useDraft(shiori)
  const points = draft.boardingPoints ?? []
  const set = (i: number, p: Partial<(typeof points)[number]>) =>
    patch({ boardingPoints: points.map((x, j) => (j === i ? { ...x, ...p } : x)) })

  return (
    <EditorFrame title="乗車地" backTo={`/manage/${shiori.slug}`} shiori={shiori} onSave={save} saved={saved}>
      <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--sub)', lineHeight: 1.7 }}>
        参加者には自分の乗車地が「あなたの集合」として表紙に表示されます。
        名簿で各参加者に乗車地を割り当ててください。
      </p>
      {points.map((bp, i) => (
        <div key={bp.id} className="editor-item">
          <div className="editor-item-head">
            <span className="label">乗車地 {i + 1}{bp.name ? `・${bp.name}` : ''}</span>
            <RowMenu
              canUp={i > 0}
              canDown={i < points.length - 1}
              onUp={() => patch({ boardingPoints: arrayMove(points, i, -1) })}
              onDown={() => patch({ boardingPoints: arrayMove(points, i, 1) })}
              onDelete={() => patch({ boardingPoints: points.filter((_, j) => j !== i) })}
              confirmMessage={`${bp.name || `乗車地 ${i + 1}`} を削除しますか？`}
            />
          </div>
          <div className="form-grid2">
            <Field label="出発時刻">
              <TextInput value={bp.time} onChange={(v) => set(i, { time: v })} placeholder="7:10" />
            </Field>
            <Field label="地図(検索語かURL・任意)">
              <TextInput
                value={mapQueryFromUrl(bp.mapUrl)}
                onChange={(v) => set(i, { mapUrl: mapUrlFromQuery(v) })}
              />
            </Field>
          </div>
          <Field label="乗車地の名前">
            <TextInput
              value={bp.name}
              onChange={(v) => set(i, { name: v })}
              placeholder="名古屋駅 太閤通口 観光バスのりば"
            />
          </Field>
          <Field label="補足(任意)">
            <TextInput
              value={bp.desc ?? ''}
              onChange={(v) => set(i, { desc: v || undefined })}
              placeholder="出発5分前までにお越しください"
            />
          </Field>
        </div>
      ))}
      <button
        className="add-btn"
        onClick={() =>
          patch({ boardingPoints: [...points, { id: uid('bp'), name: '', time: '8:00' }] })
        }
      >
        ＋ 乗車地を追加
      </button>
    </EditorFrame>
  )
}

/* ---------- ご案内(旅行条件・FAQ)エディタ ---------- */
export function ManageNotices({ shiori }: { shiori: Shiori }) {
  const { draft, patch, save, saved } = useDraft(shiori)
  const notices = draft.notices ?? []
  return (
    <EditorFrame title="ご案内(旅行条件・FAQ)" backTo={`/manage/${shiori.slug}`} shiori={shiori} onSave={save} saved={saved}>
      <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--sub)', lineHeight: 1.7 }}>
        キャンセル規定・旅行条件・よくある質問など。参加者の表紙の「ご案内」から見られます。
      </p>
      {notices.map((n, i) => (
        <div key={n.id} className="editor-item">
          <div className="editor-item-head">
            <span className="label">{n.title || `${i + 1}件目`}</span>
            <RowMenu
              canUp={i > 0}
              canDown={i < notices.length - 1}
              onUp={() => patch({ notices: arrayMove(notices, i, -1) })}
              onDown={() => patch({ notices: arrayMove(notices, i, 1) })}
              onDelete={() => patch({ notices: notices.filter((_, j) => j !== i) })}
              confirmMessage={`${n.title || `${i + 1}件目`} を削除しますか？`}
            />
          </div>
          <Field label="見出し">
            <TextInput
              value={n.title}
              onChange={(v) =>
                patch({ notices: notices.map((x, j) => (j === i ? { ...x, title: v } : x)) })
              }
              placeholder="キャンセル規定"
            />
          </Field>
          <Field label="本文">
            <textarea
              className="text-input"
              value={n.body}
              onChange={(e) =>
                patch({
                  notices: notices.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)),
                })
              }
            />
          </Field>
        </div>
      ))}
      <button
        className="add-btn"
        onClick={() => patch({ notices: [...notices, { id: uid('n'), title: '', body: '' }] })}
      >
        ＋ ご案内を追加
      </button>
    </EditorFrame>
  )
}

/* ---------- 点呼・乗車確認(添乗員向け・当日) ---------- */
export function ManageCheckin({ shiori }: { shiori: Shiori }) {
  const [state, update] = useShioriState(shiori)
  const checkin = state.checkin ?? {}
  const points = shiori.boardingPoints ?? []
  const assigned = new Set(points.map((p) => p.id))
  const groups = [
    ...points.map((p) => ({
      key: p.id,
      title: `${p.time}　${p.name}`,
      members: shiori.members.filter((m) => m.boardingPointId === p.id),
    })),
    {
      key: 'none',
      title: '乗車地未割当',
      members: shiori.members.filter((m) => !m.boardingPointId || !assigned.has(m.boardingPointId)),
    },
  ].filter((g) => g.members.length > 0)

  const total = shiori.members.length
  const done = shiori.members.filter((m) => checkin[m.id]).length

  const toggle = (id: string) =>
    update((s) => ({ checkin: { ...(s.checkin ?? {}), [id]: !s.checkin?.[id] } }))

  const reset = () => {
    if (window.confirm('点呼をすべて未確認に戻しますか？')) update({ checkin: {} })
  }

  return (
    <EditorFrame title="点呼・乗車確認" backTo={`/manage/${shiori.slug}`} shiori={shiori}>
      <div className="card accent" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>乗車済み</span>
        <span className="serif tnum" style={{ fontSize: 28, fontWeight: 600 }}>
          {done} <span style={{ fontSize: 16, color: 'var(--muted)' }}>/ {total}名</span>
        </span>
      </div>
      {groups.map((g) => {
        const gDone = g.members.filter((m) => checkin[m.id]).length
        return (
          <div key={g.key} style={{ marginTop: 18 }}>
            <div className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="tnum">{g.title}</span>
              <span className="tnum" style={{ color: gDone === g.members.length ? 'var(--accent)' : 'var(--warn)' }}>
                {gDone}/{g.members.length}
              </span>
            </div>
            <div className="hairline-block">
              {g.members.map((m) => {
                const on = !!checkin[m.id]
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      columnGap: 10,
                      alignItems: 'center',
                      padding: '4px 2px',
                      borderBottom: '1px solid var(--line-lt)',
                    }}
                  >
                    <button
                      onClick={() => toggle(m.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        border: 'none',
                        background: 'transparent',
                        padding: '9px 0',
                        cursor: 'pointer',
                        color: 'var(--ink)',
                        textAlign: 'left',
                      }}
                    >
                      <span className={`check-box${on ? ' on' : ''}`}>{on ? '✓' : ''}</span>
                      <span style={{ fontSize: 16 }} className={on ? 'muted' : ''}>
                        {m.name}
                      </span>
                    </button>
                    <span className="tnum" style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {m.bus ? `${m.bus}号車 ${m.seat ?? ''}` : ''}
                    </span>
                    {m.tel ? (
                      <a href={m.tel.href} style={{ fontSize: 13.5 }}>
                        電話
                      </a>
                    ) : (
                      <span />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      <div style={{ marginTop: 20 }}>
        <button className="icon-btn danger" onClick={reset}>
          点呼をリセット
        </button>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, marginTop: 10 }}>
        点呼は全スタッフの端末で共有されます(他の端末の操作は、この画面を開き直すと反映されます)。
        追加のスタッフには、このページのURLと管理コードを伝えるだけでOKです(コード入力で点呼に参加できます)。
      </div>
    </EditorFrame>
  )
}

/* ---------- アンケート結果 ---------- */
export function ManageSurveyResults({ shiori }: { shiori: Shiori }) {
  const [state] = useShioriState(shiori)
  const surveys = state.surveys ?? {}
  const entries = shiori.members.flatMap((m) => {
    const s = surveys[m.id]
    return s ? [{ m, s }] : []
  })
  const avg =
    entries.length > 0
      ? (entries.reduce((sum, e) => sum + e.s.rating, 0) / entries.length).toFixed(1)
      : null

  return (
    <EditorFrame title="アンケート結果" backTo={`/manage/${shiori.slug}`} shiori={shiori}>
      <div className="card accent" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>
          回答 {entries.length}件 / {shiori.members.length}名
        </span>
        <span className="serif tnum" style={{ fontSize: 28, fontWeight: 600 }}>
          {avg ?? '—'} <span style={{ fontSize: 14, color: 'var(--muted)' }}>/ 5</span>
        </span>
      </div>
      {entries.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.8, marginTop: 16 }}>
          まだ回答がありません。ツアー終了後、参加者の表紙にアンケートのお願いが表示されます
          (デモでは行程の翌日以降。URLに <span className="mono">?now=</span> を付けて確認できます)。
        </p>
      ) : (
        <div className="hairline-block" style={{ marginTop: 16 }}>
          {entries.map(({ m, s }) => (
            <div key={m.id} style={{ padding: '12px 2px', borderBottom: '1px solid var(--line-lt)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{m.name}</span>
                <span className="tnum" style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 700 }}>
                  {'★'.repeat(s.rating)}
                  <span style={{ color: 'var(--line)' }}>{'★'.repeat(5 - s.rating)}</span>
                </span>
              </div>
              {s.comment && (
                <div style={{ fontSize: 14, color: 'var(--sub)', lineHeight: 1.7, marginTop: 4 }}>
                  {s.comment}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </EditorFrame>
  )
}
