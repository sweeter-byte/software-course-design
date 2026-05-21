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

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>

type Props = {
  apiBaseUrl: string
  notice: NoticeState | null
  notify: (message: string, type?: NoticeType) => void
  /**
   * When registration succeeds we prefill the login form with the chosen
   * phone/password so the user can submit immediately after navigating back.
   */
  onRegistered: (phone: string, password: string) => void
}

export function RegisterScreen({ apiBaseUrl, notice, notify, onRegistered }: Props) {
  const navigation = useNavigation<Nav>()
  const [form, setForm] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    username: '',
    realName: '',
    studentId: '',
    verificationCode: '',
  })

  const codeMutation = useMutation({
    mutationFn: () => api.requestVerificationCode(apiBaseUrl, form.phone),
    onSuccess: (payload) => {
      if (payload.previewCode) {
        setForm((current) => ({ ...current, verificationCode: payload.previewCode ?? '' }))
        notify(`验证码已回填：${payload.previewCode}`)
      } else {
        notify('验证码已发送，请注意查收。')
      }
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  const registerMutation = useMutation({
    mutationFn: () => api.registerStudent(apiBaseUrl, form),
    onSuccess: () => {
      notify('注册成功，请返回登录。', 'success')
      onRegistered(form.phone, form.password)
      navigation.navigate('Login')
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  return (
    <AuthScaffold
      title="学生注册"
      helper="学生完成手机号验证后即可使用移动端课程互动功能。"
      notice={notice}
    >
      <LabeledField
        label="手机号"
        value={form.phone}
        onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
      />
      <LabeledField
        label="学号"
        value={form.studentId}
        onChangeText={(value) => setForm((current) => ({ ...current, studentId: value }))}
      />
      <LabeledField
        label="用户名"
        value={form.username}
        onChangeText={(value) => setForm((current) => ({ ...current, username: value }))}
      />
      <LabeledField
        label="真实姓名"
        value={form.realName}
        onChangeText={(value) => setForm((current) => ({ ...current, realName: value }))}
      />
      <LabeledField
        label="密码"
        value={form.password}
        secureTextEntry
        onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
      />
      <LabeledField
        label="确认密码"
        value={form.confirmPassword}
        secureTextEntry
        onChangeText={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
      />
      <LabeledField
        label="验证码"
        value={form.verificationCode}
        onChangeText={(value) => setForm((current) => ({ ...current, verificationCode: value }))}
      />
      <View style={styles.buttonRow}>
        <Pressable style={styles.secondaryButton} onPress={() => codeMutation.mutate()}>
          <Text style={styles.secondaryText}>获取验证码</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={() => registerMutation.mutate()}>
          <Text style={styles.primaryText}>注册</Text>
        </Pressable>
      </View>
      <View style={styles.authEntryRow}>
        <Text style={styles.helper}>已有账号？</Text>
        <Pressable style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkButtonText}>返回账号登录</Text>
        </Pressable>
      </View>
    </AuthScaffold>
  )
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
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
  helper: { color: '#6b7280', lineHeight: 20 },
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
