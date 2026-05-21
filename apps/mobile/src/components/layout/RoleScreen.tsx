import type { ReactNode } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { api, extractErrorMessage } from '../../api'
import { useMobileAuth } from '../../contexts/MobileAuthContext'
import { NoticeBanner } from '../feedback/NoticeBanner'
import { RoleHeader } from './RoleHeader'

type RoleScreenProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export function RoleScreen({ title, subtitle, children }: RoleScreenProps) {
  const { session, apiBaseUrl, notice, notify, clearSession } = useMobileAuth()
  const queryClient = useQueryClient()

  const logoutMutation = useMutation({
    mutationFn: async () => api.logout(apiBaseUrl, session.accessToken),
    onSuccess: () => {
      queryClient.clear()
      clearSession('已退出当前会话。')
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  return (
    <>
      <RoleHeader
        title={title}
        subtitle={subtitle}
        user={session.user}
        isLoggingOut={logoutMutation.isPending}
        onLogout={() => logoutMutation.mutate()}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <NoticeBanner notice={notice} />
        {children}
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    gap: 14,
  },
})
