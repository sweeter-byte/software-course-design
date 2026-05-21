import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { NavigationContainer, useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { ApiError, api, type SessionPayload, type UserRole } from './src/api'
import { NoticeBanner, type NoticeState, type NoticeType } from './src/components/feedback/NoticeBanner'
import { RoleHeader } from './src/components/layout/RoleHeader'
import { DevSettingsSection } from './src/components/account/DevSettingsSection'
import { MobileAuthProvider } from './src/contexts/MobileAuthContext'
import type {
  AssignmentItem,
  CourseItem,
  FeedbackItem,
  SubmissionItem,
} from './src/domain'
import { AuthStack, type AuthStackParamList } from './src/navigation/AuthStack'
import { CourseStack } from './src/navigation/CourseStack'
import { RoleTabs, type RoleTabParamList } from './src/navigation/RoleTabs'
import { roleLabels, type RoleTabRouteName } from './src/navigation/navigation-model'
import { StudentAssignmentsScreen } from './src/screens/assignments/StudentAssignmentsScreen'
import { TeacherAssignmentsScreen } from './src/screens/assignments/TeacherAssignmentsScreen'
import { AssignmentDetailScreen } from './src/screens/courses/AssignmentDetailScreen'
import { CourseCreateScreen } from './src/screens/courses/CourseCreateScreen'
import { CourseListScreen } from './src/screens/courses/CourseListScreen'
import { CourseWorkspaceScreen } from './src/screens/courses/CourseWorkspaceScreen'
import { SubmissionDetailScreen } from './src/screens/courses/SubmissionDetailScreen'
import { FeedbackThreadScreen } from './src/screens/feedbacks/FeedbackThreadScreen'
import { OfficerFeedbacksScreenBody } from './src/screens/officer/OfficerFeedbacksScreenBody'
import { OfficerUsersScreenBody } from './src/screens/officer/OfficerUsersScreenBody'
import {
  buildDashboardActions,
  buildDashboardMetrics,
  buildDashboardTasks,
  buildTeacherTaskQueues,
  type PendingSubmissionTask,
} from './src/screens/dashboard/dashboard-model'
import {
  clearStoredSession,
  persistSession,
  refreshStoredSession,
  secureSessionStorage,
} from './src/session'

const queryClient = new QueryClient()
const DEFAULT_API_BASE_URL = 'http://localhost:4100/api/v1'

function extractErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const details = error.details
      ?.map((detail) => {
        const path = detail.path.length ? `${detail.path.join('.')}: ` : ''
        return `${path}${detail.message}`
      })
      .join('；')
    const code = error.code ? ` / ${error.code}` : ''
    return details
      ? `${error.message}${code} (${error.statusCode})：${details}`
      : `${error.message}${code} (${error.statusCode})`
  }

  if (error instanceof Error) {
    return error.message
  }

  return '请求失败'
}

function Field(props: {
  label: string
  value: string
  onChangeText: (value: string) => void
  secureTextEntry?: boolean
  multiline?: boolean
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        style={[styles.input, props.multiline ? styles.inputMultiline : null]}
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
        multiline={props.multiline}
        placeholderTextColor="#6b7280"
      />
    </View>
  )
}

function SummaryBadge(props: { label: string; value: number; accent: string }) {
  return (
    <View style={[styles.summaryCard, { borderLeftColor: props.accent }]}>
      <Text style={styles.summaryLabel}>{props.label}</Text>
      <Text style={styles.summaryValue}>{props.value}</Text>
    </View>
  )
}

function DashboardTaskCard(props: {
  label: string
  value: number
  detail: string
  onPress: () => void
}) {
  return (
    <Pressable style={styles.taskCard} onPress={props.onPress}>
      <View style={styles.taskCardHead}>
        <Text style={styles.taskLabel}>{props.label}</Text>
        <Text style={styles.taskValue}>{props.value}</Text>
      </View>
      <Text style={styles.helper}>{props.detail}</Text>
    </Pressable>
  )
}

function QuickActionButton(props: {
  label: string
  detail: string
  onPress: () => void
}) {
  return (
    <Pressable style={styles.actionButton} onPress={props.onPress}>
      <Text style={styles.actionLabel}>{props.label}</Text>
      <Text style={styles.actionDetail}>{props.detail}</Text>
    </Pressable>
  )
}

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
}

