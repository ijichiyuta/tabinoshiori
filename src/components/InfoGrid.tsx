import type { ReactNode } from 'react'

export function InfoGrid({
  rows,
  roomy,
  hairline = true,
}: {
  rows: [string, ReactNode][]
  roomy?: boolean
  hairline?: boolean
}) {
  return (
    <div className={`igrid${roomy ? ' roomy' : ''}${hairline ? ' hairline-block' : ''}`}>
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: 'contents' }}>
          <span className="k">{k}</span>
          <span className="tnum">{v}</span>
        </div>
      ))}
    </div>
  )
}
