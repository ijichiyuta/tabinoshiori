import { arrayMove, EditorFrame, Field, TextInput, useDraft } from '../components/Editor'
import { telFromDisplay, uid } from '../lib/docs'
import type { Shiori } from '../lib/types'

/* ---------- 持ち物 ---------- */
export function ManageItems({ shiori }: { shiori: Shiori }) {
  const { draft, patch, save, saved } = useDraft(shiori)
  const items = draft.checklist
  return (
    <EditorFrame title="持ち物" backTo={`/manage/${shiori.slug}`} onSave={save} saved={saved}>
      {items.map((item, i) => (
        <div key={item.id} className="editor-item">
          <div className="editor-item-head">
            <span className="label">{i + 1}</span>
            <span className="icon-btns">
              <button className="icon-btn" disabled={i === 0} onClick={() => patch({ checklist: arrayMove(items, i, -1) })}>
                ↑
              </button>
              <button
                className="icon-btn"
                disabled={i === items.length - 1}
                onClick={() => patch({ checklist: arrayMove(items, i, 1) })}
              >
                ↓
              </button>
              <button
                className="icon-btn danger"
                onClick={() => patch({ checklist: items.filter((_, j) => j !== i) })}
              >
                削除
              </button>
            </span>
          </div>
          <Field label="持ち物">
            <TextInput
              value={item.label}
              onChange={(v) =>
                patch({ checklist: items.map((x, j) => (j === i ? { ...x, label: v } : x)) })
              }
              placeholder="ラケット"
            />
          </Field>
          <Field label="補足(任意)">
            <TextInput
              value={item.note ?? ''}
              onChange={(v) =>
                patch({
                  checklist: items.map((x, j) => (j === i ? { ...x, note: v || undefined } : x)),
                })
              }
              placeholder="外履き不可"
            />
          </Field>
        </div>
      ))}
      <button
        className="add-btn"
        onClick={() => patch({ checklist: [...items, { id: uid('c'), label: '' }] })}
      >
        ＋ 持ち物を追加
      </button>
    </EditorFrame>
  )
}

/* ---------- 連絡先 ---------- */
export function ManageContacts({ shiori }: { shiori: Shiori }) {
  const { draft, patch, save, saved } = useDraft(shiori)
  const list = draft.contacts
  return (
    <EditorFrame title="連絡先" backTo={`/manage/${shiori.slug}`} onSave={save} saved={saved}>
      {list.map((c, i) => (
        <div key={c.id} className="editor-item">
          <div className="editor-item-head">
            <span className="label">{c.label || `${i + 1}件目`}</span>
            <span className="icon-btns">
              <button className="icon-btn" disabled={i === 0} onClick={() => patch({ contacts: arrayMove(list, i, -1) })}>
                ↑
              </button>
              <button
                className="icon-btn"
                disabled={i === list.length - 1}
                onClick={() => patch({ contacts: arrayMove(list, i, 1) })}
              >
                ↓
              </button>
              <button
                className="icon-btn danger"
                onClick={() => patch({ contacts: list.filter((_, j) => j !== i) })}
              >
                削除
              </button>
            </span>
          </div>
          <div className="form-grid2">
            <Field label="種別">
              <TextInput
                value={c.label}
                onChange={(v) =>
                  patch({ contacts: list.map((x, j) => (j === i ? { ...x, label: v } : x)) })
                }
                placeholder="幹事／宿／会場"
              />
            </Field>
            <Field label="名前">
              <TextInput
                value={c.name}
                onChange={(v) =>
                  patch({ contacts: list.map((x, j) => (j === i ? { ...x, name: v } : x)) })
                }
              />
            </Field>
          </div>
          <div className="form-grid2">
            <Field label="電話番号(任意)">
              <TextInput
                value={c.tel?.display ?? ''}
                onChange={(v) =>
                  patch({
                    contacts: list.map((x, j) => (j === i ? { ...x, tel: telFromDisplay(v) } : x)),
                  })
                }
                placeholder="090-XXXX-XXXX"
              />
            </Field>
            <Field label="補足(任意)">
              <TextInput
                value={c.note ?? ''}
                onChange={(v) =>
                  patch({
                    contacts: list.map((x, j) => (j === i ? { ...x, note: v || undefined } : x)),
                  })
                }
              />
            </Field>
          </div>
        </div>
      ))}
      <button
        className="add-btn"
        onClick={() =>
          patch({ contacts: [...list, { id: uid('ct'), label: '', name: '' }] })
        }
      >
        ＋ 連絡先を追加
      </button>
    </EditorFrame>
  )
}

