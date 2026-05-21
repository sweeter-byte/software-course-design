import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { NavigationContainer } from '@react-navigation/native'

import { api, type SessionPayload } from './src/api'
import type { NoticeState, NoticeType } from './src/components/feedback/NoticeBanner'
import { MobileAuthProvider } from './src/contexts/MobileAuthContext'
import { AuthStack } from './src/navigation/AuthStack'
import { CourseStack } from './src/navigation/CourseStack'
import { RoleTabs } from './src/navigation/RoleTabs'
import { roleLabels } from './src/navigation/navigation-model'
import { AccountScreen } from './src/screens/account/AccountScreen'
import { StudentAssignmentsScreen } from './src/screens/assignments/StudentAssignmentsScreen'
import { TeacherAssignmentsScreen } from './src/screens/assignments/TeacherAssignmentsScreen'
import { LoginScreen } from './src/screens/auth/LoginScreen'
import { RegisterScreen } from './src/screens/auth/RegisterScreen'
import { ResetPasswordScreen } from './src/screens/auth/ResetPasswordScreen'
import { AssignmentDetailScreen } from './src/screens/courses/AssignmentDetailScreen'
import { CourseCreateScreen } from './src/screens/courses/CourseCreateScreen'
import { CourseListScreen } from './src/screens/courses/CourseListScreen'
import { CourseWorkspaceScreen } from './src/screens/courses/CourseWorkspaceScreen'
import { SubmissionDetailScreen } from './src/screens/courses/SubmissionDetailScreen'
import { DashboardScreen } from './src/screens/dashboard/DashboardScreen'
import { FeedbackThreadScreen } from './src/screens/feedbacks/FeedbackThreadScreen'
import { OfficerFeedbacksScreenBody } from './src/screens/officer/OfficerFeedbacksScreenBody'
import { OfficerUsersScreenBody } from './src/screens/officer/OfficerUsersScreenBody'
import { TeacherTasksScreen } from './src/screens/teacher/TeacherTasksScreen'
import { RoleScreen } from './src/components/layout/RoleScreen'
import {
  clearStoredSession,
  persistSession,
  refreshStoredSession,
  secureSessionStorage,
} from './src/session'

const queryClient = new QueryClient()
const DEFAULT_API_BASE_URL = 'http://localhost:4100/api/v1'

function Workspace() {
  const queryClient = useQueryClient()
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL)
  const [notice, setNoticeState] = useState<NoticeState | null>(null)
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [isHydratingSession, setIsHydratingSession] = useState(true)
  const [loginPrefill, setLoginPrefill] = useState<{ phone: string; password: string } | null>(null)

  const notify = useCallback((message: string, type: NoticeType = 'info') => {
    setNoticeState({ message, type })
  }, [])

  const clearSession = useCallback(
    (message: string, type: NoticeType = 'info') => {
      queryClient.clear()
      setSession(null)
      void clearStoredSession(secureSessionStorage)
      notify(message, type)
    },
    [notify, queryClient],
  )

  const updateSessionUser = useCallback((user: SessionPayload['user']) => {
    setSession((current) => (current ? { ...current, user } : current))
  }, [])

  const handleAuthenticated = useCallback((payload: SessionPayload) => {
    setSession(payload)
    void persistSession(secureSessionStorage, payload)
  }, [])

  useEffect(() => {
    let mounted = true

    refreshStoredSession(secureSessionStorage, (accessToken) =>
      api.getCurrentUser(apiBaseUrl, accessToken),
    )
      .then((storedSession) => {
        if (!mounted) return
        if (storedSession) {
          setSession(storedSession)
          notify(
            `已恢复 ${roleLabels[storedSession.user.role]} ${storedSession.user.realName} 的移动端会话。`,
          )
        }
      })
      .finally(() => {
        if (mounted) {
          setIsHydratingSession(false)
        }
      })

    return () => {
      mounted = false
    }
    // apiBaseUrl is intentionally only read at mount; changing it later does
    // not re-hydrate. Login flow uses the latest apiBaseUrl directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isHydratingSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingScreen}>
          <ActivityIndicator color="#005bac" />
          <Text style={styles.helper}>正在恢复移动端会话。</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <NavigationContainer>
        {!session ? (
          <AuthStack
            renderLogin={() => (
              <LoginScreen
                apiBaseUrl={apiBaseUrl}
                notice={notice}
                notify={notify}
                onAuthenticated={handleAuthenticated}
                prefill={loginPrefill}
              />
            )}
            renderRegister={() => (
              <RegisterScreen
                apiBaseUrl={apiBaseUrl}
                notice={notice}
                notify={notify}
                onRegistered={(phone, password) => setLoginPrefill({ phone, password })}
              />
            )}
            renderResetPassword={() => (
              <ResetPasswordScreen
                apiBaseUrl={apiBaseUrl}
                notice={notice}
                notify={notify}
                onReset={(phone, newPassword) =>
                  setLoginPrefill({ phone, password: newPassword })
                }
              />
            )}
          />
        ) : (
          <MobileAuthProvider
            session={session}
            apiBaseUrl={apiBaseUrl}
            notice={notice}
            notify={notify}
            clearSession={clearSession}
            updateSessionUser={updateSessionUser}
          >
            <RoleTabs
              role={session.user.role}
              renderScreens={{
                Dashboard: () => <DashboardScreen />,
                Courses: () => (
                  <CourseStack
                    renderCourseList={() => <CourseListScreen />}
                    renderCourseWorkspace={() => <CourseWorkspaceScreen />}
                    renderCourseCreate={() => <CourseCreateScreen />}
                    renderAssignmentDetail={() => <AssignmentDetailScreen />}
                    renderSubmissionDetail={() => <SubmissionDetailScreen />}
                    renderFeedbackThread={() => <FeedbackThreadScreen />}
                  />
                ),
                Assignments: () => <AssignmentsTab role={session.user.role} />,
                TeacherTasks: () => <TeacherTasksScreen />,
                OfficerUsers: () => (
                  <RoleScreen
                    title="用户管理"
                    subtitle="维护学生、教师、教务员账号，可禁用 / 恢复学生与教师。"
                  >
                    <OfficerUsersScreenBody />
                  </RoleScreen>
                ),
                OfficerFeedbacks: () => (
                  <RoleScreen
                    title="课程反馈查看"
                    subtitle="按维度查看全平台课程整体反馈，只读视图。"
                  >
                    <OfficerFeedbacksScreenBody />
                  </RoleScreen>
                ),
                Account: () => <AccountScreen onChangeApiBaseUrl={setApiBaseUrl} />,
              }}
            />
          </MobileAuthProvider>
        )}
      </NavigationContainer>
    </SafeAreaView>
  )
}

function AssignmentsTab({ role }: { role: SessionPayload['user']['role'] }) {
  if (role === 'teacher') return <TeacherAssignmentsScreen />
  if (role === 'student') return <StudentAssignmentsScreen />
  return (
    <RoleScreen
      title="作业"
      subtitle="教务员不参与作业提交/批改，请进入课程工作区的「作业概况」Tab。"
    >
      <View style={styles.card}>
        <Text style={styles.helper}>当前账号无作业 Tab 入口。</Text>
      </View>
    </RoleScreen>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Workspace />
    </QueryClientProvider>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 14,
  },
  helper: {
    color: '#6b7280',
    lineHeight: 20,
  },
})
