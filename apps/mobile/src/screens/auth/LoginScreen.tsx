import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { api, extractErrorMessage, type SessionPayload } from '../../api'
import { LabeledField } from '../../components/ui/LabeledField'
import type { NoticeState, NoticeType } from '../../components/feedback/NoticeBanner'
import type { AuthStackParamList } from '../../navigation/AuthStack'
import { roleLabels } from '../../navigation/navigation-model'
import { AuthScaffold } from './AuthScaffold'

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>

type Props = {
  apiBaseUrl: string
  notice: NoticeState | null
  notify: (message: string, type?: NoticeType) => void
  dismissNotice?: () => void
  onAuthenticated: (payload: SessionPayload) => void
  /** When the parent has captured phone/password from register or reset flows. */
  prefill?: { phone: string; password: string } | null
}

export function LoginScreen({
  apiBaseUrl,
  notice,
  notify,
  dismissNotice,
  onAuthenticated,
  prefill,
}: Props) {
  const navigation = useNavigation<Nav>()
  const [form, setForm] = useState({
    phone: prefill?.phone ?? '',
    password: prefill?.password ?? '',
  })

  // Sync prefill changes (e.g. user just registered and returned to login).
  useEffect(() => {
    if (prefill) setForm({ phone: prefill.phone, password: prefill.password })
  }, [prefill?.phone, prefill?.password])

  const loginMutation = useMutation({
    mutationFn: () => api.login(apiBaseUrl, form.phone, form.password),
    onSuccess: (payload) => {
      onAuthenticated(payload)
      notify(`${roleLabels[payload.user.role]} ${payload.user.realName} 已登录移动端。`, 'success')
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  return (
    <AuthScaffold
      title="账号登录"
      helper="使用 Web 端同一账号体系，登录后按角色进入对应移动工作台。"
      notice={notice}
      onDismissNotice={dismissNotice}
    >
      <LabeledField
        label="手机号"
        value={form.phone}
        onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
      />
      <LabeledField
        label="密码"
        value={form.password}
        secureTextEntry
        onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
      />
      <Pressable style={styles.primaryButton} onPress={() => loginMutation.mutate()}>
        {loginMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>登录</Text>
        )}
      </Pressable>
      <Text style={styles.helper}>
        教师：13900139000 / Teacher123!，教务员：13700137000 / Officer123!
      </Text>
      <View style={styles.authEntryRow}>
        <Pressable style={styles.linkButton} onPress={() => navigation.navigate('ResetPassword')}>
          <Text style={styles.linkButtonText}>忘记密码？</Text>
        </Pressable>
        <Text style={styles.helper}>还没有学生账号？</Text>
        <Pressable style={styles.linkButton} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkButtonText}>学生注册</Text>
        </Pressable>
      </View>
    </AuthScaffold>
  )
}

const styles = StyleSheet.create({
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
  linkButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  linkButtonText: {
    color: '#005bac',
    fontWeight: '800',
  },
})
