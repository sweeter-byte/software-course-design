import { Component, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

export class RootErrorBoundary extends Component<Props, State> {
  override state: State = {
    error: null,
  }

  static getDerivedStateFromError(error: Error) {
    return {
      error,
    }
  }

  override componentDidCatch(error: Error) {
    console.error('root_render_failed', error)
  }

  resetApp() {
    window.localStorage.removeItem('cms_session')
    window.location.reload()
  }

  override render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background: 'linear-gradient(180deg, #f5f3ec 0%, #f6f8fb 100%)',
          color: '#10203a',
        }}
      >
        <section
          style={{
            width: 'min(680px, 100%)',
            padding: '28px',
            borderRadius: '24px',
            background: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.16)',
          }}
        >
          <p style={{ margin: '0 0 8px', letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '12px' }}>
            页面提示
          </p>
          <h1 style={{ margin: '0 0 12px', fontSize: '28px' }}>页面启动失败</h1>
          <p style={{ margin: '0 0 12px', lineHeight: 1.7 }}>
            页面暂时无法正常显示。你可以先清理本地登录状态并刷新页面。
          </p>
          <pre
            style={{
              margin: '0 0 18px',
              padding: '14px',
              borderRadius: '16px',
              overflowX: 'auto',
              background: '#f8fafc',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => this.resetApp()}
            style={{
              border: 'none',
              borderRadius: '999px',
              padding: '12px 18px',
              font: 'inherit',
              cursor: 'pointer',
              color: '#fff',
              background: 'linear-gradient(135deg, #1d4ed8, #0f766e)',
            }}
          >
            清理登录状态并刷新
          </button>
        </section>
      </main>
    )
  }
}
