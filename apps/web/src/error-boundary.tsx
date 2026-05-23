import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
  componentStack: string | null
}

export class RootErrorBoundary extends Component<Props, State> {
  override state: State = {
    error: null,
    componentStack: null,
  }

  static getDerivedStateFromError(error: Error) {
    return {
      error,
    }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? null })
    console.error('root_render_failed', error)
    if (info.componentStack) console.error(info.componentStack)
  }

  resetApp() {
    window.localStorage.removeItem('cms_session')
    window.sessionStorage.removeItem('cms_session')
    window.location.reload()
  }

  resumeFromError = () => {
    this.setState({ error: null, componentStack: null })
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
            页面暂时无法正常显示。下方是具体错误信息，可截图反馈给开发人员；点击"重试当前页面"通常即可恢复。
          </p>
          <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            错误消息
          </p>
          <pre
            style={{
              margin: '0 0 12px',
              padding: '14px',
              borderRadius: '12px',
              overflowX: 'auto',
              background: '#fef2f2',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              color: '#7f1d1d',
              whiteSpace: 'pre-wrap',
              fontSize: '13px',
            }}
          >
            {this.state.error.message}
          </pre>
          {this.state.componentStack ? (
            <details style={{ margin: '0 0 12px' }}>
              <summary style={{ cursor: 'pointer', color: '#1d4ed8' }}>组件路径</summary>
              <pre
                style={{
                  margin: '8px 0 0',
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  overflowX: 'auto',
                  fontSize: '11px',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {this.state.componentStack.trim()}
              </pre>
            </details>
          ) : null}
          {this.state.error.stack ? (
            <details style={{ margin: '0 0 18px' }}>
              <summary style={{ cursor: 'pointer', color: '#1d4ed8' }}>JS 调用栈</summary>
              <pre
                style={{
                  margin: '8px 0 0',
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  overflowX: 'auto',
                  fontSize: '11px',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {this.state.error.stack.trim()}
              </pre>
            </details>
          ) : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button
              type="button"
              onClick={this.resumeFromError}
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
              重试当前页面
            </button>
            <button
              type="button"
              onClick={() => this.resetApp()}
              style={{
                border: '1px solid rgba(15, 23, 42, 0.16)',
                borderRadius: '999px',
                padding: '12px 18px',
                font: 'inherit',
                cursor: 'pointer',
                color: '#1f2937',
                background: '#ffffff',
              }}
            >
              清理登录状态并刷新
            </button>
          </div>
        </section>
      </main>
    )
  }
}