/* ---------- 更新告知 ---------- */
export function ManageUpdates({ shiori }: { shiori: Shiori }) {
  const { draft, patch, save, saved } = useDraft(shiori)
  const list = draft.updates
  return (
    <EditorFrame title="更新告知" backTo={`/manage/${shiori.slug}`} onSave={save} saved={saved}>
      <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--sub)', lineHeight: 1.7 }}>
        しおりの上部バナーには<strong>最新の1件</strong>が表示されます。
        集合時刻の変更など、参加者に必ず伝えたいことを書いてください。
      </p>
      {list.map((u, i) => (
        <div key={u.id} className="editor-item">
          <div className="editor-item-head">
            <span className="label">{i === list.length - 1 ? '表示中(最新)' : `過去分 ${i + 1}`}</span>
            <button
              className="icon-btn danger"
              onClick={() => patch({ updates: list.filter((_, j) => j !== i) })}
            >
              削除
            </button>
          </div>
          <div className="form-grid2">
            <Field label="日付(表示用)">
              <TextInput
                value={u.date}
                onChange={(v) =>
                  patch({ updates: list.map((x, j) => (j === i ? { ...x, date: v } : x)) })
                }
                placeholder="8/20"
              />
            </Field>
          </div>
          <Field label="内容">
            <TextInput
              value={u.text}
              onChange={(v) =>
                patch({ updates: list.map((x, j) => (j === i ? { ...x, text: v } : x)) })
              }
              placeholder="集合時刻が 7:30 に変更されました"
            />
          </Field>
        </div>
      ))}
      <button
        className="add-btn"
        onClick={() => {
          const now = new Date()
          patch({
            updates: [...list, { id: uid('u'), date: `${now.getMonth() + 1}/${now.getDate()}`, text: '' }],
          })
        }}
      >
        ＋ 告知を追加
      </button>
    </EditorFrame>
  )
}

/* ---------- 費用・予約控え(少人数) ---------- */
export function ManageCosts({ shiori }: { shiori: Shiori }) {
  const { draft, patch, save, saved } = useDraft(shiori)
  const list = draft.expenses ?? []
  return (
    <EditorFrame title="費用・予約控え" backTo={`/manage/${shiori.slug}`} onSave={save} saved={saved}>
      <div className="field-label">立替の記録</div>
      {list.map((e, i) => (
        <div key={e.id} className="editor-item">
          <div className="editor-item-head">
            <span className="label">{i + 1}件目</span>
            <button
              className="icon-btn danger"
              onClick={() => patch({ expenses: list.filter((_, j) => j !== i) })}
            >
              削除
            </button>
          </div>
          <Field label="項目">
            <TextInput
              value={e.label}
              onChange={(v) =>
                patch({ expenses: list.map((x, j) => (j === i ? { ...x, label: v } : x)) })
              }
              placeholder="宿 2泊"
            />
          </Field>
          <div className="form-grid2">
            <Field label="立て替えた人">
              <select
                className="text-input"
                value={e.payerId}
                onChange={(ev) =>
                  patch({
                    expenses: list.map((x, j) => (j === i ? { ...x, payerId: ev.target.value } : x)),
                  })
                }
              >
                {draft.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="金額(円)">
              <TextInput
                value={String(e.amount)}
                onChange={(v) =>
                  patch({
                    expenses: list.map((x, j) =>
                      j === i ? { ...x, amount: Number(v.replace(/[^0-9]/g, '')) || 0 } : x,
                    ),
                  })
                }
              />
            </Field>
          </div>
        </div>
      ))}
      <button
        className="add-btn"
        onClick={() =>
          patch({
            expenses: [
              ...list,
              { id: uid('x'), label: '', payerId: draft.members[0]?.id ?? '', amount: 0 },
            ],
          })
        }
      >
        ＋ 立替を追加
      </button>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, margin: '8px 0 20px' }}>
        合計・1人あたり・精算(誰が誰へいくら)は自動で計算されます。
      </div>

      <Field label="予約控え(1行に1件)">
        <textarea
          className="text-input"
          value={(draft.reservations ?? []).join('\n')}
          onChange={(e) =>
            patch({
              reservations: e.target.value.split('\n').filter((line) => line.trim() !== ''),
            })
          }
          placeholder={'柳湯の宿　予約番号 R-88214\nチェックイン 15:00 ／ 夕食 18:30'}
        />
      </Field>
    </EditorFrame>
  )
}
