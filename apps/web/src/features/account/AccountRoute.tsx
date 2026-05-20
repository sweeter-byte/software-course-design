import { Suspense, lazy, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, type SessionPayload } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import { confirmDestructive } from '../../utils/confirm'
import { extractErrorMessage } from '../../utils/errors'

const AccountSection = lazy(() =>
  import('./AccountSection').then((m) => ({ default: m.AccountSection })),
)

interface AccountRouteProps {
  onSessionInvalidated: () => void
  onPhoneChanged: () => void
  onPasswordChanged: () => void
  onUpdateUser: (next: { phone?: string; username?: string; realName?: string }) => void
}

type ProfileDraft = {
  username: string
  realName: string
  email: string
  gender: string
  college: string
  major: string
  className: string
}

function textValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function nullableText(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function profileDraftFromUser(
  user: Record<string, unknown> | undefined,
  fallback: SessionPayload['user'],
): ProfileDraft {
  return {
    username: textValue(user?.username) || fallback.username,
    realName: textValue(user?.realName) || fallback.realName,
    email: textValue(user?.email),
    gender: textValue(user?.gender),
    college: textValue(user?.college),
    major: textValue(user?.major),
    className: textValue(user?.className),
  }
}

function profileSyncKeyFromUser(user: Record<string, unknown> | undefined) {
  return user ? String(user.updatedAt ?? user.id ?? user.username ?? '') : null
}

export function AccountRoute({
  onSessionInvalidated,
  onPhoneChanged,
  onPasswordChanged,
  onUpdateUser,
}: AccountRouteProps) {
  const { apiBaseUrl, session } = useAuth()
  const queryClient = useQueryClient()

  const currentUserQuery = useQuery({
    queryKey: ['currentUser', apiBaseUrl, session.accessToken],
    queryFn: async () => api.getCurrentUser(apiBaseUrl, session.accessToken),
  })
  const [profileDraft, setProfileDraft] = useState(() =>
    profileDraftFromUser(undefined, session.user),
  )
  const [profileSyncKey, setProfileSyncKey] = useState<string | null>(null)
  const [profileDirty, setProfileDirty] = useState(false)
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

  const currentUser = currentUserQuery.data?.user
  const nextProfileSyncKey = profileSyncKeyFromUser(currentUser)
  if (nextProfileSyncKey !== profileSyncKey) {
    setProfileSyncKey(nextProfileSyncKey)
    if (currentUser && !profileDirty) {
      setProfileDraft(profileDraftFromUser(currentUser, session.user))
    }
  }
  const queryError = currentUserQuery.isError
    ? extractErrorMessage(currentUserQuery.error)
    : null

  const updateProfileMutation = useMutation({
    mutationFn: async () =>
      api.updateProfile(apiBaseUrl, session.accessToken, {
        username: profileDraft.username,
        realName: profileDraft.realName,
        email: nullableText(profileDraft.email),
        gender: nullableText(profileDraft.gender),
        college: nullableText(profileDraft.college),
        major: nullableText(profileDraft.major),
        className: nullableText(profileDraft.className),
      }),
    onSuccess: (payload) => {
      const user = payload.user
      const nextProfile = profileDraftFromUser(user, session.user)
      setProfileDraft(nextProfile)
      setProfileDirty(false)
      setProfileSyncKey(profileSyncKeyFromUser(user))
      onUpdateUser({
        username: nextProfile.username,
        realName: nextProfile.realName,
      })
      queryClient.setQueryData(['currentUser', apiBaseUrl, session.accessToken], payload)
      queryClient.invalidateQueries({ queryKey: ['currentUser', apiBaseUrl, session.accessToken] })
      setNotice('个人资料已保存。')
      setError(null)
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const changePasswordMutation = useMutation({
    mutationFn: async () => api.changePassword(apiBaseUrl, session.accessToken, passwordDraft),
    onSuccess: () => {
      setPasswordDraft({ oldPassword: '', newPassword: '', confirmPassword: '' })
      onPasswordChanged()
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
    onSuccess: () => {
      onPhoneChanged()
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  return (
    <section className="account-route section-card wide-card">
      <div className="section-head">
        <h3>账号维护</h3>
        <p>查看个人资料、修改手机号或密码、注销当前账号。</p>
      </div>
      {notice ? <p className="info-banner">{notice}</p> : null}
      {error || queryError ? <p className="error-banner">{error ?? queryError}</p> : null}
      <Suspense fallback={<StatePanel title="账号维护加载中" detail="正在准备账号模块。" />}>
        <AccountSection
          phone={session.user.phone}
          profile={profileDraft}
          password={passwordDraft}
          phoneChange={phoneDraft}
          isProfilePending={updateProfileMutation.isPending || currentUserQuery.isFetching}
          isPasswordPending={changePasswordMutation.isPending}
          isCancelPending={cancelAccountMutation.isPending}
          isPhoneCodePending={phoneCodeMutation.isPending}
          isPhoneChangePending={changePhoneMutation.isPending}
          onProfileChange={(nextProfile) => {
            setProfileDirty(true)
            setProfileDraft(nextProfile)
          }}
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
