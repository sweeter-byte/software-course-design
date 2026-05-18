type StatePanelProps = {
  title: string
  detail: string
}

export function StatePanel({ title, detail }: StatePanelProps) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <span className="state-eyebrow">状态提示</span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}
