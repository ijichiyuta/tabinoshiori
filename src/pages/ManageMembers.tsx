import { arrayMove, EditorFrame, Field, TextInput, useDraft } from '../components/Editor'
import { uid } from '../lib/docs'
import { yen } from '../lib/settle'
import { effectiveAnswer, feeFor, useShioriState } from '../lib/store'
import type { Member, Shiori } from '../lib/types'

export function ManageMembers({ shiori }: { shiori: Shiori }) {
  const { draft, patch, save, saved } = useDraft(shiori)
  const [state, update] = useShioriState(shiori)

  const setMember = (i: number, m: Partial<Member>) =>
    patch({ members: draft.members.map((x, j) => (j === i ? { ...x, ...m } : x)) })

  const setOrganizer = (id: string) =>
    patch({
      organizerId: id,
      members: draft.members.map((m) => ({ ...m, role: m.id === id ? '幹事' : undefined })),
    })

  const removeMember = (i: number) => {
    const m = draft.members[i]
    if (!m) return
    if (draft.members.length <= (draft.kind === 'duo' ? 2 : 1)) {
      window.alert(draft.kind === 'duo' ? '少人数のしおりは2名以上にしてください' : '最低1名は必要です')
      return
    }
    if (!window.confirm(`${m.name} さんを名簿から削除しますか？`)) return
    patch({ members: draft.members.filter((_, j) => j !== i) })
  }

  const togglePaid = (memberId: string) => {
    const a = effectiveAnswer(shiori, state, memberId)
    if (!a) return
    update((s) => ({
      answers: { ...s.answers, [memberId]: { ...a, paid: !a.paid } },
    }))
  }

  const isGroup = draft.kind === 'group'

  return (
    <EditorFrame
      title={isGroup ? '名簿・出欠状況' : '同行者'}
      backTo={`/manage/${shiori.slug}`}
      onSave={save}
      saved={saved}
    >
      <div className="field-label">{isGroup ? '名簿' : '同行者'}</div>
      {draft.members.map((m, i) => (
        <div key={m.id} className="editor-item">
          <div className="editor-item-head">
            <span className="label">
              {i + 1}人目{m.id === draft.organizerId && isGroup ? '(幹事)' : ''}
            </span>
            <span className="icon-btns">
              <button className="icon-btn" disabled={i === 0} onClick={() => patch({ members: arrayMove(draft.members, i, -1) })}>
                ↑
              </button>
              <button
                className="icon-btn"
                disabled={i === draft.members.length - 1}
                onClick={() => patch({ members: arrayMove(draft.members, i, 1) })}
              >
                ↓
              </button>
              <button className="icon-btn danger" onClick={() => removeMember(i)}>
                削除
              </button>
            </span>
          </div>
          <div className="form-grid2">
            <Field label="名前">
              <TextInput value={m.name} onChange={(v) => setMember(i, { name: v })} />
            </Field>
            {isGroup && (
              <Field label="参加費の区分">
                <TextInput
                  value={m.category ?? '一般'}
                  onChange={(v) => setMember(i, { category: v === '一般' ? undefined : v })}
                  placeholder="一般"
                />
              </Field>
            )}
          </div>
          {isGroup && (
            <label className="inline-check">
              <input
                type="radio"
                checked={m.id === draft.organizerId}
                onChange={() => setOrganizer(m.id)}
              />
              この人が幹事
            </label>
          )}
        </div>
      ))}
      <button
        className="add-btn"
        onClick={() => patch({ members: [...draft.members, { id: uid('m'), name: '' }] })}
      >
        ＋ {isGroup ? 'メンバー' : '同行者'}を追加
      </button>

      {isGroup && (
        <>
          <div className="field-label" style={{ marginTop: 24 }}>
            出欠・集金の状況
          </div>
          <div className="hairline-block">
            <div className="status-row head">
              <span>名前</span>
              <span>出欠</span>
              <span>参加費</span>
              <span>集金</span>
            </div>
            {shiori.members.map((m) => {
              const a = effectiveAnswer(shiori, state, m.id)
              const fee = feeFor(shiori, m.id)
              return (
                <div key={m.id} className="status-row">
                  <span>{m.name}</span>
                  <span className="att">{a ? a.attendance : '未回答'}</span>
                  <span className="att tnum">
                    {a && a.attendance !== '不参加' && fee ? yen(fee.amount) : '—'}
                  </span>
                  {a && a.attendance !== '不参加' ? (
                    <label className="inline-check tnum">
                      <input type="checkbox" checked={a.paid} onChange={() => togglePaid(m.id)} />
                      {a.paid ? '済' : '未'}
                    </label>
                  ) : (
                    <span className="att">—</span>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, marginTop: 10 }}>
            現金で受け取った場合などは、ここで「集金」に印を付けられます。
            デモのため、この端末で行われた回答だけが反映されます。
          </div>
        </>
      )}
    </EditorFrame>
  )
}
