import { useState } from 'react'
import { EditorFrame } from '../components/Editor'
import { newMemberToken, saveDoc } from '../lib/docs'
import type { Shiori } from '../lib/types'

/**
 * 招待リンク(個別URL)一覧。
 * 予約確認メールに貼れば、お客様は名簿を経由せずに自分のしおりが開く(なりすまし・名簿露出の防止)。
 */
export function ManageLinks({ shiori: initial }: { shiori: Shiori }) {
  const [shiori, setShiori] = useState(initial)
  const [copiedId, setCopiedId] = useState('')
  const origin = window.location.origin
  const urlFor = (token: string) => `${origin}/s/${shiori.slug}?t=${token}`
  const missing = shiori.members.filter((m) => !m.token).length

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(''), 1500)
    } catch {
      window.prompt('コピーしてください', text)
    }
  }

  const copyAll = () => {
    const lines = shiori.members
      .filter((m) => m.token)
      .map((m) => `${m.name}\t${urlFor(m.token as string)}`)
      .join('\n')
    copy(lines, 'all')
  }

  const generateMissing = () => {
    const next = {
      ...shiori,
      members: shiori.members.map((m) => (m.token ? m : { ...m, token: newMemberToken() })),
    }
    try {
      saveDoc(next)
      setShiori(next)
    } catch {
      window.alert('保存できませんでした')
    }
  }

  return (
    <EditorFrame title="招待リンク(個別URL)" backTo={`/manage/${shiori.slug}`} shiori={shiori}>
      <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--sub)', lineHeight: 1.75 }}>
        お客様ごとの専用URLです。予約確認メールやSMSに貼ると、
        開いた瞬間に本人のしおりが表示されます(名簿は表示されず、なりすましも防げます)。
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button className="icon-btn" onClick={copyAll}>
          {copiedId === 'all' ? 'コピーしました ✓' : '全員ぶんをコピー(名前+URL)'}
        </button>
        {missing > 0 && (
          <button className="icon-btn" onClick={generateMissing}>
            未発行の{missing}名にリンクを発行
          </button>
        )}
      </div>
      <div className="hairline-block">
        {shiori.members.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              columnGap: 10,
              alignItems: 'center',
              padding: '10px 2px',
              borderBottom: '1px solid var(--line-lt)',
            }}
          >
            <span>
              <span style={{ fontSize: 15.5 }}>{m.name}</span>
              {m.token ? (
                <div
                  className="mono"
                  style={{ fontSize: 11, color: 'var(--muted)', wordBreak: 'break-all' }}
                >
                  {urlFor(m.token)}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--warn)' }}>リンク未発行</div>
              )}
            </span>
            {m.token && (
              <button className="icon-btn" onClick={() => copy(urlFor(m.token as string), m.id)}>
                {copiedId === m.id ? '✓' : 'コピー'}
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7, marginTop: 12 }}>
        リンクを知っている人はこのしおりを開けます。誤送信にはご注意ください。
        (本番ではサーバー側でリンクの無効化・再発行ができるようになります)
      </div>
    </EditorFrame>
  )
}
