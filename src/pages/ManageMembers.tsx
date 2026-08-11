import { useState } from 'react'
import { arrayMove, EditorFrame, Field, RowMenu, TextInput, useDraft } from '../components/Editor'
import { telFromDisplay, uid } from '../lib/docs'
import { yen } from '../lib/settle'
import { effectiveAnswer, feeFor, useShioriState } from '../lib/store'
import type { Member, Shiori } from '../lib/types'

export function ManageMembers({ shiori }: { shiori: Shiori }) {
  const { draft, patch, save, saved } = useDraft(shiori)
  const [state, update] = useShioriState(shiori)
  const [csv, setCsv] = useState('')
  const [csvMsg, setCsvMsg] = useState('')

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
  const isTour = draft.kind === 'tour'

  // 予約システムからのCSV/タブ区切り貼り付け: 名前, 乗車地, 号車, 座席, 電話
  const importCsv = () => {
    const points = draft.boardingPoints ?? []
    const added: Member[] = []
    for (const line of csv.split('\n')) {
      const cols = line.split(/[,\t]/).map((c) => c.trim())
      const name = cols[0]
      if (!name || name === '名前') continue
      const bpName = cols[1]
      const bp = bpName ? points.find((p) => p.name.includes(bpName) || bpName.includes(p.name.split(' ')[0] ?? '')) : undefined
      added.push({
        id: uid('m'),
        name,
        boardingPointId: bp?.id,
        bus: cols[2] || undefined,
        seat: cols[3] || undefined,
        tel: cols[4] ? telFromDisplay(cols[4]) : undefined,
      })
    }
    if (added.length > 0) {
      patch({ members: [...draft.members, ...added] })
      setCsv('')
    }
    setCsvMsg(
      added.length > 0
        ? `${added.length}名を追加しました。内容を確認して「保存する」を押してください`
        : '追加できる行がありませんでした(1行に1名、カンマかタブ区切り)',
    )
  }

  return (
    <EditorFrame
      title={isGroup ? '名簿・出欠状況' : isTour ? '名簿・座席' : '同行者'}
      backTo={`/manage/${shiori.slug}`}
      onSave={save}
      saved={saved}
    >
      <div className="field-label">{isGroup ? '名簿' : '同行者'}</div>
      {draft.members.map((m, i) => (
        <div key={m.id} className="editor-item">
          <div className="editor-item-head">
            <span className="label">
              {m.name || `${i + 1}人目`}
              {m.id === draft.organizerId && isGroup ? '(幹事)' : ''}
            </span>
            <RowMenu
              canUp={i > 0}
              canDown={i < draft.members.length - 1}
              onUp={() => patch({ members: arrayMove(draft.members, i, -1) })}
              onDown={() => patch({ members: arrayMove(draft.members, i, 1) })}
              onDelete={() => removeMember(i)}
            />
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
            {isTour && (
              <Field label="乗車地">
                <select
                  className="text-input"
                  value={m.boardingPointId ?? ''}
                  onChange={(e) =>
                    setMember(i, { boardingPointId: e.target.value || undefined })
                  }
                >
                  <option value="">未割当</option>
                  {(draft.boardingPoints ?? []).map((bp) => (
                    <option key={bp.id} value={bp.id}>
                      {bp.time} {bp.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          {isTour && (
            <div className="form-grid2">
              <Field label="号車">
                <TextInput
                  value={m.bus ?? ''}
                  onChange={(v) => setMember(i, { bus: v || undefined })}
                  placeholder="1"
                />
              </Field>
              <Field label="座席">
                <TextInput
                  value={m.seat ?? ''}
                  onChange={(v) => setMember(i, { seat: v || undefined })}
                  placeholder="12A"
                />
              </Field>
            </div>
          )}
          {isTour && (
            <Field label="電話番号(任意・点呼時の連絡用)">
              <TextInput
                value={m.tel?.display ?? ''}
                onChange={(v) => setMember(i, { tel: telFromDisplay(v) })}
                placeholder="090-XXXX-XXXX"
              />
            </Field>
          )}
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
        ＋ {isGroup ? 'メンバー' : isTour ? 'お客様' : '同行者'}を追加
      </button>

      {isTour && (
        <div style={{ marginTop: 24 }}>
          <div className="field-label">予約名簿の一括取り込み(CSV/タブ区切り)</div>
          <textarea
            className="text-input"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={'1行に1名: 名前, 乗車地, 号車, 座席, 電話\n例: 佐藤, 名古屋駅, 1, 5A, 090-1234-5678'}
          />
          <button className="icon-btn" style={{ marginTop: 8 }} onClick={importCsv}>
            取り込む
          </button>
          {csvMsg && (
            <div style={{ fontSize: 13, color: 'var(--accent)', marginTop: 6, lineHeight: 1.6 }}>
              {csvMsg}
            </div>
          )}
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, marginTop: 6 }}>
            乗車地は名前の一部が一致すれば自動で割り当てます。予約システムからのコピー&ペーストを想定しています。
          </div>
        </div>
      )}

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
