interface RoutePlaceholderProps {
  route: string
  title?: string
  note?: string
}

export function RoutePlaceholder({ route, title, note }: RoutePlaceholderProps) {
  return (
    <section className="section-card route-placeholder" data-route={route}>
      <div className="section-head">
        <h3>{title ?? '页面建设中'}</h3>
        <p>{note ?? '该页面按新版页面结构规划，正在分步实现。'}</p>
      </div>
      <p className="muted-paragraph">
        路由：<code>{route}</code>
      </p>
    </section>
  )
}
