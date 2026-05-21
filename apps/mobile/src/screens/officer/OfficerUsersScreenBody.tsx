import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../../api'
import { SegmentedTabs } from '../../components/ui/SegmentedTabs'
import { useMobileAuth } from '../../contexts/MobileAuthContext'
import type { AdminUserItem, UserRole } from '../../domain'
import {
  ADMIN_ROLE_LABELS,
  ADMIN_STATUS_LABELS,
  ADMIN_STATUS_OPTIONS,
  ADMIN_TABS,
  evaluateUserToggle,
  filterAdminUsers,
} from './officer-admin-model'

export function OfficerUsersScreenBody() {
  const { session, apiBaseUrl, notify } = useMobileAuth()
  const queryClient = useQueryClient()

  const [activeRole, setActiveRole] = useState<UserRole>('student')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  const activeTab = ADMIN_TABS.find((tab) => tab.role === activeRole) ?? ADMIN_TABS[0]

  const usersQuery = useQuery<AdminUserItem[]>({
    queryKey: ['mobile-admin-users', apiBaseUrl, session.accessToken, activeRole],
    queryFn: async () => {
      const payload = await api.listAdminUsers(apiBaseUrl, session.accessToken, activeRole)
      return payload.users
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async (variables: { user: AdminUserItem; disabled: boolean }) => {
      setPendingUserId(variables.user.id)
      return api.setUserDisabled(
        apiBaseUrl,
        session.accessToken,
        variables.user.id,
        variables.disabled,
      )
    },
    onSuccess: (_data, variables) => {
      notify(
        variables.disabled
          ? `${variables.user.realName} 账号已禁用。`
          : `${variables.user.realName} 账号已恢复。`,
        'success',
      )
      queryClient.invalidateQueries({ queryKey: ['mobile-admin-users'] })
    },
    onError: (error) => notify(error instanceof Error ? error.message : '账号状态更新失败', 'error'),
    onSettled: () => setPendingUserId(null),
  })

  const filtered = useMemo(
    () => filterAdminUsers(usersQuery.data ?? [], { keyword, status: statusFilter }),
    [usersQuery.data, keyword, statusFilter],
  )

  function confirmToggle(user: AdminUserItem) {
    const decision = evaluateUserToggle(user, session.user.id)
    if (!decision.canAct) return
    Alert.alert(
      decision.nextDisabled ? '禁用账号' : '恢复账号',
      decision.confirmMessage,
      [
        { text: '取消', style: 'cancel' },
        {
          text: decision.actionLabel,
          style: decision.nextDisabled ? 'destructive' : 'default',
          onPress: () => toggleMutation.mutate({ user, disabled: decision.nextDisabled }),
        },
      ],
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>用户管理</Text>
        <SegmentedTabs
          items={ADMIN_TABS.map((tab) => ({ value: tab.role, label: tab.label }))}
          value={activeRole}
          onChange={(value) => {
            setActiveRole(value as UserRole)
            setKeyword('')
            setStatusFilter('')
          }}
        />
        <Text style={styles.helper}>{activeTab.description}</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>关键字</Text>
          <TextInput
            placeholder={`按姓名 / ${activeTab.identityField} / 手机号搜索`}
            placeholderTextColor="#9ca3af"
            value={keyword}
            onChangeText={setKeyword}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>账号状态</Text>
          <SegmentedTabs items={ADMIN_STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
        </View>
      </View>

      {usersQuery.isLoading ? (
        <View style={styles.statePanel}>
          <ActivityIndicator color="#005bac" />
          <Text style={styles.helper}>账号加载中…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.statePanel}>
          <Text style={styles.helper}>没有匹配的{ADMIN_ROLE_LABELS[activeRole]}账号。</Text>
        </View>
      ) : (
        filtered.map((user) => {
          const decision = evaluateUserToggle(user, session.user.id)
          const pending = pendingUserId === user.id && toggleMutation.isPending
          return (
            <View key={user.id} style={styles.row}>
              <View style={styles.rowHead}>
                <Text style={styles.rowTitle}>
                  {user.realName}（{user.username}）
                </Text>
                <Text style={statusTagStyleFor(user.status)}>{ADMIN_STATUS_LABELS[user.status]}</Text>
              </View>
              <Text style={styles.helper}>
                手机号 {user.phone}
                {user.studentNo ? `   ·   学号 ${user.studentNo}` : ''}
                {user.teacherNo ? `   ·   工号 ${user.teacherNo}` : ''}
              </Text>
              {user.email || user.college || user.major || user.className ? (
                <Text style={styles.helper}>
                  {[
                    user.email ? `邮箱 ${user.email}` : null,
                    user.college,
                    user.major,
                    user.className,
                  ]
                    .filter((entry): entry is string => Boolean(entry))
                    .join(' · ')}
                </Text>
              ) : null}

              {activeTab.showStatusToggle ? (
                <View style={styles.actions}>
                  <Pressable
                    style={[
                      decision.nextDisabled ? styles.dangerButton : styles.ghostButton,
                      !decision.canAct || pending ? styles.buttonDisabled : null,
                    ]}
                    disabled={!decision.canAct || pending}
                    onPress={() => confirmToggle(user)}
                  >
                    {pending ? (
                      <ActivityIndicator color={decision.nextDisabled ? '#b91c1c' : '#004080'} />
                    ) : (
                      <Text
                        style={
                          decision.nextDisabled ? styles.dangerButtonText : styles.ghostButtonText
                        }
                      >
                        {decision.actionLabel}
                      </Text>
                    )}
                  </Pressable>
                  {decision.blockReason ? (
                    <Text style={styles.blockNote}>{decision.blockReason}</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.helper}>{ADMIN_ROLE_LABELS[activeRole]}账号仅可查看，不支持启停。</Text>
              )}
            </View>
          )
        })
      )}
    </View>
  )
}

function statusTagStyleFor(status: AdminUserItem['status']) {
  switch (status) {
    case 'active':
      return styles.statusTagActive
    case 'disabled':
      return styles.statusTagDisabled
    case 'cancelled':
      return styles.statusTagCancelled
  }
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 10,
  },
  sectionTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
  helper: { color: '#6b7280', lineHeight: 20 },
  field: { gap: 6 },
  fieldLabel: { color: '#374151', fontWeight: '700', fontSize: 12 },
  input: {
    minHeight: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#fbfcfe',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111827',
  },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 4,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowTitle: { color: '#111827', fontWeight: '800', flex: 1, paddingRight: 8 },
  statusTagActive: {
    color: '#116c35',
    backgroundColor: '#dcf2e3',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  statusTagDisabled: {
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  statusTagCancelled: {
    color: '#374151',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 4 },
  ghostButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfd0e5',
    backgroundColor: '#f4f7fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: { color: '#004080', fontWeight: '700' },
  dangerButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f4b8b8',
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: { color: '#b91c1c', fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  blockNote: { color: '#6b7280', fontSize: 12 },
  statePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
})
