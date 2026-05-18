import type { ReactNode } from 'react'

import { LoginForm, type LoginFormState } from './LoginForm'
import {
  ResetPasswordForm,
  type ResetPasswordFormState,
} from './ResetPasswordForm'
import {
  StudentRegisterForm,
  type StudentRegisterFormState,
} from './StudentRegisterForm'

export type AuthMode = 'login' | 'register' | 'reset'

type LoginShellProps = {
  authMode: AuthMode
  notice: string
  supportNotes: string[]
  guideNotes: string[]
  loginForm: LoginFormState
  registerForm: StudentRegisterFormState
  resetForm: ResetPasswordFormState
  isLoginPending: boolean
  isRegisterPending: boolean
  isResetPending: boolean
  isRegisterCodePending: boolean
  isResetCodePending: boolean
  onAuthModeChange: (mode: AuthMode) => void
  onLoginChange: (next: LoginFormState) => void
  onRegisterChange: (next: StudentRegisterFormState) => void
  onResetChange: (next: ResetPasswordFormState) => void
  onSubmitLogin: () => void
  onSubmitRegister: () => void
  onSubmitReset: () => void
  onRequestRegisterCode: () => void
  onRequestResetCode: () => void
}

function panelTitle(authMode: AuthMode): string {
  if (authMode === 'login') return '账号登录'
  if (authMode === 'register') return '学生注册'
  return '找回密码'
}

function panelSubtitle(authMode: AuthMode): string {
  if (authMode === 'login') return '输入手机号和密码后进入课程工作台。'
  if (authMode === 'register') return '完成注册后即可使用学生身份查看课程与提交作业。'
  return '通过手机号验证码重置密码后返回登录。'
}

function renderAuthFlow(props: LoginShellProps): ReactNode {
  if (props.authMode === 'login') {
    return (
      <LoginForm
        values={props.loginForm}
        isPending={props.isLoginPending}
        onChange={props.onLoginChange}
        onSubmit={props.onSubmitLogin}
        onForgotPassword={() => props.onAuthModeChange('reset')}
        onRegister={() => props.onAuthModeChange('register')}
      />
    )
  }

  if (props.authMode === 'reset') {
    return (
      <ResetPasswordForm
        values={props.resetForm}
        isRequestingCode={props.isResetCodePending}
        isSubmitting={props.isResetPending}
        onChange={props.onResetChange}
        onRequestCode={props.onRequestResetCode}
        onSubmit={props.onSubmitReset}
        onBackToLogin={() => props.onAuthModeChange('login')}
      />
    )
  }

  return (
    <StudentRegisterForm
      values={props.registerForm}
      isRequestingCode={props.isRegisterCodePending}
      isSubmitting={props.isRegisterPending}
      onChange={props.onRegisterChange}
      onRequestCode={props.onRequestRegisterCode}
      onSubmit={props.onSubmitRegister}
      onBackToLogin={() => props.onAuthModeChange('login')}
    />
  )
}

export function LoginShell(props: LoginShellProps) {
  return (
    <div className="login-shell">
      <header className="login-header">
        <div className="login-header-inner">
          <div className="login-header-brand">
            <div className="login-mark">课</div>
            <div className="login-header-copy">
              <p className="login-kicker">统一身份认证</p>
              <h1>课程互动管理系统</h1>
            </div>
          </div>
          <p className="login-header-meta">桌面端认证入口</p>
        </div>
      </header>

      <main className="login-stage">
        <section className="login-card">
          <div className="login-layout">
            <aside className="login-aside">
              <div className="login-aside-head">
                <span className="login-aside-label">账号服务</span>
                <strong>统一身份认证</strong>
                <p>教师、教务员和学生通过同一入口完成认证，登录后进入课程工作区。</p>
              </div>

              <div className="login-support">
                {props.supportNotes.map((note) => (
                  <span key={note}>{note}</span>
                ))}
              </div>

              <ul className="login-guide-list">
                {props.guideNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </aside>

            <div className="login-form-column">
              <div className="notice-bar login-notice">{props.notice}</div>

              <div className="login-panel">
                <div className="login-panel-head">
                  <div>
                    <p className="eyebrow">身份认证</p>
                    <h2>{panelTitle(props.authMode)}</h2>
                    <p>{panelSubtitle(props.authMode)}</p>
                  </div>
                </div>

                {renderAuthFlow(props)}
              </div>
            </div>
          </div>
        </section>
        <p className="login-footer">如需账号支持，请联系课程管理支持人员。</p>
      </main>
    </div>
  )
}
