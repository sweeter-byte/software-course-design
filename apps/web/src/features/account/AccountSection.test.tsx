import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AccountSection } from './AccountSection'

const baseProfile = {
  username: 'student_demo',
  realName: '演示学生',
  email: '',
  gender: '',
  college: '',
  major: '',
  className: '',
}

const basePassword = {
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const basePhoneChange = {
  oldPhone: '13900139000',
  oldVerificationCode: '',
  newPhone: '',
  newVerificationCode: '',
}

function renderSection(overrides: Partial<Parameters<typeof AccountSection>[0]> = {}) {
  const onProfileChange = vi.fn()
  const onPasswordChange = vi.fn()
  const onPhoneChange = vi.fn()
  const onSubmitProfile = vi.fn()
  const onSubmitPassword = vi.fn()
  const onCancelAccount = vi.fn()
  const onRequestPhoneCode = vi.fn()
  const onSubmitPhoneChange = vi.fn()

  render(
    <AccountSection
      phone="13900139000"
      profile={baseProfile}
      password={basePassword}
      phoneChange={basePhoneChange}
      isProfilePending={false}
      isPasswordPending={false}
      isCancelPending={false}
      isPhoneCodePending={false}
      isPhoneChangePending={false}
      onProfileChange={onProfileChange}
      onPasswordChange={onPasswordChange}
      onPhoneChange={onPhoneChange}
      onSubmitProfile={onSubmitProfile}
      onSubmitPassword={onSubmitPassword}
      onCancelAccount={onCancelAccount}
      onRequestPhoneCode={onRequestPhoneCode}
      onSubmitPhoneChange={onSubmitPhoneChange}
      {...overrides}
    />,
  )

  return {
    onProfileChange,
    onPasswordChange,
    onPhoneChange,
    onSubmitProfile,
    onSubmitPassword,
    onCancelAccount,
    onRequestPhoneCode,
    onSubmitPhoneChange,
  }
}

describe('AccountSection', () => {
  it('renders profile, password, and phone change forms together', () => {
    renderSection()
    expect(screen.getByRole('button', { name: '保存资料' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '修改密码' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '注销账号' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '修改手机号' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '获取旧号验证码' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '获取新号验证码' })).toBeInTheDocument()
  })

  it('submits the profile form when 保存资料 is clicked', async () => {
    const user = userEvent.setup()
    const { onSubmitProfile } = renderSection()
    await user.click(screen.getByRole('button', { name: '保存资料' }))
    expect(onSubmitProfile).toHaveBeenCalledTimes(1)
  })

  it('emits onCancelAccount when 注销账号 is clicked', async () => {
    const user = userEvent.setup()
    const { onCancelAccount } = renderSection()
    await user.click(screen.getByRole('button', { name: '注销账号' }))
    expect(onCancelAccount).toHaveBeenCalledTimes(1)
  })

  it('requests the old phone verification code', async () => {
    const user = userEvent.setup()
    const { onRequestPhoneCode } = renderSection()
    await user.click(screen.getByRole('button', { name: '获取旧号验证码' }))
    expect(onRequestPhoneCode).toHaveBeenCalledWith('old')
  })

  it('requests the new phone verification code', async () => {
    const user = userEvent.setup()
    const { onRequestPhoneCode } = renderSection()
    await user.click(screen.getByRole('button', { name: '获取新号验证码' }))
    expect(onRequestPhoneCode).toHaveBeenCalledWith('new')
  })
})
