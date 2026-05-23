import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

type Props = {
  children: ReactNode
  /**
   * Optional label to identify which boundary fired (e.g. "screen:account").
   * Shown on the fallback so we can tell at a glance which subtree blew up.
   */
  label?: string
}

type State = {
  error: Error | null
  info: ErrorInfo | null
}

/**
 * Crash trap for the mobile bundle. Without this, a render-time JS error
 * (e.g. the "Cannot convert undefined value to object" / "undefined is not
 * a function" we saw in the acceptance build) hard-crashes the whole RN
 * runtime and the user sees the phone bounce back to the home screen with
 * no message at all. With it, we show the actual error text + component
 * stack on screen so the user can read it / screenshot it, and a button
 * to retry — much faster diagnostic loop than `adb logcat`.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info })
    // Still log to logcat for the dev tooling path.
    console.warn('[ErrorBoundary]', this.props.label ?? '', error?.message)
    console.warn(info?.componentStack ?? '')
  }

  reset = () => {
    this.setState({ error: null, info: null })
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    const message = this.state.error.message || String(this.state.error)
    const stack = this.state.error.stack ?? ''
    const componentStack = this.state.info?.componentStack ?? ''

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>页面渲染出错</Text>
          {this.props.label ? (
            <Text style={styles.meta}>boundary: {this.props.label}</Text>
          ) : null}
          <Text style={styles.message}>{message}</Text>

          <Text style={styles.sectionLabel}>组件路径</Text>
          <Text style={styles.code}>{componentStack.trim() || '(无)'}</Text>

          <Text style={styles.sectionLabel}>JS 调用栈</Text>
          <Text style={styles.code}>{stack.trim() || '(无)'}</Text>

          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>重试当前页面</Text>
          </Pressable>
          <Text style={styles.helper}>
            如果重试仍然出错，请截图上面的错误信息发给开发人员。
          </Text>
        </View>
      </ScrollView>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f4f7fb',
    padding: 16,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f4b8b8',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 10,
  },
  title: { color: '#b91c1c', fontWeight: '800', fontSize: 18 },
  meta: { color: '#6b7280', fontSize: 12 },
  message: { color: '#111827', fontWeight: '700', lineHeight: 22 },
  sectionLabel: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 8,
  },
  code: {
    color: '#111827',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
    backgroundColor: '#f6f8fb',
    padding: 10,
    borderRadius: 4,
  },
  button: {
    minHeight: 44,
    borderRadius: 6,
    backgroundColor: '#005bac',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: { color: '#ffffff', fontWeight: '800' },
  helper: { color: '#6b7280', lineHeight: 20, fontSize: 12 },
})
