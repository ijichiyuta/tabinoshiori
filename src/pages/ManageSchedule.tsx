import { arrayMove, EditorFrame, Field, TextInput, useDraft } from '../components/Editor'
import { dayLabelFromDate, mapQueryFromUrl, mapUrlFromQuery, uid } from '../lib/docs'
import type { ItineraryDay, ItineraryEvent, Shiori } from '../lib/types'

export function ManageSchedule({ shiori }: { shiori: Shiori }) {
  const { draft, patch, save, saved } = useDraft(shiori)

  const setDay = (di: number, d: Partial<ItineraryDay>) =>
    patch({ days: draft.days.map((day, i) => (i === di ? { ...day, ...d } : day)) })

  const setEvent = (di: number, ei: number, e: Partial<ItineraryEvent>) => {
    const day = draft.days[di]
    if (!day) return
    setDay(di, {
      events: day.events.map((ev, i) => (i === ei ? { ...ev, ...e } : ev)),
    })
  }

  const addDay = () => {
    const last = draft.days[draft.days.length - 1]
    let date = ''
    if (last?.date) {
      const d = new Date(`${last.date}T00:00:00`)
      d.setDate(d.getDate() + 1)
      date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    patch({
      days: [
        ...draft.days,
        { id: uid('d'), date, label: dayLabelFromDate(date, draft.days.length), events: [] },
      ],
    })
  }

  const addEvent = (di: number) => {
    const evs = draft.days[di]?.events
    if (!evs) return
    const lastTime = evs[evs.length - 1]?.time ?? '9:00'
    setDay(di, {
      events: [...evs, { id: uid('e'), time: lastTime, title: '', kind: 'event' }],
    })
  }

  return (
    <EditorFrame title="行程" backTo={`/manage/${shiori.slug}`} onSave={save} saved={saved}>
      {draft.days.map((day, di) => (
        <div key={day.id} style={{ marginBottom: 26 }}>
          <div className="editor-item" style={{ background: 'var(--banner)' }}>
            <div className="editor-item-head">
              <span className="label">{di + 1}日目</span>
              <span className="icon-btns">
                <button className="icon-btn" disabled={di === 0} onClick={() => patch({ days: arrayMove(draft.days, di, -1) })}>
                  ↑
                </button>
                <button
                  className="icon-btn"
                  disabled={di === draft.days.length - 1}
                  onClick={() => patch({ days: arrayMove(draft.days, di, 1) })}
                >
                  ↓
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() =>
                    window.confirm(`${day.label} を削除しますか？`) &&
                    patch({ days: draft.days.filter((_, i) => i !== di) })
                  }
                >
                  日を削除
                </button>
              </span>
            </div>
            <div className="form-grid2">
              <Field label="日付">
                <TextInput type="date" value={day.date} onChange={(v) => setDay(di, { date: v })} />
              </Field>
              <Field label="タブの表示">
                <div style={{ display: 'flex', gap: 6 }}>
                  <TextInput value={day.label} onChange={(v) => setDay(di, { label: v })} />
                  <button
                    className="icon-btn"
                    onClick={() => setDay(di, { label: dayLabelFromDate(day.date, di) })}
                  >
                    自動
                  </button>
                </div>
              </Field>
            </div>
          </div>

          {day.events.map((ev, ei) => {
            const transit = ev.kind === 'transit'
            return (
              <div key={ev.id} className={`editor-item${transit ? ' transit' : ''}`}>
                <div className="editor-item-head">
                  <span className="label">
                    {transit ? '移動' : '予定'} {ev.time}
                  </span>
                  <span className="icon-btns">
                    <button className="icon-btn" disabled={ei === 0} onClick={() => setDay(di, { events: arrayMove(day.events, ei, -1) })}>
                      ↑
                    </button>
                    <button
                      className="icon-btn"
                      disabled={ei === day.events.length - 1}
                      onClick={() => setDay(di, { events: arrayMove(day.events, ei, 1) })}
                    >
                      ↓
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => setDay(di, { events: day.events.filter((_, i) => i !== ei) })}
                    >
                      削除
                    </button>
                  </span>
                </div>
                <label className="inline-check" style={{ marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={transit}
                    onChange={(e) =>
                      setEvent(di, ei, { kind: e.target.checked ? 'transit' : 'event' })
                    }
                  />
                  移動(バス・電車・徒歩など)
                </label>
                <div className="form-grid2">
                  <Field label="時刻">
                    <TextInput value={ev.time} onChange={(v) => setEvent(di, ei, { time: v })} placeholder="7:30" />
                  </Field>
                  {!transit && (
                    <Field label="終了時刻(任意)">
                      <TextInput
                        value={ev.end ?? ''}
                        onChange={(v) => setEvent(di, ei, { end: v || undefined })}
                        placeholder="16:00"
                      />
                    </Field>
                  )}
                </div>
                <Field label={transit ? '移動手段と所要時間' : 'タイトル'}>
                  <TextInput
                    value={ev.title}
                    onChange={(v) => setEvent(di, ei, { title: v })}
                    placeholder={transit ? '貸切バス　約2時間15分' : '集合'}
                  />
                </Field>
                {!transit && (
                  <>
                    <Field label="場所・補足の1行(任意)">
                      <TextInput
                        value={ev.desc ?? ''}
                        onChange={(v) => setEvent(di, ei, { desc: v || undefined })}
                        placeholder="名古屋駅 太閤通口 バスロータリー"
                      />
                    </Field>
                    <Field label="注記(任意)" hint="「重要」は朱色の線で表示されます">
                      <TextInput
                        value={ev.note ?? ''}
                        onChange={(v) => setEvent(di, ei, { note: v || undefined })}
                        placeholder="7:20までに集合。遅れる場合は幹事まで連絡"
                      />
                      {ev.note && (
                        <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
                          <label className="inline-check">
                            <input
                              type="radio"
                              checked={ev.noteLevel !== 'warn'}
                              onChange={() => setEvent(di, ei, { noteLevel: 'info' })}
                            />
                            情報
                          </label>
                          <label className="inline-check">
                            <input
                              type="radio"
                              checked={ev.noteLevel === 'warn'}
                              onChange={() => setEvent(di, ei, { noteLevel: 'warn' })}
                            />
                            重要(朱)
                          </label>
                        </div>
                      )}
                    </Field>
                    <div className="form-grid2">
                      <Field label="タグ(任意)" hint="例: 自由参加">
                        <TextInput
                          value={ev.tag ?? ''}
                          onChange={(v) => setEvent(di, ei, { tag: v || undefined })}
                        />
                      </Field>
                      <Field label="地図(検索語かURL・任意)">
                        <TextInput
                          value={mapQueryFromUrl(ev.mapUrl)}
                          onChange={(v) => setEvent(di, ei, { mapUrl: mapUrlFromQuery(v) })}
                        />
                      </Field>
                    </div>
                    <Field label="電話番号(任意)">
                      <TextInput
                        value={ev.tel?.display === '電話' ? (ev.tel?.href.replace('tel:', '') ?? '') : (ev.tel?.display ?? '')}
                        onChange={(v) =>
                          setEvent(di, ei, {
                            tel: v.trim()
                              ? { display: '電話', href: `tel:${v.replace(/[^0-9+]/g, '')}` }
                              : undefined,
                          })
                        }
                        placeholder="0599000000"
                      />
                    </Field>
                  </>
                )}
              </div>
            )
          })}
          <button className="add-btn" onClick={() => addEvent(di)}>
            ＋ {di + 1}日目に予定を追加
          </button>
        </div>
      ))}
      <button className="add-btn" onClick={addDay}>
        ＋ 日を追加
      </button>
    </EditorFrame>
  )
}
