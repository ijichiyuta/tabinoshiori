import { AppFrame } from '../components/AppFrame'
import { useShioriState } from '../lib/store'
import type { Shiori } from '../lib/types'

export function Items({ shiori }: { shiori: Shiori }) {
  const [state, update] = useShioriState(shiori)
  const checked = new Set(state.checked)
  const remaining = shiori.checklist.filter((c) => !checked.has(c.id)).length

  const toggle = (id: string) => {
    update((s) => ({
      checked: s.checked.includes(id) ? s.checked.filter((x) => x !== id) : [...s.checked, id],
    }))
  }

  return (
    <AppFrame shiori={shiori} tab="items">
      <div style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 className="page-title">持ち物</h1>
        <span style={{ fontSize: 14, color: remaining > 0 ? 'var(--warn)' : 'var(--muted)' }} className="tnum">
          {shiori.checklist.length === 0
            ? ''
            : remaining > 0
              ? `未チェック ${remaining}件`
              : 'すべてチェック済 ✓'}
        </span>
      </div>
      {shiori.checklist.length === 0 && (
        <p style={{ padding: '14px 20px 0', margin: 0, color: 'var(--muted)', fontSize: 14.5 }}>
          持ち物はまだ登録されていません。
        </p>
      )}
      <div style={{ margin: '14px 20px 0' }} className="check-list">
        {shiori.checklist.map((item) => {
          const on = checked.has(item.id)
          return (
            <button key={item.id} onClick={() => toggle(item.id)}>
              <span className={`check-box${on ? ' on' : ''}`}>{on ? '✓' : ''}</span>
              <span>
                <span className={`check-label${on ? ' done' : ''}`}>{item.label}</span>
                {item.note && <div className="check-note">{item.note}</div>}
              </span>
            </button>
          )
        })}
      </div>
      <div style={{ padding: '14px 20px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
        チェックはこの端末にだけ保存されます。他の参加者には共有されません。
      </div>
    </AppFrame>
  )
}
