import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LoginShell } from './LoginShell'

const emptyLoginForm = { phone: '', password: '' }
const emptyRegisterForm = {
  phone: '',
  password: '',
  confirmPassword: '',
  username: '',
  realName: '',
  studentId: '',
  email: '',
  gender: '',
  college: '',
  major: '',
  className: '',
  verificationCode: '',
}
const emptyResetForm = {
  phone: '',
  verificationCode: '',
  newPassword: '',
  confirmPassword: '',
}

function renderShell(overrides: Partial<Parameters<typeof LoginShell>[0]> = {}) {
  const onAuthModeChange = vi.fn()
  const onSubmitLogin = vi.fn()
  const onSubmitRegister = vi.fn()
  const onSubmitReset = vi.fn()
  const onRequestRegisterCode = vi.fn()
  const onRequestResetCode = vi.fn()
  const onLoginChange = vi.fn()
  const onRegisterChange = vi.fn()
  const onResetChange = vi.fn()
  const onDismissNotification = vi.fn()

  render(
    <LoginShell
      authMode="login"
      notifications={[{ id: 1, type: 'info', content: '欢迎使用。' }]}
      onDismissNotification={onDismissNotification}
      supportNotes={['教师与教务员使用已分配账号登录。']}
      guideNotes={['统一入口仅用于身份认证，登录后进入课程工作台。']}
      loginForm={emptyLoginForm}
      registerForm={emptyRegisterForm}
      resetForm={emptyResetForm}
      isLoginPending={false}
      isRegisterPending={false}
      isResetPending={false}
      isRegisterCodePending={false}
      isResetCodePending={false}
      onAuthModeChange={onAuthModeChange}
      onLoginChange={onLoginChange}
      onRegisterChange={onRegisterChange}
      onResetChange={onResetChange}
      onSubmitLogin={onSubmitLogin}
      onSubmitRegister={onSubmitRegister}
      onSubmitReset={onSubmitReset}
      onRequestRegisterCode={onRequestRegisterCode}
      onRequestResetCode={onRequestResetCode}
      {...overrides}
    />,
  )

  return {
    onAuthModeChange,
    onSubmitLogin,
    onSubmitRegister,
    onSubmitReset,
    onRequestRegisterCode,
    onRequestResetCode,
    onLoginChange,
    onRegisterChange,
    onResetChange,
    onDismissNotification,
  }
}

describe('LoginShell', () => {
  it('renders the login panel by default and shows entry shortcuts', () => {
    renderShell()
    expect(screen.getByRole('heading', { name: '账号登录' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '进入工作台' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '忘记密码？' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '学生注册' })).toBeInTheDocument()
  })

  it('switches to reset mode when "忘记密码？" is clicked', async () => {
    const user = userEvent.setup()
    const { onAuthModeChange } = renderShell()
    await user.click(screen.getByRole('button', { name: '忘记密码？' }))
    expect(onAuthModeChange).toHaveBeenCalledWith('reset')
  })

  it('switches to register mode when "学生注册" is clicked', async () => {
    const user = userEvent.setup()
    const { onAuthModeChange } = renderShell()
    await user.click(screen.getByRole('button', { name: '学生注册' }))
    expect(onAuthModeChange).toHaveBeenCalledWith('register')
  })

  it('submits the login mutation when the form is submitted', async () => {
    const user = userEvent.setup()
    const { onSubmitLogin } = renderShell({
      loginForm: { phone: '13900139000', password: 'Teacher123!' },
    })

    await user.click(screen.getByRole('button', { name: '进入工作台' }))
    expect(onSubmitLogin).toHaveBeenCalledTimes(1)
  })

  it('renders the reset form copy when authMode is reset', () => {
    renderShell({ authMode: 'reset' })
    expect(screen.getByRole('heading', { name: '找回密码' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '获取重置验证码' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重置密码' })).toBeInTheDocument()
  })

  it('renders the register form copy when authMode is register', () => {
    renderShell({ authMode: 'register' })
    expect(screen.getByRole('heading', { name: '学生注册' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '获取验证码' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '完成注册' })).toBeInTheDocument()
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument()
    expect(screen.getByLabelText('性别')).toBeInTheDocument()
    expect(screen.getByLabelText('学院')).toBeInTheDocument()
    expect(screen.getByLabelText('专业')).toBeInTheDocument()
    expect(screen.getByLabelText('班级')).toBeInTheDocument()
  })
})
