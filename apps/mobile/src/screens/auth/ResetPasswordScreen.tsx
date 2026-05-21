import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { api, extractErrorMessage } from '../../api'
import { LabeledField } from '../../components/ui/LabeledField'
import type { NoticeState, NoticeType } from '../../components/feedback/NoticeBanner'
import type { AuthStackParamList } from '../../navigation/AuthStack'
import { AuthScaffold } from './AuthScaffold'

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>

type Props = {
  apiBaseUrl: string
  notice: NoticeState | null
  notify: (message: string, type?: NoticeType) => void
  onReset: (phone: string, newPassword: string) => void
}

export function ResetPasswordScreen({ apiBaseUrl, notice, notify, onReset }: Props) {
  const navigation = useNavigation<Nav>()
  const [form, setForm] = useState({
    phone: '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: '',
  })

  const codeMutation = useMutation({
    mutationFn: () => api.requestVerificationCode(apiBaseUrl, form.phone, 'reset_password'),
    onSuccess: (payload) => {
      setForm((current) => ({
        ...current,
        verificationCode: payload.previewCode ?? current.verificationCode,
      }))
      notify(
        payload.previewCode ? `重置验证码已回填：${payload.previewCode}` : '重置验证码已发送。',
      )
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  const resetMutation = useMutation({
    mutationFn: () => api.resetPassword(apiBaseUrl, form),
    onSuccess: () => {
      onReset(form.phone, form.newPassword)
      setForm({ phone: '', verificationCode: '', newPassword: '', confirmPassword: '' })
      notify('密码已重置，可直接登录。', 'success')
      navigation.navigate('Login')
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  return (
    <AuthScaffold
      title="找回密码"
      helper="通过手机号验证码重置密码，完成后返回登录页。"
      notice={notice}
    >
      <LabeledField
        label="手机号"
        value={form.phone}
        onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
      />
      <LabeledField
        label="验证码"
        value={form.verificationCode}
        onChangeText={(value) => setForm((current) => ({ ...current, verificationCode: value }))}
      />
      <LabeledField
        label="新密码"
        value={form.newPassword}
        secureTextEntry
        onChangeText={(value) => setForm((current) => ({ ...current, newPassword: value }))}
      />
      <LabeledField
        label="确认新密码"
        value={form.confirmPassword}
        secureTextEntry
        onChangeText={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
      />
      <View style={styles.buttonRow}>
        <Pressable style={styles.secondaryButton} onPress={() => codeMutation.mutate()}>
          <Text style={styles.secondaryText}>获取重置验证码</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={() => resetMutation.mutate()}>
          <Text style={styles.primaryText}>重置密码</Text>
        </Pressable>
      </View>
      <View style={styles.authEntryRow}>
        <Pressable style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkButtonText}>返回账号登录</Text>
        </Pressable>
      </View>
    </AuthScaffold>
  )
}

const styles = StyleSheet.create({
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
  authEntryRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#d9e2ef',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  linkButton: { paddingVertical: 4, paddingHorizontal: 2 },
  linkButtonText: { color: '#005bac', fontWeight: '800' },
})