function navigateRoleTab(
  navigation: BottomTabNavigationProp<RoleTabParamList>,
  routeName: RoleTabRouteName,
) {
  switch (routeName) {
    case 'Dashboard':
      navigation.navigate('Dashboard')
      break
    case 'Courses':
      navigation.navigate('Courses')
      break
    case 'Assignments':
      navigation.navigate('Assignments')
      break
    case 'TeacherTasks':
      navigation.navigate('TeacherTasks')
      break
    case 'OfficerUsers':
      navigation.navigate('OfficerUsers')
      break
    case 'OfficerFeedbacks':
      navigation.navigate('OfficerFeedbacks')
      break
    case 'Account':
      navigation.navigate('Account')
      break
  }
}

function Workspace() {
  const queryClient = useQueryClient()
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL)
  const [notice, setNoticeState] = useState<NoticeState | null>(null)
  const setNotice = useCallback((message: string, type: NoticeType = 'info') => {
    setNoticeState({ message, type })
  }, [])
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [isHydratingSession, setIsHydratingSession] = useState(true)
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' })
  const [registerForm, setRegisterForm] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    username: '',
    realName: '',
    studentId: '',
    verificationCode: '',
  })
  const [resetForm, setResetForm] = useState({
    phone: '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [profileDraft, setProfileDraft] = useState({
    username: '',
    realName: '',
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
    oldPhone: '',
    oldVerificationCode: '',
    newPhone: '',
    newVerificationCode: '',
  })
  const [teacherQueueTab, setTeacherQueueTab] = useState<'submissions' | 'feedbacks'>('submissions')

  const applySessionPayload = (payload: SessionPayload) => {
    setSession(payload)
    setProfileDraft((current) => ({
      ...current,
      username: payload.user.username,
      realName: payload.user.realName,
    }))
    setPhoneDraft((current) => ({
      ...current,
      oldPhone: payload.user.phone,
    }))
  }

  const clearSessionState = (message: string, type: NoticeType = 'info') => {
    queryClient.clear()
    setSession(null)
    void clearStoredSession(secureSessionStorage)
    setNotice(message, type)
  }

  useEffect(() => {
    let mounted = true

    refreshStoredSession(secureSessionStorage, (accessToken) =>
      api.getCurrentUser(apiBaseUrl, accessToken),
    )
      .then((storedSession) => {
        if (!mounted) return
        if (storedSession) {
          applySessionPayload(storedSession)
          setNotice(`已恢复 ${roleLabels[storedSession.user.role]} ${storedSession.user.realName} 的移动端会话。`)
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
  }, [])

  const dashboardQuery = useQuery({
    enabled: Boolean(session),
    queryKey: ['mobile-dashboard', apiBaseUrl, session?.accessToken, session?.user.role],
    queryFn: async () => {
      if (!session) return { summary: {} as Record<string, number> }
      return api.getDashboard(apiBaseUrl, session.accessToken, session.user.role)
    },
  })

  const coursesQuery = useQuery({
    enabled: Boolean(session),
    queryKey: ['mobile-courses', apiBaseUrl, session?.accessToken],
    queryFn: async () => {
      if (!session) return { items: [] as CourseItem[] }
      const payload = await api.listCourses(apiBaseUrl, session.accessToken, '')
      return { items: payload.items as CourseItem[] }
    },
  })

  const loginMutation = useMutation({
    mutationFn: async () => api.login(apiBaseUrl, loginForm.phone, loginForm.password),
    onSuccess: (payload) => {
      applySessionPayload(payload)
      void persistSession(secureSessionStorage, payload)
      setNotice(`${roleLabels[payload.user.role]} ${payload.user.realName} 已登录移动端。`, 'success')
    },
    onError: (error) => setNotice(extractErrorMessage(error), 'error'),
  })

  const codeMutation = useMutation({
    mutationFn: async () => api.requestVerificationCode(apiBaseUrl, registerForm.phone),
    onSuccess: (payload) => {
      if (payload.previewCode) {
        setRegisterForm((current) => ({
          ...current,
          verificationCode: payload.previewCode ?? '',
        }))
        setNotice(`验证码已回填：${payload.previewCode}`)
      } else {
        setNotice('验证码已发送，请注意查收。')
      }
    },
    onError: (error) => setNotice(extractErrorMessage(error), 'error'),
  })

  const resetCodeMutation = useMutation({
    mutationFn: async () => api.requestVerificationCode(apiBaseUrl, resetForm.phone, 'reset_password'),
    onSuccess: (payload) => {
      setResetForm((current) => ({
        ...current,
        verificationCode: payload.previewCode ?? current.verificationCode,
      }))
      setNotice(payload.previewCode ? `重置验证码已回填：${payload.previewCode}` : '重置验证码已发送。')
    },
    onError: (error) => setNotice(extractErrorMessage(error), 'error'),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async () => api.resetPassword(apiBaseUrl, resetForm),
    onSuccess: () => {
      setLoginForm({ phone: resetForm.phone, password: resetForm.newPassword })
      setResetForm({
        phone: '',
        verificationCode: '',
        newPassword: '',
        confirmPassword: '',
      })
      setNotice('密码已重置，可直接登录。', 'success')
    },
    onError: (error) => setNotice(extractErrorMessage(error), 'error'),
  })

  const registerMutation = useMutation({
    mutationFn: async () => api.registerStudent(apiBaseUrl, registerForm),
    onSuccess: () => {
      setNotice('注册成功，请返回登录。', 'success')
      setLoginForm({ phone: registerForm.phone, password: registerForm.password })
    },
    onError: (error) => setNotice(extractErrorMessage(error), 'error'),
  })

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!session) return null
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
      if (!payload) return
      setSession((current) => {
        if (!current) return current
        const nextSession = {
          ...current,
          user: {
            ...current.user,
            username: String(payload.user.username),
            realName: String(payload.user.realName),
          },
        }
        void persistSession(secureSessionStorage, nextSession)
        return nextSession
      })
      setNotice('资料已更新。', 'success')
    },
    onError: (error) => setNotice(extractErrorMessage(error), 'error'),
  })

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!session) return null
      return api.changePassword(apiBaseUrl, session.accessToken, passwordDraft)
    },
    onSuccess: () => {
      setPasswordDraft({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      clearSessionState('密码已修改，请使用新密码重新登录。', 'success')
    },
    onError: (error) => setNotice(extractErrorMessage(error), 'error'),
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!session) return null
      return api.logout(apiBaseUrl, session.accessToken)
    },
    onSuccess: () => {
      clearSessionState('已退出当前会话。')
    },
    onError: (error) => setNotice(extractErrorMessage(error), 'error'),
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
    },
    onError: (error) => setNotice(extractErrorMessage(error), 'error'),
  })

  const changePhoneMutation = useMutation({
    mutationFn: async () => {
      if (!session) return null
      return api.changePhone(apiBaseUrl, session.accessToken, phoneDraft)
    },
    onSuccess: (payload) => {
      if (!payload) return
      const nextPhone = String(payload.user.phone)
      setPhoneDraft({
        oldPhone: nextPhone,
        oldVerificationCode: '',
        newPhone: '',
        newVerificationCode: '',
      })
      clearSessionState('手机号已修改，请使用新手机号重新登录。', 'success')
    },
    onError: (error) => setNotice(extractErrorMessage(error), 'error'),
  })

  const cancelAccountMutation = useMutation({
    mutationFn: async () => {
      if (!session) return null
      return api.cancelAccount(apiBaseUrl, session.accessToken)
    },
    onSuccess: () => {
      clearSessionState('账号已注销，后续需重新注册。')
    },
    onError: (error) => setNotice(extractErrorMessage(error), 'error'),
  })

  function confirmCancelAccount() {
    Alert.alert(
      '注销账号',
      '确认注销当前账号吗？注销后当前会话会退出，后续需要重新注册或联系教务员处理。',
      [
        { text: '取消', style: 'cancel' },
        { text: '确认注销', style: 'destructive', onPress: () => cancelAccountMutation.mutate() },
      ],
    )
  }


  const courses = (coursesQuery.data?.items ?? []) as CourseItem[]
  const currentRole = session?.user.role
  const visibleCourses =
    currentRole === 'teacher'
      ? courses.filter((course) => course.teacherId === session?.user.id)
      : courses
  const teacherAssignmentQueries = useQueries({
    queries:
      currentRole === 'teacher'
        ? visibleCourses.map((course) => ({
            queryKey: ['mobile-teacher-assignments', apiBaseUrl, session?.accessToken, course.id],
            queryFn: async () => {
              if (!session) return { items: [] as AssignmentItem[], course }
              const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
              return { items: payload.items as AssignmentItem[], course }
            },
          }))
        : [],
  })
  const teacherAssignmentContexts = useMemo(
    () =>
      teacherAssignmentQueries.flatMap((query) => {
        if (!query.data) return []
        return query.data.items.map((assignment) => ({
          assignment,
          courseId: query.data.course.id,
          courseName: query.data.course.courseName,
        }))
      }),
    [teacherAssignmentQueries],
  )
  const teacherSubmittableAssignmentContexts = useMemo(
    () =>
      teacherAssignmentContexts.filter(({ assignment }) => assignment.status !== 'cancelled'),
    [teacherAssignmentContexts],
  )
  const teacherSubmissionQueries = useQueries({
    queries:
      currentRole === 'teacher'
        ? teacherSubmittableAssignmentContexts.map(({ assignment }) => ({
            queryKey: ['mobile-teacher-submissions', apiBaseUrl, session?.accessToken, assignment.id],
            queryFn: async () => {
              if (!session) return { items: [] as SubmissionItem[], assignmentId: assignment.id }
              const payload = await api.listSubmissions(apiBaseUrl, session.accessToken, assignment.id)
              return { items: payload.items as SubmissionItem[], assignmentId: assignment.id }
            },
          }))
        : [],
  })
  const teacherFeedbackThreadsQuery = useQuery({
    enabled: currentRole === 'teacher',
    queryKey: ['mobile-teacher-feedback-threads', apiBaseUrl, session?.accessToken],
    queryFn: async () => {
      if (!session) return { items: [] as FeedbackItem[] }
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {})
      return { items: payload.items as FeedbackItem[] }
    },
  })
  const teacherSubmissionsByAssignment = useMemo(() => {
    const items: Record<string, SubmissionItem[]> = {}
    teacherSubmissionQueries.forEach((query) => {
      if (query.data) {
        items[query.data.assignmentId] = query.data.items
      }
    })
    return items
  }, [teacherSubmissionQueries])
  const teacherTaskQueues = useMemo(
    () =>
      buildTeacherTaskQueues({
        assignments: teacherAssignmentContexts,
        submissionsByAssignment: teacherSubmissionsByAssignment,
        feedbackThreads: teacherFeedbackThreadsQuery.data?.items ?? [],
      }),
    [teacherAssignmentContexts, teacherSubmissionsByAssignment, teacherFeedbackThreadsQuery.data],
  )
  const teacherTasksLoading =
    currentRole === 'teacher' &&
    (coursesQuery.isLoading ||
      teacherAssignmentQueries.some((query) => query.isLoading) ||
      teacherSubmissionQueries.some((query) => query.isLoading) ||
      teacherFeedbackThreadsQuery.isLoading)
  const openSubmissionTask = (
    navigation: BottomTabNavigationProp<RoleTabParamList>,
    task: PendingSubmissionTask,
  ) => {
    navigation.navigate('Courses', {
      screen: 'SubmissionDetail',
      params: { submissionId: task.submission.id, courseId: task.courseId },
    })
  }

  const openFeedbackTask = (
    navigation: BottomTabNavigationProp<RoleTabParamList>,
    thread: FeedbackItem,
  ) => {
    navigation.navigate('Courses', {
      screen: 'FeedbackThread',
      params: { feedbackId: thread.id, courseId: thread.courseId ?? undefined },
    })
  }

  function ScreenScroll({ children }: { children: ReactNode }) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <NoticeBanner notice={notice} />
        {children}
      </ScrollView>
    )
  }

  function AuthScaffold({
    title,
    helper,
    children,
  }: {
    title: string
    helper: string
    children: ReactNode
  }) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.heroBrandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>NUAA</Text>
            </View>
            <View style={styles.heroBrandCopy}>
              <Text style={styles.eyebrow}>Course Pulse Mobile</Text>
              <Text style={styles.heroTitle}>课程互动 · 移动工作台</Text>
            </View>
          </View>
          <Text style={styles.heroCopy}>
            不是网页压缩版，而是围绕当前角色任务栏组织移动端业务视图。
          </Text>
        </View>

        <NoticeBanner notice={notice} />

        <View style={styles.card}>
          <View style={styles.authHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.helper}>{helper}</Text>
          </View>
          {children}
        </View>
      </ScrollView>
    )
  }

  function LoginScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Login'>>()

    return (
      <AuthScaffold
        title="账号登录"
        helper="使用 Web 端同一账号体系，登录后按角色进入对应移动工作台。"
      >
        <Field
          label="手机号"
          value={loginForm.phone}
          onChangeText={(value) => setLoginForm((current) => ({ ...current, phone: value }))}
        />
        <Field
          label="密码"
          value={loginForm.password}
          secureTextEntry
          onChangeText={(value) => setLoginForm((current) => ({ ...current, password: value }))}
        />
        <Pressable style={styles.primaryButton} onPress={() => loginMutation.mutate()}>
          {loginMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>登录</Text>}
        </Pressable>
        <Text style={styles.helper}>教师：13900139000 / Teacher123!，教务员：13700137000 / Officer123!</Text>
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

  function RegisterScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Register'>>()

    return (
      <AuthScaffold
        title="学生注册"
        helper="学生完成手机号验证后即可使用移动端课程互动功能。"
      >
        <Field
          label="手机号"
          value={registerForm.phone}
          onChangeText={(value) => setRegisterForm((current) => ({ ...current, phone: value }))}
        />
        <Field
          label="学号"
          value={registerForm.studentId}
          onChangeText={(value) => setRegisterForm((current) => ({ ...current, studentId: value }))}
        />
        <Field
          label="用户名"
          value={registerForm.username}
          onChangeText={(value) => setRegisterForm((current) => ({ ...current, username: value }))}
        />
        <Field
          label="真实姓名"
          value={registerForm.realName}
          onChangeText={(value) => setRegisterForm((current) => ({ ...current, realName: value }))}
        />
        <Field
          label="密码"
          value={registerForm.password}
          secureTextEntry
          onChangeText={(value) => setRegisterForm((current) => ({ ...current, password: value }))}
        />
        <Field
          label="确认密码"
          value={registerForm.confirmPassword}
          secureTextEntry
          onChangeText={(value) =>
            setRegisterForm((current) => ({ ...current, confirmPassword: value }))
          }
        />
        <Field
          label="验证码"
          value={registerForm.verificationCode}
          onChangeText={(value) =>
            setRegisterForm((current) => ({ ...current, verificationCode: value }))
          }
        />
        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={() => codeMutation.mutate()}>
            <Text style={styles.secondaryText}>获取验证码</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              registerMutation.mutate(undefined, {
                onSuccess: () => navigation.navigate('Login'),
              })
            }
          >
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

  function ResetPasswordScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>>()

    return (
      <AuthScaffold
        title="找回密码"
        helper="通过手机号验证码重置密码，完成后返回登录页。"
      >
        <Field
          label="手机号"
          value={resetForm.phone}
          onChangeText={(value) => setResetForm((current) => ({ ...current, phone: value }))}
        />
        <Field
          label="验证码"
          value={resetForm.verificationCode}
          onChangeText={(value) =>
            setResetForm((current) => ({ ...current, verificationCode: value }))
          }
        />
        <Field
          label="新密码"
          value={resetForm.newPassword}
          secureTextEntry
          onChangeText={(value) =>
            setResetForm((current) => ({ ...current, newPassword: value }))
          }
        />
        <Field
          label="确认新密码"
          value={resetForm.confirmPassword}
          secureTextEntry
          onChangeText={(value) =>
            setResetForm((current) => ({ ...current, confirmPassword: value }))
          }
        />
        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={() => resetCodeMutation.mutate()}>
            <Text style={styles.secondaryText}>获取重置验证码</Text>
          </Pressable>
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              resetPasswordMutation.mutate(undefined, {
                onSuccess: () => navigation.navigate('Login'),
              })
            }
          >
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

  function RoleScreen({
    title,
    subtitle,
    children,
  }: {
    title: string
    subtitle?: string
    children: ReactNode
  }) {
    if (!session) return null

    return (
      <>
        <RoleHeader
          title={title}
          subtitle={subtitle}
          user={session.user}
          isLoggingOut={logoutMutation.isPending}
          onLogout={() => logoutMutation.mutate()}
        />
        <ScreenScroll>{children}</ScreenScroll>
      </>
    )
  }

  function DashboardScreen() {
    const navigation = useNavigation<BottomTabNavigationProp<RoleTabParamList, 'Dashboard'>>()

    if (!session) return null

    const summary = dashboardQuery.data?.summary ?? {}
    const metrics = buildDashboardMetrics(session.user.role, summary)
    const tasks = buildDashboardTasks(session.user.role, summary)
    const actions = buildDashboardActions(session.user.role)
    const teacherPreviewSubmissions = teacherTaskQueues.pendingSubmissions.slice(0, 2)
    const teacherPreviewFeedbacks = teacherTaskQueues.pendingFeedbacks.slice(0, 2)

    return (
      <RoleScreen
        title="工作台"
        subtitle={`${session.user.realName} · ${roleLabels[session.user.role]} · ${session.user.phone}`}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>角色概览</Text>
          <View style={styles.summaryGrid}>
            {metrics.map((metric, index) => (
              <SummaryBadge
                key={metric.key}
                label={metric.label}
                value={metric.value}
                accent={['#005bac', '#159447', '#d97706', '#dc2626'][index % 4]}
              />
            ))}
          </View>
          {dashboardQuery.isLoading ? <ActivityIndicator color="#005bac" /> : null}
          {!dashboardQuery.isLoading && metrics.every((metric) => metric.value === 0) ? (
            <Text style={styles.helper}>暂无概览数据，请稍后刷新或确认网络连接。</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>优先任务</Text>
          <View style={styles.taskList}>
            {tasks.map((task) => (
              <DashboardTaskCard
                key={task.label}
                label={task.label}
                value={task.value}
                detail={task.detail}
                onPress={() => navigateRoleTab(navigation, task.target)}
              />
            ))}
          </View>
        </View>

        {session.user.role === 'teacher' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>继续处理</Text>
            {teacherTasksLoading ? <ActivityIndicator color="#005bac" /> : null}
            {!teacherTasksLoading &&
            teacherPreviewSubmissions.length === 0 &&
            teacherPreviewFeedbacks.length === 0 ? (
              <Text style={styles.helper}>暂无待批改提交或未回答反馈。</Text>
            ) : null}
            <View style={styles.listBlock}>
              {teacherPreviewSubmissions.map((task) => (
                <Pressable
                  key={task.submission.id}
                  style={styles.listItem}
                  onPress={() => openSubmissionTask(navigation, task)}
                >
                  <Text style={styles.threadTag}>待批改提交</Text>
                  <Text style={styles.listItemTitle}>
                    {task.submission.studentName ?? task.submission.studentId} · {task.assignment.title}
                  </Text>
                  <Text style={styles.listItemCopy}>{task.submission.content}</Text>
                  <Text style={styles.helper}>
                    {task.courseName} · {formatDateTimeBrief(task.submission.submittedAt)}
                  </Text>
                </Pressable>
              ))}
              {teacherPreviewFeedbacks.map((thread) => (
                <Pressable
                  key={thread.id}
                  style={styles.listItem}
                  onPress={() => openFeedbackTask(navigation, thread)}
                >
                  <Text style={styles.threadTag}>未回答反馈</Text>
                  <Text style={styles.listItemTitle}>
                    {thread.studentName ?? thread.studentId} · {thread.assignmentTitle ?? '作业'}
                  </Text>
                  <Text style={styles.listItemCopy}>{thread.content}</Text>
                  <Text style={styles.helper}>
                    {thread.courseName ?? '课程'} · {formatDateTimeBrief(thread.createdAt)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>快捷入口</Text>
          <View style={styles.actionGrid}>
            {actions.map((action) => (
              <QuickActionButton
                key={action.label}
                label={action.label}
                detail={action.detail}
                onPress={() => navigateRoleTab(navigation, action.target)}
              />
            ))}
          </View>
        </View>
      </RoleScreen>
    )
  }

  function AccountScreen() {
    return (
      <RoleScreen title="账号" subtitle="查看个人资料、修改手机号或密码、注销当前账号。">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>账号维护</Text>
              <Field
                label="用户名"
                value={profileDraft.username}
                onChangeText={(value) => setProfileDraft((current) => ({ ...current, username: value }))}
              />
              <Field
                label="真实姓名"
                value={profileDraft.realName}
                onChangeText={(value) => setProfileDraft((current) => ({ ...current, realName: value }))}
              />
              <Field
                label="邮箱"
                value={profileDraft.email}
                onChangeText={(value) => setProfileDraft((current) => ({ ...current, email: value }))}
              />
              <Field
                label="学院"
                value={profileDraft.college}
                onChangeText={(value) => setProfileDraft((current) => ({ ...current, college: value }))}
              />
              <Field
                label="专业"
                value={profileDraft.major}
                onChangeText={(value) => setProfileDraft((current) => ({ ...current, major: value }))}
              />
              <Field
                label="班级"
                value={profileDraft.className}
                onChangeText={(value) => setProfileDraft((current) => ({ ...current, className: value }))}
              />
              <Pressable style={styles.primaryButton} onPress={() => updateProfileMutation.mutate()}>
                <Text style={styles.primaryText}>保存资料</Text>
              </Pressable>

              <Text style={styles.sectionTitle}>修改密码</Text>
              <Field
                label="旧密码"
                value={passwordDraft.oldPassword}
                secureTextEntry
                onChangeText={(value) =>
                  setPasswordDraft((current) => ({ ...current, oldPassword: value }))
                }
              />
              <Field
                label="新密码"
                value={passwordDraft.newPassword}
                secureTextEntry
                onChangeText={(value) =>
                  setPasswordDraft((current) => ({ ...current, newPassword: value }))
                }
              />
              <Field
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
              <Field
                label="旧手机号"
                value={phoneDraft.oldPhone}
                onChangeText={(value) => setPhoneDraft((current) => ({ ...current, oldPhone: value }))}
              />
              <Field
                label="旧手机号验证码"
                value={phoneDraft.oldVerificationCode}
                onChangeText={(value) =>
                  setPhoneDraft((current) => ({ ...current, oldVerificationCode: value }))
                }
              />
              <Field
                label="新手机号"
                value={phoneDraft.newPhone}
                onChangeText={(value) => setPhoneDraft((current) => ({ ...current, newPhone: value }))}
              />
              <Field
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
          <DevSettingsSection apiBaseUrl={apiBaseUrl} onChangeApiBaseUrl={setApiBaseUrl} />
        </View>
      </RoleScreen>
    )
  }



  function CoursesTab() {
    return (
      <CourseStack
        renderCourseList={() => <CourseListScreen />}
        renderCourseWorkspace={() => <CourseWorkspaceScreen />}
        renderCourseCreate={() => <CourseCreateScreen />}
        renderAssignmentDetail={() => <AssignmentDetailScreen />}
        renderSubmissionDetail={() => <SubmissionDetailScreen />}
        renderFeedbackThread={() => <FeedbackThreadScreen />}
      />
    )
  }

  function AssignmentsTabScreen() {
    if (currentRole === 'teacher') return <TeacherAssignmentsScreen />
    if (currentRole === 'student') return <StudentAssignmentsScreen />
    return (
      <RoleScreen title="作业" subtitle="教务员不参与作业提交/批改，请进入课程工作区的「作业概况」Tab。">
        <View style={styles.card}>
          <Text style={styles.helper}>当前账号无作业 Tab 入口。</Text>
        </View>
      </RoleScreen>
    )
  }

  function TeacherTasksScreen() {
    const navigation = useNavigation<BottomTabNavigationProp<RoleTabParamList, 'TeacherTasks'>>()
    const showSubmissions = teacherQueueTab === 'submissions'

    return (
      <RoleScreen title="教学任务" subtitle="跨课程汇总待批改提交和未回答作业反馈。">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>任务队列</Text>
          <View style={styles.taskSummaryGrid}>
            <Pressable
              style={[styles.taskSummaryTab, showSubmissions ? styles.taskSummaryTabActive : null]}
              onPress={() => setTeacherQueueTab('submissions')}
            >
              <Text style={styles.taskSummaryLabel}>待批改提交</Text>
              <Text style={styles.taskSummaryValue}>{teacherTaskQueues.pendingSubmissions.length}</Text>
            </Pressable>
            <Pressable
              style={[styles.taskSummaryTab, !showSubmissions ? styles.taskSummaryTabActive : null]}
              onPress={() => setTeacherQueueTab('feedbacks')}
            >
              <Text style={styles.taskSummaryLabel}>未回答反馈</Text>
              <Text style={styles.taskSummaryValue}>{teacherTaskQueues.pendingFeedbacks.length}</Text>
            </Pressable>
          </View>
          {teacherTasksLoading ? <ActivityIndicator color="#005bac" /> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{showSubmissions ? '待批改提交' : '未回答作业反馈'}</Text>
          {showSubmissions ? (
            <View style={styles.listBlock}>
              {teacherTaskQueues.pendingSubmissions.map((task) => (
                <Pressable
                  key={task.submission.id}
                  style={styles.listItem}
                  onPress={() => openSubmissionTask(navigation, task)}
                >
                  <Text style={styles.listItemTitle}>
                    {task.submission.studentName ?? task.submission.studentId} · {task.assignment.title}
                  </Text>
                  <Text style={styles.listItemCopy}>{task.submission.content}</Text>
                  <Text style={styles.helper}>课程：{task.courseName}</Text>
                  <Text style={styles.helper}>提交时间：{formatDateTimeBrief(task.submission.submittedAt)}</Text>
                </Pressable>
              ))}
              {!teacherTasksLoading && teacherTaskQueues.pendingSubmissions.length === 0 ? (
                <Text style={styles.helper}>暂无待批改提交，所有提交都已批改完成。</Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.listBlock}>
              {teacherTaskQueues.pendingFeedbacks.map((thread) => (
                <Pressable
                  key={thread.id}
                  style={styles.listItem}
                  onPress={() => openFeedbackTask(navigation, thread)}
                >
                  <Text style={styles.listItemTitle}>
                    {thread.studentName ?? thread.studentId} · {thread.assignmentTitle ?? '作业'}
                  </Text>
                  <Text style={styles.listItemCopy}>{thread.content}</Text>
                  {thread.courseName ? <Text style={styles.helper}>课程：{thread.courseName}</Text> : null}
                  <Text style={styles.helper}>发起时间：{formatDateTimeBrief(thread.createdAt)}</Text>
                </Pressable>
              ))}
              {!teacherTasksLoading && teacherTaskQueues.pendingFeedbacks.length === 0 ? (
                <Text style={styles.helper}>暂无待回答反馈，所有学生反馈都已回应。</Text>
              ) : null}
            </View>
          )}
        </View>
      </RoleScreen>
    )
  }

  function OfficerUsersScreen() {
    return (
      <RoleScreen title="用户管理" subtitle="维护学生、教师、教务员账号，可禁用 / 恢复学生与教师。">
        <OfficerUsersScreenBody />
      </RoleScreen>
    )
  }

  function OfficerFeedbacksScreen() {
    return (
      <RoleScreen title="课程反馈查看" subtitle="按维度查看全平台课程整体反馈，只读视图。">
        <OfficerFeedbacksScreenBody />
      </RoleScreen>
    )
  }

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
            renderLogin={() => <LoginScreen />}
            renderRegister={() => <RegisterScreen />}
            renderResetPassword={() => <ResetPasswordScreen />}
          />
        ) : (
          <MobileAuthProvider
            session={session}
            apiBaseUrl={apiBaseUrl}
            notice={notice}
            notify={setNotice}
          >
            <RoleTabs
              role={session.user.role}
              renderScreens={{
                Dashboard: () => <DashboardScreen />,
                Courses: () => <CoursesTab />,
                Assignments: () => <AssignmentsTabScreen />,
                TeacherTasks: () => <TeacherTasksScreen />,
                OfficerUsers: () => <OfficerUsersScreen />,
                OfficerFeedbacks: () => <OfficerFeedbacksScreen />,
                Account: () => <AccountScreen />,
              }}
            />
          </MobileAuthProvider>
        )}
      </NavigationContainer>
    </SafeAreaView>
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
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  hero: {
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#004080',
    backgroundColor: '#002b5c',
    gap: 14,
    shadowColor: '#0f2341',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: '#005bac',
  },
  brandMarkText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  heroBrandCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  heroCopy: {
    color: 'rgba(255, 255, 255, 0.78)',
    lineHeight: 22,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 14,
    shadowColor: '#0f2341',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  authHeader: {
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d9e2ef',
  },
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
  notice: {
    color: '#004080',
    lineHeight: 20,
    fontWeight: '700',
  },
  sessionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
  },
  helper: {
    color: '#6b7280',
    lineHeight: 20,
  },
  summaryRow: {
    gap: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 96,
    borderLeftWidth: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#f8fbff',
    padding: 14,
    gap: 6,
  },
  summaryLabel: {
    color: '#4b5563',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryValue: {
    color: '#005bac',
    fontSize: 24,
    fontWeight: '800',
  },
  taskList: {
    gap: 10,
  },
  taskCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#f8fbff',
    padding: 14,
    gap: 8,
  },
  taskCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  taskLabel: {
    flex: 1,
    color: '#111827',
    fontWeight: '800',
  },
  taskValue: {
    color: '#005bac',
    fontSize: 22,
    fontWeight: '800',
  },
  actionGrid: {
    gap: 10,
  },
  actionButton: {
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 91, 172, 0.28)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  actionLabel: {
    color: '#004080',
    fontWeight: '800',
  },
  actionDetail: {
    color: '#6b7280',
    lineHeight: 18,
    fontSize: 12,
  },
  taskSummaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  taskSummaryTab: {
    flex: 1,
    minHeight: 76,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#f8fbff',
    padding: 12,
    gap: 8,
  },
  taskSummaryTabActive: {
    borderColor: '#005bac',
    backgroundColor: '#eaf3ff',
  },
  taskSummaryLabel: {
    color: '#4b5563',
    fontWeight: '800',
  },
  taskSummaryValue: {
    color: '#005bac',
    fontSize: 26,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfd0e5',
    backgroundColor: '#ffffff',
  },
  chipActive: {
    borderColor: '#80c7ff',
    backgroundColor: '#eaf3ff',
  },
  chipText: {
    color: '#4b5563',
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#004080',
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfd0e5',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
  },
  inputMultiline: {
    minHeight: 104,
    textAlignVertical: 'top',
  },
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
    shadowColor: '#005bac',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '800',
  },
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
  secondaryText: {
    color: '#004080',
    fontWeight: '800',
  },
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
  dangerText: {
    color: '#dc2626',
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  listBlock: {
    gap: 10,
  },
  listItem: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#f8fbff',
    padding: 14,
    gap: 4,
  },
  listItemActive: {
    borderColor: '#005bac',
    backgroundColor: '#f4faff',
  },
  listItemTitle: {
    color: '#111827',
    fontWeight: '800',
  },
  listItemCopy: {
    color: '#4b5563',
    lineHeight: 20,
  },
  threadCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#f8fbff',
    padding: 14,
    gap: 10,
  },
  threadTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#eaf3ff',
    color: '#004080',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  threadContent: {
    color: '#111827',
    lineHeight: 20,
  },
  responseBubble: {
    borderLeftWidth: 4,
    borderLeftColor: '#159447',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#eaf8ef',
    padding: 12,
    gap: 6,
  },
  responseTag: {
    color: '#159447',
    fontSize: 12,
    fontWeight: '800',
  },
  responseText: {
    color: '#111827',
    lineHeight: 20,
  },
  inlineComposer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  inlineInput: {
    flex: 1,
    minWidth: 180,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfd0e5',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
})
