import { Details, EditorFrame, Field, TextInput, useDraft } from '../components/Editor'
import { dateLabelRange, telFromDisplay } from '../lib/docs'
import { fileToDataUrl } from '../lib/image'
import type { Shiori } from '../lib/types'

export function ManageEditBasic({ shiori }: { shiori: Shiori }) {
  const { draft, patch, save, saved } = useDraft(shiori)

  const feeRows = draft.fee?.rows ?? []
  const setFeeRow = (i: number, cat: string, amountStr: string) => {
    const rows = feeRows.map((r, j) =>
      j === i ? { category: cat, amount: Number(amountStr.replace(/[^0-9]/g, '')) || 0 } : r,
    )
    patch({ fee: { ...(draft.fee ?? { rows: [] }), rows } })
  }

  const uploadPhoto = async (file: File | undefined) => {
    if (!file) return
    try {
      const dataUrl = await fileToDataUrl(file)
      // 大きすぎるとlocalStorage/サーバー保存に失敗するため上限を設ける
      if (dataUrl.length > 2_000_000) {
        window.alert('写真のサイズが大きすぎます。別の写真か、小さめの画像をお試しください。')
        return
      }
      patch({ photo: dataUrl })
    } catch {
      window.alert('画像を読み込めませんでした')
    }
  }

  return (
    <EditorFrame
      title="基本情報"
      backTo={`/manage/${shiori.slug}`} shiori={shiori}
      onSave={save}
      saved={saved}
    >
      <Field
        label="テーマ"
        hint="しおり全体(表紙・行程・印刷・共有カード)の雰囲気が切り替わります"
      >
        <div className="radio-list">
          <button
            className={draft.theme !== 'casual' ? 'on' : ''}
            onClick={() => patch({ theme: 'classic' })}
          >
            <span className="radio" />
            きっちり(和・明朝)
          </button>
          <button
            className={draft.theme === 'casual' ? 'on' : ''}
            onClick={() => patch({ theme: 'casual' })}
          >
            <span className="radio" />
            カジュアル(ゴシック)
          </button>
        </div>
      </Field>

      <Field label="上部ラベル(グループ名・旅の名前)">
        <TextInput value={draft.eyebrow} onChange={(v) => patch({ eyebrow: v })} />
      </Field>
      <div className="form-grid2">
        <Field label="タイトル">
          <TextInput value={draft.title} onChange={(v) => patch({ title: v })} />
        </Field>
        <Field label="サブタイトル">
          <TextInput value={draft.subtitle} onChange={(v) => patch({ subtitle: v })} />
        </Field>
      </div>
      <Field label="日程の表示" hint="「日程から自動生成」で行程の日付から作り直せます">
        <TextInput value={draft.dateLabel} onChange={(v) => patch({ dateLabel: v })} />
        <button
          className="icon-btn"
          style={{ marginTop: 6 }}
          onClick={() => patch({ dateLabel: dateLabelRange(draft.days.map((d) => d.date)) })}
        >
          日程から自動生成
        </button>
      </Field>
      {draft.kind !== 'duo' && (
        <Field label="行き先">
          <TextInput value={draft.destination ?? ''} onChange={(v) => patch({ destination: v })} />
        </Field>
      )}

      {draft.kind === 'tour' && (
        <>
          <div className="field-label" style={{ marginTop: 8 }}>
            催行会社(参加者への表示・当日連絡先)
          </div>
          <div className="form-grid2">
            <Field label="会社名">
              <TextInput
                value={draft.operator?.name ?? ''}
                onChange={(v) => patch({ operator: { ...(draft.operator ?? { name: '' }), name: v } })}
              />
            </Field>
            <Field label="当日連絡先の電話">
              <TextInput
                value={draft.operator?.tel?.display ?? ''}
                onChange={(v) =>
                  patch({
                    operator: { ...(draft.operator ?? { name: '' }), tel: telFromDisplay(v) },
                  })
                }
                placeholder="052-XXX-XXXX"
              />
            </Field>
          </div>
          <Field label="連絡先の補足(任意)" hint="例: 当日連絡先(6:30〜)。お名前と乗車地をお伝えください">
            <TextInput
              value={draft.operator?.note ?? ''}
              onChange={(v) =>
                patch({ operator: { ...(draft.operator ?? { name: '' }), note: v || undefined } })
              }
            />
          </Field>
        </>
      )}
      <Details summary="宿・宿の連絡先(任意)" defaultOpen={!!draft.lodging?.name}>
        <div className="form-grid2">
          <Field label="宿の名前">
            <TextInput
              value={draft.lodging?.name ?? ''}
              onChange={(v) =>
                patch({ lodging: v ? { name: v, tel: draft.lodging?.tel } : undefined })
              }
            />
          </Field>
          <Field label="宿の電話番号">
            <TextInput
              value={draft.lodging?.tel?.display ?? ''}
              onChange={(v) =>
                patch({
                  lodging: draft.lodging
                    ? { ...draft.lodging, tel: telFromDisplay(v) }
                    : { name: '', tel: telFromDisplay(v) },
                })
              }
              placeholder="0596-XX-XXXX"
            />
          </Field>
        </div>
      </Details>

      <Details
        summary="表紙の見た目を調整(見出し・写真など)"
        defaultOpen={!!(draft.photo || draft.coverBadge)}
      >
        <div className="form-grid2">
          <Field label="表紙の見出し文字">
            <TextInput value={draft.coverLabel} onChange={(v) => patch({ coverLabel: v })} />
          </Field>
          <Field label="右上の小さな表記">
            <TextInput value={draft.cornerNote} onChange={(v) => patch({ cornerNote: v })} />
          </Field>
        </div>
        <Field
          label="表紙写真(任意)"
          hint="設定するとタイポグラフィ表紙の代わりに写真帯付き表紙になります"
        >
          {draft.photo && (
            <div
              style={{
                height: 120,
                backgroundImage: `url(${draft.photo})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '1px solid var(--line)',
                borderRadius: 5,
                marginBottom: 8,
              }}
            />
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label className="icon-btn" style={{ display: 'inline-block' }}>
              写真を選ぶ
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => uploadPhoto(e.target.files?.[0])}
              />
            </label>
            {draft.photo && (
              <button className="icon-btn danger" onClick={() => patch({ photo: undefined })}>
                写真を削除
              </button>
            )}
          </div>
        </Field>
        {draft.kind === 'duo' && (
          <Field label="表紙のバッジ(任意)" hint="例: 宿代 前払済 ✓">
            <TextInput
              value={draft.coverBadge ?? ''}
              onChange={(v) => patch({ coverBadge: v || undefined })}
            />
          </Field>
        )}
      </Details>

      {draft.kind === 'group' && (
        <>
          <div className="field-label" style={{ marginTop: 20 }}>
            参加費
          </div>
          {feeRows.map((r, i) => (
            <div key={i} className="form-grid2">
              <Field label="区分">
                <TextInput value={r.category} onChange={(v) => setFeeRow(i, v, String(r.amount))} />
              </Field>
              <Field label="金額(円)">
                <div style={{ display: 'flex', gap: 6 }}>
                  <TextInput
                    value={String(r.amount)}
                    onChange={(v) => setFeeRow(i, r.category, v)}
                  />
                  <button
                    className="icon-btn danger"
                    onClick={() =>
                      window.confirm(`区分「${r.category || `${i + 1}件目`}」を削除しますか？`) &&
                      patch({
                        fee: {
                          ...(draft.fee ?? { rows: [] }),
                          rows: feeRows.filter((_, j) => j !== i),
                        },
                      })
                    }
                  >
                    削除
                  </button>
                </div>
              </Field>
            </div>
          ))}
          <button
            className="add-btn"
            onClick={() =>
              patch({
                fee: {
                  ...(draft.fee ?? { rows: [] }),
                  rows: [...feeRows, { category: '学生', amount: 0 }],
                },
              })
            }
          >
            ＋ 区分を追加
          </button>
          <Field label="支払い締切(表示用)" hint="例: 8/15">
            <TextInput
              value={draft.fee?.deadline ?? ''}
              onChange={(v) =>
                patch({ fee: { rows: feeRows, deadline: v || undefined } })
              }
            />
          </Field>
          <Details summary="回答フォームの選択肢を調整(出欠・交通手段)">
            <Field label="出欠の選択肢(読点区切り)" hint="例: 参加、不参加、1日目のみ">
              <TextInput
                value={draft.attendanceOptions.join('、')}
                onChange={(v) =>
                  patch({ attendanceOptions: v.split(/[、,]/).map((s) => s.trim()).filter(Boolean) })
                }
              />
            </Field>
            <Field label="交通手段の選択肢(読点区切り)">
              <TextInput
                value={draft.transportOptions.join('、')}
                onChange={(v) =>
                  patch({ transportOptions: v.split(/[、,]/).map((s) => s.trim()).filter(Boolean) })
                }
              />
            </Field>
          </Details>
        </>
      )}

      <Details
        summary="セキュリティ(管理コード)"
        defaultOpen={!!draft.security?.adminPin || draft.kind === 'tour'}
      >
        <Field
          label="管理コード(任意)"
          hint="設定すると管理画面(/manage)と公開・お支払いを開くときに要求されます。空欄で無効"
        >
          <TextInput
            value={draft.security?.adminPin ?? ''}
            onChange={(v) =>
              patch({ security: { ...(draft.security ?? {}), adminPin: v.trim() || undefined } })
            }
            placeholder="例: 0829"
          />
        </Field>
        {draft.kind === 'tour' && (
          <div className="note-l" style={{ fontSize: 13, lineHeight: 1.8 }}>
            ツアーの名簿は参加者には表示されません(標準仕様)。お客様は「招待リンク(個別URL)」
            または「予約名の姓+電話番号下4桁」でご本人のしおりだけを開けます。
          </div>
        )}
      </Details>
    </EditorFrame>
  )
}
