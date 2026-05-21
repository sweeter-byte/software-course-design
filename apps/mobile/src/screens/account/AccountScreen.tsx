import { useEffect, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'

import { api, extractErrorMessage } from '../../api'
import { DevSettingsSection } from '../../components/account/DevSettingsSection'
import { LabeledField } from '../../components/ui/LabeledField'
import { RoleScreen } from '../../components/layout/RoleScreen'
import { useMobileAuth } from '../../contexts/MobileAuthContext'
import { persistSession, secureSessionStorage } from '../../session'

type Props = {
  onChangeApiBaseUrl: (next: string) => void
}

export function AccountScreen({ onChangeApiBaseUrl }: Props) {
  const { session, apiBaseUrl, notify, clearSession, updateSessionUser } = useMobileAuth()

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

  useEffect(() => {
    setProfileDraft((current) => ({
      ...current,
      username: session.user.username,
      realName: session.user.realName,
    }))
    setPhoneDraft((current) => ({ ...current, oldPhone: session.user.phone }))
  }, [session.user.username, session.user.realName, session.user.phone])

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      api.updateProfile(apiBaseUrl, session.accessToken, {
        username: profileDraft.username,
        realName: profileDraft.realName,
        email: profileDraft.email || null,
        gender: profileDraft.gender || null,
        college: profileDraft.college || null,
        major: profileDraft.major || null,
        className: profileDraft.className || null,
      }),
    onSuccess: (payload) => {
      const nextUser = {
        ...session.user,
        username: String(payload.user.username),
        realName: String(payload.user.realName),
      }
      updateSessionUser(nextUser)
      void persistSession(secureSessionStorage, { ...session, user: nextUser })
      notify('资料已更新。', 'success')
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  const changePasswordMutation = useMutation({
    mutationFn: () => api.changePassword(apiBaseUrl, session.accessToken, passwordDraft),
    onSuccess: () => {
      setPasswordDraft({ oldPassword: '', newPassword: '', confirmPassword: '' })
      clearSession('密码已修改，请使用新密码重新登录。', 'success')
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
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
      notify(
        previewCode
          ? `${target === 'old' ? '旧手机号' : '新手机号'}验证码已回填。`
          : `${target === 'old' ? '旧手机号' : '新手机号'}验证码已发送。`,
      )
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  const changePhoneMutation = useMutation({
    mutationFn: () => api.changePhone(apiBaseUrl, session.accessToken, phoneDraft),
    onSuccess: () => {
      clearSession('手机号已修改，请使用新手机号重新登录。', 'success')
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  const cancelAccountMutation = useMutation({
    mutationFn: () => api.cancelAccount(apiBaseUrl, session.accessToken),
    onSuccess: () => clearSession('账号已注销，后续需重新注册。'),
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  function confirmCancelAccount() {
    Alert.alert(
      '注销账号',
      '确认注销当前账号吗？注销后当前会话会退出，后续需要重新注册或联系教务员处理。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认注销',
          style: 'destructive',
          onPress: () => cancelAccountMutation.mutate(),
        },
      ],
    )
  }

  return (
    <RoleScreen
      title="账号"
      subtitle="查看个人资料、修改手机号或密码、注销当前账号。"
    >
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>账号维护</Text>
        <LabeledField
          label="用户名"
          value={profileDraft.username}
          onChangeText={(value) => setProfileDraft((current) => ({ ...current, username: value }))}
        />
        <LabeledField
          label="真实姓名"
          value={profileDraft.realName}
          onChangeText={(value) => setProfileDraft((current) => ({ ...current, realName: value }))}
        />
        <LabeledField
          label="邮箱"
          value={profileDraft.email}
          onChangeText={(value) => setProfileDraft((current) => ({ ...current, email: value }))}
        />
        <LabeledField
          label="学院"
          value={profileDraft.college}
          onChangeText={(value) => setProfileDraft((current) => ({ ...current, college: value }))}
        />
        <LabeledField
          label="专业"
          value={profileDraft.major}
          onChangeText={(value) => setProfileDraft((current) => ({ ...current, major: value }))}
        />
        <LabeledField
          label="班级"
          value={profileDraft.className}
          onChangeText={(value) => setProfileDraft((current) => ({ ...current, className: value }))}
        />
        <Pressable style={styles.primaryButton} onPress={() => updateProfileMutation.mutate()}>
          <Text style={styles.primaryText}>保存资料</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>修改密码</Text>
        <LabeledField
          label="旧密码"
          value={passwordDraft.oldPassword}
          secureTextEntry
          onChangeText={(value) =>
            setPasswordDraft((current) => ({ ...current, oldPassword: value }))
          }
        />
        <LabeledField
          label="新密码"
          value={passwordDraft.newPassword}
          secureTextEntry
          onChangeText={(value) =>
            setPasswordDraft((current) => ({ ...current, newPassword: value }))
          }
        />
        <LabeledField
          label="确认新密码"
          value={passwordDraft.confirmPassword}
          secureTextEntry
          onChangeText={(value) =>
            setPasswordDraft((current) => ({ ...current, confirmPassword: value }))
          }
        />
        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={() => changePasswordMutation.mutate()}>
            <Text style={styles.secondaryText}>修改密码</Text>
          </Pressable>
          <Pressable style={styles.dangerButton} onPress={confirmCancelAccount}>
            <Text style={styles.dangerText}>注销账号</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>修改手机号</Text>
        <LabeledField
          label="旧手机号"
          value={phoneDraft.oldPhone}
          onChangeText={(value) => setPhoneDraft((current) => ({ ...current, oldPhone: value }))}
        />
        <LabeledField
          label="旧手机号验证码"
          value={phoneDraft.oldVerificationCode}
          onChangeText={(value) =>
            setPhoneDraft((current) => ({ ...current, oldVerificationCode: value }))
          }
        />
        <LabeledField
          label="新手机号"
          value={phoneDraft.newPhone}
          onChangeText={(value) => setPhoneDraft((current) => ({ ...current, newPhone: value }))}
        />
        <LabeledField
          label="新手机号验证码"
          value={phoneDraft.newVerificationCode}
          onChangeText={(value) =>
            setPhoneDraft((current) => ({ ...current, newVerificationCode: value }))
          }
        />
        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={() => phoneCodeMutation.mutate('old')}>
            <Text style={styles.secondaryText}>旧号验证码</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => phoneCodeMutation.mutate('new')}>
            <Text style={styles.secondaryText}>新号验证码</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => changePhoneMutation.mutate()}>
            <Text style={styles.primaryText}>修改手机号</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <DevSettingsSection apiBaseUrl={apiBaseUrl} onChangeApiBaseUrl={onChangeApiBaseUrl} />
      </View>
    </RoleScreen>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 14,
  },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '800' },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryButton: {
    minHeight: 44,
    minWidth: 118,
    borderRadius: 6,
    backgroundColor: '#005bac',
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#ffffff', fontWeight: '800' },
  secondaryButton: {
    minHeight: 44,
    minWidth: 108,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 91, 172, 0.42)',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: '#004080', fontWeight: '800' },
  dangerButton: {
    minHeight: 44,
    minWidth: 108,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.35)',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: { color: '#dc2626', fontWeight: '800' },
})
