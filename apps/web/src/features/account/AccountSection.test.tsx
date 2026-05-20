import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AccountSection } from './AccountSection'

const baseProfile = {
  username: 'student_demo',
  realName: '演示学生',
  email: 'student@example.com',
  gender: '女',
  college: '计算机科学与技术学院',
  major: '软件工程',
  className: '1623001',
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
  const onPasswordChange = vi.fn()
  const onProfileChange = vi.fn()
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
      isPasswordPending={false}
      isProfilePending={false}
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
  it('shows editable profile fields alongside password and phone forms', () => {
    renderSection()
    expect(screen.getByRole('heading', { name: '个人资料', level: 4 })).toBeInTheDocument()
    expect(screen.getByLabelText('邮箱')).toHaveValue('student@example.com')
    expect(screen.getByLabelText('性别')).toHaveValue('女')
    expect(screen.getByLabelText('学院')).toHaveValue('计算机科学与技术学院')
    expect(screen.getByLabelText('专业')).toHaveValue('软件工程')
    expect(screen.getByLabelText('班级')).toHaveValue('1623001')
    expect(screen.getByRole('button', { name: '保存资料' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '修改密码' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '注销账号' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '修改手机号' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '获取旧号验证码' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '获取新号验证码' })).toBeInTheDocument()
  })

  it('emits profile changes and submits profile updates', async () => {
    const user = userEvent.setup()
    const { onProfileChange, onSubmitProfile } = renderSection()

    fireEvent.change(screen.getByLabelText('学院'), { target: { value: '信息学院' } })
    expect(onProfileChange).toHaveBeenLastCalledWith({
      ...baseProfile,
      college: '信息学院',
    })

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
