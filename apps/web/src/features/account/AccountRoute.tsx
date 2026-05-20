import { Suspense, lazy, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { ApiError, api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import { confirmDestructive } from '../../utils/confirm'
import { friendlyErrorMessage } from '../../utils/errors'

const AccountSection = lazy(() =>
  import('./AccountSection').then((m) => ({ default: m.AccountSection })),
)

interface AccountRouteProps {
  onSessionInvalidated: () => void
  onUpdateUser: (next: { phone?: string; username?: string; realName?: string }) => void
}

function extractErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return friendlyErrorMessage(error.message, error.details)
  }
  if (error instanceof Error) {
    return friendlyErrorMessage(error.message)
  }
  return '请求失败'
}

export function AccountRoute({ onSessionInvalidated, onUpdateUser }: AccountRouteProps) {
  const { apiBaseUrl, session } = useAuth()

  const [profileDraft, setProfileDraft] = useState({
    username: session.user.username,
    realName: session.user.realName,
    email: '',
    gender: '',
    college: '',
    major: '',
    className: '',
  })
  const [passwordDraft, setPasswordDraft] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [phoneDraft, setPhoneDraft] = useState({
    oldPhone: session.user.phone,
    oldVerificationCode: '',
    newPhone: '',
    newVerificationCode: '',
  })
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      return api.updateProfile(apiBaseUrl, session.accessToken, {
        username: profileDraft.username,
        realName: profileDraft.realName,
        email: profileDraft.email || null,
        gender: profileDraft.gender || null,
        college: profileDraft.college || null,
        major: profileDraft.major || null,
        className: profileDraft.className || null,
      })
    },
    onSuccess: (payload) => {
      const user = payload.user as { username?: unknown; realName?: unknown }
      onUpdateUser({
        username: String(user.username),
        realName: String(user.realName),
      })
      setNotice('个人资料已更新。')
      setError(null)
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const changePasswordMutation = useMutation({
    mutationFn: async () => api.changePassword(apiBaseUrl, session.accessToken, passwordDraft),
    onSuccess: () => {
      setPasswordDraft({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setNotice('密码已修改，请妥善保管新密码。')
      setError(null)
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const cancelAccountMutation = useMutation({
    mutationFn: async () => api.cancelAccount(apiBaseUrl, session.accessToken),
    onSuccess: () => {
      onSessionInvalidated()
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const phoneCodeMutation = useMutation({
    mutationFn: async (target: 'old' | 'new') => {
      const phone = target === 'old' ? phoneDraft.oldPhone : phoneDraft.newPhone
      const payload = await api.requestVerificationCode(apiBaseUrl, phone, 'change_phone')
      return { target, previewCode: payload.previewCode }
    },
    onSuccess: ({ target, previewCode }) => {
      setPhoneDraft((current) =>
        target === 'old'
          ? { ...current, oldVerificationCode: previewCode ?? current.oldVerificationCode }
          : { ...current, newVerificationCode: previewCode ?? current.newVerificationCode },
      )
      setNotice(
        previewCode
          ? `${target === 'old' ? '旧手机号' : '新手机号'}验证码已回填。`
          : `${target === 'old' ? '旧手机号' : '新手机号'}验证码已发送。`,
      )
      setError(null)
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const changePhoneMutation = useMutation({
    mutationFn: async () => api.changePhone(apiBaseUrl, session.accessToken, phoneDraft),
    onSuccess: (payload) => {
      const user = payload.user as { phone?: unknown }
      const nextPhone = String(user.phone)
      onUpdateUser({ phone: nextPhone })
      setPhoneDraft({
        oldPhone: nextPhone,
        oldVerificationCode: '',
        newPhone: '',
        newVerificationCode: '',
      })
      setNotice('手机号已修改。')
      setError(null)
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  return (
    <section className="account-route section-card wide-card">
      <div className="section-head">
        <h3>账号维护</h3>
        <p>修改个人资料、密码或注销当前账号。</p>
      </div>
      {notice ? <p className="info-banner">{notice}</p> : null}
      {error ? <p className="error-banner">{error}</p> : null}
      <Suspense fallback={<StatePanel title="账号维护加载中" detail="正在准备账号模块。" />}>
        <AccountSection
          phone={session.user.phone}
          profile={profileDraft}
          password={passwordDraft}
          phoneChange={phoneDraft}
          isProfilePending={updateProfileMutation.isPending}
          isPasswordPending={changePasswordMutation.isPending}
          isCancelPending={cancelAccountMutation.isPending}
          isPhoneCodePending={phoneCodeMutation.isPending}
          isPhoneChangePending={changePhoneMutation.isPending}
          onProfileChange={setProfileDraft}
          onPasswordChange={setPasswordDraft}
          onPhoneChange={setPhoneDraft}
          onSubmitProfile={() => updateProfileMutation.mutate()}
          onSubmitPassword={() => changePasswordMutation.mutate()}
          onCancelAccount={() => {
            if (
              confirmDestructive('确认注销当前账号吗？注销后将立即退出登录，且无法恢复。')
            ) {
              cancelAccountMutation.mutate()
            }
          }}
          onRequestPhoneCode={(target) => phoneCodeMutation.mutate(target)}
          onSubmitPhoneChange={() => changePhoneMutation.mutate()}
        />
      </Suspense>
    </section>
  )
}
