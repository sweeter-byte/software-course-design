import { Suspense, lazy, startTransition, useDeferredValue, useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import './App.css'
import { ApiError, api, type SessionPayload } from './api'
import { RoleShell } from './components/layout/RoleShell'
import { StatePanel } from './components/ui/StatePanel'
import { createDefaultAssignmentDates } from './demo-defaults'
import type {
  AdminUserItem,
  AssignmentItem,
  CourseFeedbackItem,
  CourseItem,
  FeedbackItem,
  SubmissionItem,
  UserRole,
} from './domain'
import { LoginShell, type AuthMode } from './features/auth/LoginShell'
import { StudentAssignmentWorkspace } from './features/assignments/StudentAssignmentWorkspace'
import { TeacherTaskWorkspace } from './features/teacher/TeacherTaskWorkspace'
import { useNotifications } from './hooks/useNotifications'
import { resolveWorkspaceContext, useWorkspaceSelection } from './hooks/useWorkspaceContext'
import { RoutePlaceholder } from './routes/RoutePlaceholder'
import { dashboardPath } from './routes/paths'
import { readInitialRuntimeState } from './runtime-state'
import { confirmDestructive } from './utils/confirm'
import { formatDateTimeForDisplay, fromDateTimeLocalValue, toDateTimeLocalValue } from './utils/date'
import { friendlyErrorMessage } from './utils/errors'

const AccountSection = lazy(() =>
  import('./features/account/AccountSection').then((m) => ({ default: m.AccountSection })),
)
const UserAdminSection = lazy(() =>
  import('./features/officer/UserAdminSection').then((m) => ({ default: m.UserAdminSection })),
)

const DEFAULT_API_BASE_URL = 'http://localhost:4100/api/v1'

type SummaryRecord = Record<string, number>

/**
 * Per §1.1, the URL itself is the navigation contract. `LegacyView` is the
 * short-lived bridge type that the still-monolithic dashboard layout in this
 * file uses to decide which legacy SectionCard to render. It will be removed
 * once every route below has its own component (see §1.3 step 8).
 */
type LegacyView =
  | 'dashboard'
  | 'courses'
  | 'courseAdmin'
  | 'assignments'
  | 'grading'
  | 'courseFeedbacks'
  | 'interaction'
  | 'userAdmin'
  | 'account'

const roleLabels: Record<UserRole, string> = {
  student: '学生',
  teacher: '教师',
  officer: '教务员',
}

const courseFeedbackDimensionLabels: Record<CourseFeedbackItem['dimension'], string> = {
  content: '课程内容',
  method: '教学方法',
  teaching: '教师授课',
  gain: '学习收获',
  other: '其他建议',
}

const roleWorkspaceDescriptions: Record<UserRole, string> = {
  student: '查看课程安排、提交学习成果，并围绕作业反馈持续交流。',
  teacher: '维护教学节奏、发布作业、处理提交并完成答疑反馈。',
  officer: '统筹课程基础信息，查看平台运行概况与教学状态。',
}

const legacyViewLabels: Record<LegacyView, string> = {
  dashboard: '工作台',
  courses: '课程',
  courseAdmin: '课程维护',
  assignments: '作业',
  grading: '教学任务',
  courseFeedbacks: '课程反馈',
  interaction: '互动交流',
  userAdmin: '用户管理',
  account: '账号维护',
}

interface NavItem {
  to: string
  label: string
  hint: string
}

/**
 * Routes from §1.1 that don't yet have a dedicated screen. Each is rendered
 * through <RoutePlaceholder/> in step 1 and replaced with a real component in
 * later migration steps.
 */
const STEP1_PLACEHOLDER_ROUTES: ReadonlyArray<string> = [
  '/student/courses/:courseId/overview',
  '/student/courses/:courseId/assignments',
  '/student/courses/:courseId/assignments/:assignmentId',
  '/student/courses/:courseId/feedbacks',
  '/student/courses/:courseId/feedbacks/:feedbackId',
  '/student/courses/:courseId/course-feedbacks',
  '/teacher/courses/:courseId/overview',
  '/teacher/courses/:courseId/assignments',
  '/teacher/courses/:courseId/assignments/:assignmentId',
  '/teacher/courses/:courseId/submissions',
  '/teacher/courses/:courseId/submissions/:submissionId',
  '/teacher/courses/:courseId/feedbacks',
  '/teacher/courses/:courseId/feedbacks/:feedbackId',
  '/teacher/courses/:courseId/course-feedbacks',
  '/teacher/tasks',
  '/officer/courses/:courseId/overview',
  '/officer/courses/:courseId/basic-info',
  '/officer/courses/:courseId/assignments',
  '/officer/courses/:courseId/course-feedbacks',
  '/officer/users/students',
  '/officer/users/teachers',
  '/officer/users/officers',
]

const roleNavigation: Record<UserRole, NavItem[]> = {
  student: [
    { to: '/student/dashboard', label: '工作台', hint: '学习总览' },
    { to: '/student/courses', label: '我的课程', hint: '课程检索与加入' },
    { to: '/student/assignments', label: '我的作业', hint: '跨课程作业汇总' },
    { to: '/student/account', label: '账号维护', hint: '资料与安全' },
  ],
  teacher: [
    { to: '/teacher/dashboard', label: '工作台', hint: '教学处理总览' },
    { to: '/teacher/courses', label: '授课课程', hint: '授课课程列表' },
    { to: '/teacher/assignments', label: '作业管理', hint: '跨课程作业对象' },
    { to: '/teacher/tasks', label: '教学任务', hint: '批改与答疑待办' },
    { to: '/teacher/account', label: '账号维护', hint: '资料与安全' },
  ],
  officer: [
    { to: '/officer/dashboard', label: '工作台', hint: '平台运行总览' },
    { to: '/officer/courses', label: '课程运营', hint: '课程信息与详情' },
    { to: '/officer/users', label: '用户管理', hint: '账号列表与启停' },
    { to: '/officer/course-feedbacks', label: '课程反馈查看', hint: '课程整体反馈' },
    { to: '/officer/account', label: '账号维护', hint: '资料与安全' },
  ],
}

/**
 * Maps the current URL to a legacy view name for the still-inline dashboard
 * layout. Returns null when the URL is a §1.1 route that has not yet been
 * implemented (those are handled by <RoutePlaceholder>) or when no role is set.
 */
function deriveLegacyView(pathname: string, role: UserRole | undefined): LegacyView | null {
  if (!role) return null
  if (pathname === `/${role}/dashboard`) return 'dashboard'
  if (pathname === `/${role}/courses`) return 'courses'
  if (pathname === `/${role}/account`) return 'account'
  if (role === 'student' && pathname === '/student/assignments') return 'assignments'
  if (role === 'teacher' && pathname === '/teacher/assignments') return 'assignments'
  if (role === 'officer' && pathname === '/officer/users') return 'userAdmin'
  if (role === 'officer' && pathname === '/officer/course-feedbacks') return 'courseFeedbacks'
  return null
}

const summaryLabels: Record<string, string> = {
  totalCourses: '课程总数',
  totalTeachers: '教师总数',
  totalStudents: '学生总数',
  openFeedbacks: '作业互动反馈数',
  courseFeedbacks: '课程反馈数',
  enrolledCourses: '已加入课程',
  pendingAssignments: '待提交作业',
  gradedSubmissions: '已批改提交',
  totalCoursesForTeacher: '当前课程数',
  publishedAssignments: '已发布作业',
  pendingGrades: '待批改提交',
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

function SummaryCard(props: { label: string; value: number; accent: string }) {
  return (
    <article className="summary-card">
      <span className="summary-accent" style={{ background: props.accent }} />
      <span className="summary-caption">概览</span>
      <p className="summary-label">{props.label}</p>
      <strong className="summary-value">{props.value}</strong>
    </article>
  )
}

function SectionCard(props: { title: string; subtitle: string; children: ReactNode; className?: string }) {
  return (
    <section className={['section-card', props.className].filter(Boolean).join(' ')}>
      <div className="section-head">
        <h3>{props.title}</h3>
        <p>{props.subtitle}</p>
      </div>
      {props.children}
    </section>
  )
}

function App() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [initialRuntimeState] = useState(() =>
    readInitialRuntimeState(window.localStorage, DEFAULT_API_BASE_URL),
  )
  const apiBaseUrl = initialRuntimeState.apiBaseUrl
  const [session, setSession] = useState<SessionPayload | null>(initialRuntimeState.session)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const { notifications, notify, dismiss: dismissNotification } = useNotifications()
  useEffect(() => {
    const id = notify({
      type: initialRuntimeState.recoveredInvalidSession ? 'error' : 'info',
      content: initialRuntimeState.recoveredInvalidSession
        ? '登录状态已更新，请重新登录。'
        : '欢迎使用课程互动平台。',
    })
    return () => dismissNotification(id)
  }, [initialRuntimeState.recoveredInvalidSession, notify, dismissNotification])
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
    username: initialRuntimeState.session?.user.username ?? '',
    realName: initialRuntimeState.session?.user.realName ?? '',
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
    oldPhone: initialRuntimeState.session?.user.phone ?? '',
    oldVerificationCode: '',
    newPhone: '',
    newVerificationCode: '',
  })
  const [courseSearch, setCourseSearch] = useState('')
  const [courseSemesterFilter, setCourseSemesterFilter] = useState('')
  const [courseLocationFilter, setCourseLocationFilter] = useState('')
  const [courseStatusFilter, setCourseStatusFilter] = useState('')
  const deferredCourseSearch = useDeferredValue(courseSearch)
  const deferredCourseSemesterFilter = useDeferredValue(courseSemesterFilter)
  const deferredCourseLocationFilter = useDeferredValue(courseLocationFilter)
  const deferredCourseStatusFilter = useDeferredValue(courseStatusFilter)
  const {
    selectedCourseId,
    selectedAssignmentId,
    selectedSubmissionId,
    setSelectedCourseId,
    setSelectedAssignmentId,
    setSelectedSubmissionId,
    resetAll: resetWorkspaceSelection,
    resetBelowCourse,
  } = useWorkspaceSelection()
  const [courseDraft, setCourseDraft] = useState({
    courseCode: 'SE-5001',
    courseName: '软件工程实践',
    teacherId: 'teacher-demo-001',
    semester: '2026 春',
    description: '围绕课程学习组织、作业发布与互动反馈开展教学。',
    location: '明故宫校区 A302',
    scheduleText: '周三 10:00-11:35',
    capacity: '80',
    startDate: '2026-03-01',
    endDate: '2026-07-01',
    status: 'not_started',
  })
  const [assignmentDraft, setAssignmentDraft] = useState(() => ({
    title: '阶段作业一',
    description: '整理本阶段学习成果并完成作业提交。',
    requirement: '提交学习总结、关键说明与个人反思。',
    ...createDefaultAssignmentDates(),
  }))
  const [assignmentCancelReason, setAssignmentCancelReason] = useState('教学计划调整，取消本次作业。')
  const [submissionContent, setSubmissionContent] = useState('已完成本阶段学习任务，并整理了主要成果说明。')
  const [gradeDraft, setGradeDraft] = useState({
    score: '92',
    teacherFeedback: '结构完整，表达清晰，建议继续补充细节论证。',
  })
  const [feedbackDraft, setFeedbackDraft] = useState({
    kind: 'question' as 'question' | 'feedback',
    content: '老师，我想进一步确认本次作业的完善方向。',
  })
  const [responseDraft, setResponseDraft] = useState('建议补充关键步骤说明，并突出你的分析思路。')
  const [courseFeedbackDraft, setCourseFeedbackDraft] = useState({
    dimension: 'teaching' as CourseFeedbackItem['dimension'],
    content: '教师讲解清晰，希望增加更多项目案例。',
  })
  const [userAdminRoleFilter, setUserAdminRoleFilter] = useState<'' | UserRole>('')
  const [userAdminPendingId, setUserAdminPendingId] = useState<string | null>(null)
  const currentRole = session?.user.role
  const navItems = currentRole ? roleNavigation[currentRole] : []
  const legacyView = deriveLegacyView(location.pathname, currentRole)
  const visibleView: LegacyView = legacyView ?? 'dashboard'
  const activePageTitle = legacyViewLabels[visibleView]

  const showHero = visibleView === 'dashboard'
  const showAccount = visibleView === 'account'
  const showUserAdmin = currentRole === 'officer' && visibleView === 'userAdmin'
  const showCoursesList = visibleView === 'dashboard' || visibleView === 'courses'
  const showCourseAdmin = currentRole === 'officer' && visibleView === 'courseAdmin'
  const showCourseParticipation =
    currentRole === 'student'
      ? visibleView === 'courses'
      : currentRole === 'teacher' && visibleView === 'assignments'
  const showCourseFeedbacks = visibleView === 'courseFeedbacks'
  const showAssignmentsList = visibleView === 'assignments'
  const showAssignmentDetail =
    currentRole === 'teacher'
      ? visibleView === 'grading'
      : currentRole === 'student' && visibleView === 'assignments'
  const showInteraction = currentRole === 'student' && visibleView === 'interaction'
  const showCurrentProgress =
    visibleView !== 'account' && visibleView !== 'courseAdmin' && visibleView !== 'userAdmin'
  const showFirstGrid = showAccount || showUserAdmin || showCoursesList || showCourseAdmin || showCourseParticipation
  const showSecondGrid = showCourseFeedbacks || showAssignmentsList || showAssignmentDetail
  const showThirdGrid = showInteraction || showCurrentProgress
  const viewLoadingFallback = (
    <StatePanel title="视图加载中" detail="正在准备所需模块，请稍候。" />
  )

  useEffect(() => {
    window.localStorage.setItem('cms_session', JSON.stringify(session))
  }, [session])

  useEffect(() => {
    if (!currentRole) {
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true })
      }
      return
    }
    // Top-level role redirect: if the URL prefix doesn't match the current
    // role, send the user to their dashboard. Routes that do match the role
    // (including §1.1 placeholders served by <RoutePlaceholder> below) are
    // handled by <Routes> directly, so we don't redirect on those.
    const rolePrefix = `/${currentRole}/`
    const hasRolePrefix =
      location.pathname === `/${currentRole}` || location.pathname.startsWith(rolePrefix)
    if (!hasRolePrefix) {
      navigate(dashboardPath(currentRole), { replace: true })
    }
  }, [currentRole, location.pathname, navigate])

  const dashboardQuery = useQuery({
    enabled: Boolean(session),
    queryKey: ['dashboard', apiBaseUrl, session?.accessToken, session?.user.role],
    queryFn: async () => {
      if (!session) {
        return { summary: {} as SummaryRecord }
      }

      return api.getDashboard(apiBaseUrl, session.accessToken, session.user.role)
    },
  })

  const coursesQuery = useQuery({
    enabled: Boolean(session),
    queryKey: [
      'courses',
      apiBaseUrl,
      session?.accessToken,
      deferredCourseSearch,
      deferredCourseSemesterFilter,
      deferredCourseLocationFilter,
      deferredCourseStatusFilter,
    ],
    queryFn: async () => {
      if (!session) {
        return { items: [] as CourseItem[] }
      }

      const payload = await api.listCourses(apiBaseUrl, session.accessToken, {
        keyword: deferredCourseSearch,
        semester: deferredCourseSemesterFilter,
        location: deferredCourseLocationFilter,
        status: deferredCourseStatusFilter,
      })
      return {
        items: payload.items as CourseItem[],
      }
    },
  })

  const assignmentsQuery = useQuery({
    enabled: Boolean(session && selectedCourseId),
    queryKey: ['assignments', apiBaseUrl, session?.accessToken, selectedCourseId],
    queryFn: async () => {
      if (!session || !selectedCourseId) {
        return { items: [] as AssignmentItem[] }
      }

      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, selectedCourseId)
      return {
        items: payload.items as AssignmentItem[],
      }
    },
  })

  const submissionsQuery = useQuery({
    enabled: Boolean(session?.user.role === 'teacher' && selectedAssignmentId),
    queryKey: ['submissions', apiBaseUrl, session?.accessToken, selectedAssignmentId],
    queryFn: async () => {
      if (!session || !selectedAssignmentId) {
        return { items: [] as SubmissionItem[] }
      }

      const payload = await api.listSubmissions(apiBaseUrl, session.accessToken, selectedAssignmentId)
      return {
        items: payload.items as SubmissionItem[],
      }
    },
  })

  const feedbacksQuery = useQuery({
    enabled: Boolean(session && selectedSubmissionId),
    queryKey: ['feedbacks', apiBaseUrl, session?.accessToken, selectedSubmissionId],
    queryFn: async () => {
      if (!session || !selectedSubmissionId) {
        return { items: [] as FeedbackItem[] }
      }

      const payload = await api.listFeedbacks(apiBaseUrl, session.accessToken, selectedSubmissionId)
      return {
        items: payload.items as FeedbackItem[],
      }
    },
  })

  const feedbackThreadsQuery = useQuery({
    enabled: Boolean(
      session?.user.role === 'teacher' && visibleView === 'grading',
    ),
    queryKey: [
      'feedbackThreads',
      apiBaseUrl,
      session?.accessToken,
      selectedCourseId,
      selectedAssignmentId,
    ],
    queryFn: async () => {
      if (!session) {
        return { items: [] as FeedbackItem[] }
      }

      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {
        courseId: selectedCourseId ?? undefined,
        assignmentId: selectedAssignmentId ?? undefined,
        status: 'open',
      })
      return {
        items: payload.items as FeedbackItem[],
      }
    },
  })

  const courseFeedbacksQuery = useQuery({
    enabled: Boolean(session),
    queryKey: ['courseFeedbacks', apiBaseUrl, session?.accessToken, selectedCourseId],
    queryFn: async () => {
      if (!session) {
        return { items: [] as CourseFeedbackItem[] }
      }

      const payload = await api.listCourseFeedbacks(
        apiBaseUrl,
        session.accessToken,
        selectedCourseId ?? undefined,
      )
      return {
        items: payload.items as CourseFeedbackItem[],
      }
    },
  })

  const adminUsersQuery = useQuery({
    enabled: Boolean(session && currentRole === 'officer'),
    queryKey: ['adminUsers', apiBaseUrl, session?.accessToken, userAdminRoleFilter],
    queryFn: async () => {
      if (!session) {
        return { users: [] as AdminUserItem[] }
      }
      const payload = await api.listAdminUsers(
        apiBaseUrl,
        session.accessToken,
        userAdminRoleFilter || undefined,
      )
      return {
        users: payload.users as AdminUserItem[],
      }
    },
  })

  const loginMutation = useMutation({
    mutationFn: async () => api.login(apiBaseUrl, loginForm.phone, loginForm.password),
    onSuccess: (payload) => {
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
      notify({
        type: 'success',
        content: `${roleLabels[payload.user.role]} ${payload.user.realName}，欢迎回来。`,
      })
      navigate(dashboardPath(payload.user.role), { replace: true })
      startTransition(() => {
        resetWorkspaceSelection()
      })
    },
    onError: (error) => {
      notify({ type: 'error', content: extractErrorMessage(error) })
    },
  })

  const verificationMutation = useMutation({
    mutationFn: async () => api.requestVerificationCode(apiBaseUrl, registerForm.phone),
    onSuccess: (payload) => {
      if (payload.previewCode) {
        setRegisterForm((current) => ({
          ...current,
          verificationCode: payload.previewCode ?? '',
        }))
        notify({ type: 'info', content: '验证码已自动填入，可继续完成注册。' })
      } else {
        notify({ type: 'info', content: '验证码已发送，请注意查收。' })
      }
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const resetCodeMutation = useMutation({
    mutationFn: async () => api.requestVerificationCode(apiBaseUrl, resetForm.phone, 'reset_password'),
    onSuccess: (payload) => {
      setResetForm((current) => ({
        ...current,
        verificationCode: payload.previewCode ?? current.verificationCode,
      }))
      notify({
        type: 'info',
        content: payload.previewCode ? '重置验证码已自动填入。' : '重置验证码已发送。',
      })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async () => api.resetPassword(apiBaseUrl, resetForm),
    onSuccess: () => {
      notify({ type: 'success', content: '密码已重置，请使用新密码登录。' })
      setLoginForm({ phone: resetForm.phone, password: resetForm.newPassword })
      setResetForm({
        phone: '',
        verificationCode: '',
        newPassword: '',
        confirmPassword: '',
      })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const registerMutation = useMutation({
    mutationFn: async () => api.registerStudent(apiBaseUrl, registerForm),
    onSuccess: () => {
      setAuthMode('login')
      notify({ type: 'success', content: '注册成功，请使用手机号和密码登录。' })
      setLoginForm({ phone: registerForm.phone, password: registerForm.password })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
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
      const user = payload.user
      setSession((current) =>
        current
          ? {
              ...current,
              user: {
                ...current.user,
                username: String(user.username),
                realName: String(user.realName),
              },
            }
          : current,
      )
      notify({ type: 'success', content: '个人资料已更新。' })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
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
      notify({ type: 'success', content: '密码已修改，请妥善保管新密码。' })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
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
      notify({
        type: 'info',
        content: previewCode
          ? `${target === 'old' ? '旧手机号' : '新手机号'}验证码已回填。`
          : `${target === 'old' ? '旧手机号' : '新手机号'}验证码已发送。`,
      })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const changePhoneMutation = useMutation({
    mutationFn: async () => {
      if (!session) return null
      return api.changePhone(apiBaseUrl, session.accessToken, phoneDraft)
    },
    onSuccess: (payload) => {
      if (!payload) return
      const nextPhone = String(payload.user.phone)
      setSession((current) =>
        current
          ? {
              ...current,
              user: {
                ...current.user,
                phone: nextPhone,
              },
            }
          : current,
      )
      setPhoneDraft({
        oldPhone: nextPhone,
        oldVerificationCode: '',
        newPhone: '',
        newVerificationCode: '',
      })
      notify({ type: 'success', content: '手机号已修改。' })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!session) return null
      return api.logout(apiBaseUrl, session.accessToken)
    },
    onSuccess: () => {
      setSession(null)
      notify({ type: 'info', content: '已退出当前账号。' })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const cancelAccountMutation = useMutation({
    mutationFn: async () => {
      if (!session) return null
      return api.cancelAccount(apiBaseUrl, session.accessToken)
    },
    onSuccess: () => {
      setSession(null)
      notify({ type: 'info', content: '账号已注销，后续需重新注册。' })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const createCourseMutation = useMutation({
    mutationFn: async () => {
      if (!session) return null
      return api.createCourse(apiBaseUrl, session.accessToken, {
        courseCode: courseDraft.courseCode,
        courseName: courseDraft.courseName,
        teacherId: courseDraft.teacherId,
        semester: courseDraft.semester,
        description: courseDraft.description,
        location: courseDraft.location,
        scheduleText: courseDraft.scheduleText,
        capacity: Number(courseDraft.capacity),
        startDate: courseDraft.startDate,
        endDate: courseDraft.endDate,
      })
    },
    onSuccess: (payload) => {
      if (!payload) return
      notify({
        type: 'success',
        content: `课程《${String(payload.course.courseName)}》已创建。`,
      })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      startTransition(() => {
        setSelectedCourseId(String(payload.course.id))
      })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const updateCourseMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedCourseId) return null
      return api.updateCourse(apiBaseUrl, session.accessToken, selectedCourseId, {
        ...courseDraft,
        capacity: Number(courseDraft.capacity),
      })
    },
    onSuccess: (payload) => {
      if (!payload) return
      notify({
        type: 'success',
        content: `课程《${String(payload.course.courseName)}》已更新。`,
      })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const deleteCourseMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedCourseId) return null
      return api.deleteCourse(apiBaseUrl, session.accessToken, selectedCourseId)
    },
    onSuccess: () => {
      notify({ type: 'success', content: '课程已删除。' })
      startTransition(() => {
        resetWorkspaceSelection()
      })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!session) return null
      return api.enrollCourse(apiBaseUrl, session.accessToken, courseId)
    },
    onSuccess: (_, courseId) => {
      notify({ type: 'success', content: '已加入课程，可以开始查看作业与学习内容。' })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      startTransition(() => {
        setSelectedCourseId(courseId)
      })
    },
    onError: (error) => {
      const message = extractErrorMessage(error)

      if (message.includes('ALREADY_ENROLLED') || message.includes('already_enrolled')) {
        notify({ type: 'info', content: '你已加入该课程。' })
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        return
      }

      notify({ type: 'error', content: message })
    },
  })

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedCourseId) return null
      return api.createAssignment(apiBaseUrl, session.accessToken, selectedCourseId, assignmentDraft)
    },
    onSuccess: (payload) => {
      if (!payload) return
      notify({
        type: 'success',
        content: `作业《${String(payload.assignment.title)}》已发布。`,
      })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      startTransition(() => {
        setSelectedAssignmentId(String(payload.assignment.id))
      })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const updateAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedAssignmentId) return null
      return api.updateAssignment(apiBaseUrl, session.accessToken, selectedAssignmentId, assignmentDraft)
    },
    onSuccess: (payload) => {
      if (!payload) return
      notify({
        type: 'success',
        content: `作业《${String(payload.assignment.title)}》已更新。`,
      })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const cancelAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedAssignmentId) return null
      return api.cancelAssignment(
        apiBaseUrl,
        session.accessToken,
        selectedAssignmentId,
        assignmentCancelReason,
      )
    },
    onSuccess: () => {
      notify({ type: 'success', content: '作业已取消，相关提交已清理。' })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const createSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedAssignmentId) return null
      return api.createSubmission(apiBaseUrl, session.accessToken, selectedAssignmentId, submissionContent)
    },
    onSuccess: (payload) => {
      if (!payload) return
      notify({ type: 'success', content: '作业已提交。' })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      startTransition(() => {
        setSelectedSubmissionId(String(payload.submission.id))
      })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const updateSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedSubmissionId) return null
      return api.updateSubmission(apiBaseUrl, session.accessToken, selectedSubmissionId, submissionContent)
    },
    onSuccess: () => {
      notify({ type: 'success', content: '答案已修改。' })
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const gradeSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedSubmissionId) return null
      return api.gradeSubmission(
        apiBaseUrl,
        session.accessToken,
        selectedSubmissionId,
        Number(gradeDraft.score),
        gradeDraft.teacherFeedback,
      )
    },
    onSuccess: () => {
      notify({ type: 'success', content: '批改结果已保存。' })
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const createFeedbackMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedSubmissionId) return null
      return api.createFeedback(
        apiBaseUrl,
        session.accessToken,
        selectedSubmissionId,
        feedbackDraft.kind,
        feedbackDraft.content,
      )
    },
    onSuccess: () => {
      notify({ type: 'success', content: '留言已提交。' })
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const createResponseMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      if (!session) return null
      return api.createResponse(apiBaseUrl, session.accessToken, feedbackId, responseDraft)
    },
    onSuccess: () => {
      notify({ type: 'success', content: '回复已提交。' })
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const updateFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      if (!session) return null
      return api.updateFeedback(
        apiBaseUrl,
        session.accessToken,
        feedbackId,
        feedbackDraft.kind,
        feedbackDraft.content,
      )
    },
    onSuccess: () => {
      notify({ type: 'success', content: '问题/反馈已修改。' })
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      if (!session) return null
      return api.deleteFeedback(apiBaseUrl, session.accessToken, feedbackId)
    },
    onSuccess: () => {
      notify({ type: 'success', content: '问题/反馈已删除。' })
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const createCourseFeedbackMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedCourseId) return null
      return api.createCourseFeedback(apiBaseUrl, session.accessToken, selectedCourseId, courseFeedbackDraft)
    },
    onSuccess: () => {
      notify({ type: 'success', content: '课程反馈已提交。' })
      queryClient.invalidateQueries({ queryKey: ['courseFeedbacks'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const updateCourseFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      if (!session) return null
      return api.updateCourseFeedback(apiBaseUrl, session.accessToken, feedbackId, courseFeedbackDraft)
    },
    onSuccess: () => {
      notify({ type: 'success', content: '课程反馈已修改。' })
      queryClient.invalidateQueries({ queryKey: ['courseFeedbacks'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const deleteCourseFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      if (!session) return null
      return api.deleteCourseFeedback(apiBaseUrl, session.accessToken, feedbackId)
    },
    onSuccess: () => {
      notify({ type: 'success', content: '课程反馈已删除。' })
      queryClient.invalidateQueries({ queryKey: ['courseFeedbacks'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const toggleUserStatusMutation = useMutation({
    mutationFn: async (variables: { user: AdminUserItem; disabled: boolean }) => {
      if (!session) return null
      setUserAdminPendingId(variables.user.id)
      return api.setUserDisabled(
        apiBaseUrl,
        session.accessToken,
        variables.user.id,
        variables.disabled,
      )
    },
    onSuccess: (_data, variables) => {
      notify({
        type: 'success',
        content: variables.disabled
          ? `已禁用 ${variables.user.realName} 的账号。`
          : `已恢复 ${variables.user.realName} 的账号。`,
      })
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
    onSettled: () => {
      setUserAdminPendingId(null)
    },
  })

  const courses = (coursesQuery.data?.items ?? []) as CourseItem[]
  const assignments = (assignmentsQuery.data?.items ?? []) as AssignmentItem[]
  const submissions = (submissionsQuery.data?.items ?? []) as SubmissionItem[]
  const feedbacks = (feedbacksQuery.data?.items ?? []) as FeedbackItem[]
  const courseFeedbacks = (courseFeedbacksQuery.data?.items ?? []) as CourseFeedbackItem[]
  const feedbackThreads = (feedbackThreadsQuery.data?.items ?? []) as FeedbackItem[]

  const dashboardSummary = (dashboardQuery.data?.summary ?? {}) as SummaryRecord
  const visibleCourses =
    currentRole === 'teacher'
      ? courses.filter((course) => course.teacherId === session?.user.id)
      : courses
  const enrolledCourseCount =
    currentRole === 'student'
      ? visibleCourses.filter((course) => course.enrolled).length
      : 0
  const { selectedCourse, selectedAssignment, selectedSubmission, context: workspaceContext } =
    resolveWorkspaceContext({
      selection: { selectedCourseId, selectedAssignmentId, selectedSubmissionId },
      visibleCourses,
      assignments,
      submissions,
      currentRole,
    })
  const roleDescription = currentRole ? roleWorkspaceDescriptions[currentRole] : '通过统一入口进入课程工作区。'
  const heroHighlights = session
    ? [
        {
          label: currentRole === 'student' ? '已加入课程' : '当前课程数',
          value: currentRole === 'student' ? enrolledCourseCount : visibleCourses.length,
        },
        {
          label: '作业数',
          value: assignments.length,
        },
        {
          label: currentRole === 'teacher' ? '提交数' : '互动数',
          value: currentRole === 'teacher' ? submissions.length : feedbacks.length,
        },
      ]
    : []

  const workspaceTips = [
    '先选择课程，再继续处理作业、提交与互动内容。',
    '教师可围绕当前课程发布作业并查看学生提交。',
    '学生在完成提交后，可继续围绕反馈开展沟通。',
  ]
  const loginSupportNotes = [
    '教师与教务员使用已分配账号登录。',
    '学生注册后可直接进入课程工作区。',
    '账号或密码问题请联系课程管理支持人员。',
  ]
  const loginGuideNotes = [
    '统一入口仅用于身份认证，登录后进入课程工作台。',
    '建议在常用电脑浏览器中访问本系统。',
    '若连续输错密码，请联系管理人员处理账号问题。',
  ]

  if (!session) {
    return (
      <LoginShell
        authMode={authMode}
        notifications={notifications}
        onDismissNotification={dismissNotification}
        supportNotes={loginSupportNotes}
        guideNotes={loginGuideNotes}
        loginForm={loginForm}
        registerForm={registerForm}
        resetForm={resetForm}
        isLoginPending={loginMutation.isPending}
        isRegisterPending={registerMutation.isPending}
        isResetPending={resetPasswordMutation.isPending}
        isRegisterCodePending={verificationMutation.isPending}
        isResetCodePending={resetCodeMutation.isPending}
        onAuthModeChange={setAuthMode}
        onLoginChange={setLoginForm}
        onRegisterChange={setRegisterForm}
        onResetChange={setResetForm}
        onSubmitLogin={() => loginMutation.mutate()}
        onSubmitRegister={() => registerMutation.mutate()}
        onSubmitReset={() => resetPasswordMutation.mutate()}
        onRequestRegisterCode={() => verificationMutation.mutate()}
        onRequestResetCode={() => resetCodeMutation.mutate()}
      />
    )
  }

  return (
    <RoleShell
      user={session.user}
      roleLabel={roleLabels[session.user.role]}
      pageTitle={activePageTitle}
      roleDescription={roleDescription}
      navItems={navItems}
      guideTip={workspaceTips[0]}
      notifications={notifications}
      onDismissNotification={dismissNotification}
      workspaceContext={workspaceContext}
      courses={visibleCourses}
      assignments={assignments}
      submissions={submissions}
      onCourseChange={(courseId) => {
        startTransition(() => {
          setSelectedCourseId(courseId || null)
          resetBelowCourse()
          setSubmissionContent('')
        })
      }}
      onAssignmentChange={(assignmentId) => {
        startTransition(() => {
          const assignment = assignments.find((item) => item.id === assignmentId) ?? null
          setSelectedAssignmentId(assignment?.id ?? null)
          setSelectedSubmissionId(assignment?.mySubmission?.id ?? assignment?.submissionId ?? null)
          setSubmissionContent(assignment?.mySubmission?.content ?? '')
        })
      }}
      onSubmissionChange={(submissionId) => setSelectedSubmissionId(submissionId || null)}
      onLogout={() => logoutMutation.mutate()}
      isLoggingOut={logoutMutation.isPending}
    >
        <Routes>
          {/* Course workspace roots redirect to their overview tab (§1.1). */}
          <Route path="/student/courses/:courseId" element={<Navigate to="overview" replace />} />
          <Route path="/teacher/courses/:courseId" element={<Navigate to="overview" replace />} />
          <Route path="/officer/courses/:courseId" element={<Navigate to="overview" replace />} />
          {STEP1_PLACEHOLDER_ROUTES.map((path) => (
            <Route key={path} path={path} element={<RoutePlaceholder route={path} />} />
          ))}
          <Route
            path="*"
            element={
              <div className="dashboard-layout">
                {showHero ? (
              <>
                <div className="hero-banner">
                  <div>
                    <p className="eyebrow">当前账号</p>
                    <h3>
                      {session.user.realName}
                      <span> {roleLabels[session.user.role]}</span>
                    </h3>
                    <p>
                      {roleDescription} 当前登录手机号为 {session.user.phone}。
                    </p>
                  </div>
                  <div className="identity-chip">
                    <span>{roleLabels[session.user.role]}</span>
                    <strong>{session.user.username}</strong>
                  </div>
                </div>

                <div className="hero-metrics">
                  {heroHighlights.map((item) => (
                    <article key={item.label} className="hero-metric">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>

                <div className="summary-grid">
                  {Object.entries(dashboardSummary).map(([label, value], index) => (
                    <SummaryCard
                      key={label}
                      label={summaryLabels[label] ?? label}
                      value={value}
                      accent={['#005bac', '#1d4ed8', '#d97706', '#9f1239'][index % 4]}
                    />
                  ))}
                </div>
              </>
            ) : null}

            {showFirstGrid ? (
            <div className="workspace-grid">
              {showAccount ? (
                <SectionCard
                  title="账号维护"
                  subtitle="修改个人资料、密码或注销当前账号。"
                  className="wide-card"
                >
                  <Suspense fallback={viewLoadingFallback}>
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
                        if (confirmDestructive('确认注销当前账号吗？注销后将立即退出登录，且无法恢复。')) {
                          cancelAccountMutation.mutate()
                        }
                      }}
                      onRequestPhoneCode={(target) => phoneCodeMutation.mutate(target)}
                      onSubmitPhoneChange={() => changePhoneMutation.mutate()}
                    />
                  </Suspense>
                </SectionCard>
              ) : null}

              {showUserAdmin ? (
                <SectionCard
                  title="用户管理"
                  subtitle="查看全部账号，并按需禁用或恢复访问权限。"
                  className="wide-card"
                >
                  <Suspense fallback={viewLoadingFallback}>
                    <UserAdminSection
                      users={(adminUsersQuery.data?.users ?? []) as AdminUserItem[]}
                      roleFilter={userAdminRoleFilter}
                      isLoading={adminUsersQuery.isLoading}
                      isToggling={toggleUserStatusMutation.isPending}
                      currentUserId={session.user.id}
                      pendingUserId={userAdminPendingId}
                      onRoleFilterChange={setUserAdminRoleFilter}
                      onToggle={(user) => {
                        const nextDisabled = user.status !== 'disabled'
                        const confirmMessage = nextDisabled
                          ? `确认禁用 ${user.realName} 的账号吗？禁用后该账号无法登录。`
                          : `确认恢复 ${user.realName} 的账号吗？恢复后该账号可立即登录。`
                        if (!confirmDestructive(confirmMessage)) {
                          return
                        }
                        toggleUserStatusMutation.mutate({ user, disabled: nextDisabled })
                      }}
                    />
                  </Suspense>
                </SectionCard>
              ) : null}


              {showCoursesList ? (
              <SectionCard
                title="课程列表"
                subtitle="支持搜索、查看与进入对应课程。"
                className="wide-card"
              >
                <div className="inline-row">
                  <input
                    className="search-input"
                    placeholder="按课程名或课程代码筛选"
                    value={courseSearch}
                    onChange={(event) => setCourseSearch(event.target.value)}
                  />
                </div>
                <div className="form-grid">
                  <label>
                    学期筛选
                    <input
                      value={courseSemesterFilter}
                      onChange={(event) => setCourseSemesterFilter(event.target.value)}
                      placeholder="例如 2026 春"
                    />
                  </label>
                  <label>
                    地点筛选
                    <input
                      value={courseLocationFilter}
                      onChange={(event) => setCourseLocationFilter(event.target.value)}
                      placeholder="例如 将军路"
                    />
                  </label>
                  <label>
                    状态筛选
                    <select
                      value={courseStatusFilter}
                      onChange={(event) => setCourseStatusFilter(event.target.value)}
                    >
                      <option value="">全部</option>
                      <option value="not_started">未开始</option>
                      <option value="active">进行中</option>
                      <option value="completed">已完成</option>
                      <option value="suspended">暂停</option>
                    </select>
                  </label>
                </div>
                <div className="entity-list">
                  {coursesQuery.isLoading ? (
                    <StatePanel title="课程正在加载" detail="正在同步课程安排，请稍候。" />
                  ) : visibleCourses.length > 0 ? (
                    visibleCourses.map((course) => (
                      <button
                        key={course.id}
                        className={selectedCourseId === course.id ? 'entity-card active' : 'entity-card'}
                        type="button"
                        onClick={() => {
                          startTransition(() => {
                            setSelectedCourseId(course.id)
                            resetBelowCourse()
                          })
                        }}
                      >
                        <div>
                          <strong>{course.courseName}</strong>
                          <span>{course.courseCode}</span>
                        </div>
                        <p>{course.location}</p>
                        <small>{course.scheduleText}</small>
                        {currentRole === 'student' ? (
                          <span className="status-tag">
                            {course.enrolled ? '已加入' : '可加入'}
                          </span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <StatePanel title="暂无可展示课程" detail="可以稍后刷新，或由教务员先创建课程信息。" />
                  )}
                </div>
              </SectionCard>
              ) : null}

              {showCourseAdmin ? (
                <SectionCard
                  title="课程信息维护"
                  subtitle="完善课程基础信息，安排教学时间与授课教师。"
                  className="wide-card"
                >
                  <form
                    className="stack-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      createCourseMutation.mutate()
                    }}
                  >
                    <div className="form-grid">
                      <label htmlFor="course-code">
                        课程代码
                        <input
                          id="course-code"
                          name="courseCode"
                          required
                          minLength={2}
                          title="请输入课程代码"
                          value={courseDraft.courseCode}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, courseCode: event.target.value }))
                          }
                        />
                      </label>
                      <label htmlFor="course-name">
                        课程名称
                        <input
                          id="course-name"
                          name="courseName"
                          required
                          minLength={2}
                          title="请输入课程名称"
                          value={courseDraft.courseName}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, courseName: event.target.value }))
                          }
                        />
                      </label>
                      <label htmlFor="course-teacher-id">
                        授课教师编号
                        <input
                          id="course-teacher-id"
                          name="teacherId"
                          required
                          minLength={2}
                          title="请选择授课教师"
                          value={courseDraft.teacherId}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, teacherId: event.target.value }))
                          }
                        />
                      </label>
                      <label htmlFor="course-semester">
                        开课学期
                        <input
                          id="course-semester"
                          name="semester"
                          required
                          minLength={2}
                          title="请输入开课学期"
                          value={courseDraft.semester}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, semester: event.target.value }))
                          }
                        />
                      </label>
                      <label htmlFor="course-location">
                        授课地点
                        <input
                          id="course-location"
                          name="location"
                          required
                          minLength={2}
                          title="请输入授课地点"
                          value={courseDraft.location}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, location: event.target.value }))
                          }
                        />
                      </label>
                      <label htmlFor="course-schedule">
                        上课时间
                        <input
                          id="course-schedule"
                          name="scheduleText"
                          required
                          minLength={2}
                          title="请输入上课时间"
                          value={courseDraft.scheduleText}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, scheduleText: event.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <label htmlFor="course-description">
                      课程简介
                      <textarea
                        id="course-description"
                        name="description"
                        required
                        minLength={2}
                        title="请输入课程简介"
                        value={courseDraft.description}
                        onChange={(event) =>
                          setCourseDraft((current) => ({ ...current, description: event.target.value }))
                        }
                      />
                    </label>
                    <div className="form-grid">
                      <label htmlFor="course-capacity">
                        容量
                        <input
                          id="course-capacity"
                          name="capacity"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          required
                          title="课程人数上限必须为正整数"
                          value={courseDraft.capacity}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, capacity: event.target.value }))
                          }
                        />
                      </label>
                      <label htmlFor="course-start-date">
                        开课日期
                        <input
                          id="course-start-date"
                          name="startDate"
                          type="date"
                          required
                          title="请选择开课日期"
                          value={courseDraft.startDate}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, startDate: event.target.value }))
                          }
                        />
                      </label>
                      <label htmlFor="course-end-date">
                        结课日期
                        <input
                          id="course-end-date"
                          name="endDate"
                          type="date"
                          required
                          title="请选择结课日期"
                          value={courseDraft.endDate}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, endDate: event.target.value }))
                          }
                        />
                      </label>
                      <label htmlFor="course-status">
                        课程状态
                        <select
                          id="course-status"
                          name="status"
                          value={courseDraft.status}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, status: event.target.value }))
                          }
                        >
                          <option value="not_started">未开始</option>
                          <option value="active">进行中</option>
                          <option value="completed">已完成</option>
                          <option value="suspended">暂停</option>
                        </select>
                      </label>
                    </div>
                    <div className="inline-row">
                      <button className="primary-button" type="submit" disabled={createCourseMutation.isPending}>
                        {createCourseMutation.isPending ? '创建中...' : '创建课程'}
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={!selectedCourse}
                        onClick={() => {
                          if (!selectedCourse) return
                          setCourseDraft({
                            courseCode: selectedCourse.courseCode,
                            courseName: selectedCourse.courseName,
                            teacherId: selectedCourse.teacherId,
                            semester: selectedCourse.semester,
                            description: selectedCourse.description,
                            location: selectedCourse.location,
                            scheduleText: selectedCourse.scheduleText,
                            capacity: String(selectedCourse.capacity),
                            startDate: selectedCourse.startDate ?? '2026-03-01',
                            endDate: selectedCourse.endDate ?? '2026-07-01',
                            status: selectedCourse.status,
                          })
                        }}
                      >
                        载入当前课程
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        disabled={!selectedCourse || updateCourseMutation.isPending}
                        onClick={() => {
                          if (confirmDestructive('确认修改当前课程信息吗？')) {
                            updateCourseMutation.mutate()
                          }
                        }}
                      >
                        {updateCourseMutation.isPending ? '更新中...' : '更新课程'}
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        disabled={!selectedCourse || deleteCourseMutation.isPending}
                        onClick={() => {
                          if (confirmDestructive('确认删除当前课程及其关联数据吗？')) {
                            deleteCourseMutation.mutate()
                          }
                        }}
                      >
                        {deleteCourseMutation.isPending ? '删除中...' : '删除课程'}
                      </button>
                    </div>
                  </form>
                </SectionCard>
              ) : null}
              {showCourseParticipation ? (
                <SectionCard
                  title={currentRole === 'student' ? '课程参与' : '教学安排'}
                  subtitle={
                    currentRole === 'student'
                      ? '加入课程后，可继续查看当前课程下的作业与互动内容。'
                      : '选定课程后，可继续发布作业并组织教学活动。'
                  }
                  className="wide-card"
                >
                  {currentRole === 'student' ? (
                    <>
                      <p className="muted-paragraph">
                        当前选中课程：
                        <strong>{selectedCourse?.courseName ?? '尚未选中课程'}</strong>
                      </p>
                      <button
                        className="primary-button"
                        type="button"
                        disabled={!selectedCourse || enrollMutation.isPending}
                        onClick={() => {
                          if (!selectedCourse) return
                          enrollMutation.mutate(selectedCourse.id)
                        }}
                      >
                        {enrollMutation.isPending ? '处理中...' : '加入当前课程'}
                      </button>
                    </>
                  ) : (
                    <form
                      className="stack-form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        createAssignmentMutation.mutate()
                      }}
                    >
                      <p className="muted-paragraph">
                        选中课程：
                        <strong>{selectedCourse?.courseName ?? '请先在左侧选择课程'}</strong>
                      </p>
                      <label htmlFor="assignment-title">
                        作业标题
                        <input
                          id="assignment-title"
                          name="title"
                          required
                          minLength={2}
                          title="作业标题至少 2 位"
                          value={assignmentDraft.title}
                          onChange={(event) =>
                            setAssignmentDraft((current) => ({ ...current, title: event.target.value }))
                          }
                        />
                      </label>
                      <label htmlFor="assignment-description">
                        作业描述
                        <textarea
                          id="assignment-description"
                          name="description"
                          required
                          minLength={2}
                          title="作业描述至少 2 位"
                          value={assignmentDraft.description}
                          onChange={(event) =>
                            setAssignmentDraft((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label htmlFor="assignment-requirement">
                        作业要求
                        <textarea
                          id="assignment-requirement"
                          name="requirement"
                          required
                          minLength={2}
                          title="作业要求至少 2 位"
                          value={assignmentDraft.requirement}
                          onChange={(event) =>
                            setAssignmentDraft((current) => ({
                              ...current,
                              requirement: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className="form-grid">
                        <label htmlFor="assignment-start-at">
                          开始时间
                          <input
                            id="assignment-start-at"
                            name="startAt"
                            type="datetime-local"
                            required
                            title="请选择开始时间"
                            value={toDateTimeLocalValue(assignmentDraft.startAt)}
                            onChange={(event) =>
                              setAssignmentDraft((current) => ({
                                ...current,
                                startAt: fromDateTimeLocalValue(event.target.value),
                              }))
                            }
                          />
                        </label>
                        <label htmlFor="assignment-due-at">
                          截止时间
                          <input
                            id="assignment-due-at"
                            name="dueAt"
                            type="datetime-local"
                            required
                            title="请选择截止时间"
                            value={toDateTimeLocalValue(assignmentDraft.dueAt)}
                            onChange={(event) =>
                              setAssignmentDraft((current) => ({
                                ...current,
                                dueAt: fromDateTimeLocalValue(event.target.value),
                              }))
                            }
                          />
                        </label>
                      </div>
                      <label htmlFor="assignment-cancel-reason">
                        取消原因
                        <input
                          id="assignment-cancel-reason"
                          name="cancelReason"
                          minLength={2}
                          title="取消作业时需填写至少 2 字的原因"
                          value={assignmentCancelReason}
                          onChange={(event) => setAssignmentCancelReason(event.target.value)}
                        />
                      </label>
                      <div className="inline-row">
                        <button
                          className="primary-button"
                          type="submit"
                          disabled={!selectedCourse || createAssignmentMutation.isPending}
                        >
                          {createAssignmentMutation.isPending ? '发布中...' : '发布作业'}
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={!selectedAssignment}
                          onClick={() => {
                            if (!selectedAssignment) return
                            setAssignmentDraft({
                              title: selectedAssignment.title,
                              description: selectedAssignment.description,
                              requirement: selectedAssignment.requirement,
                              startAt: selectedAssignment.startAt,
                              dueAt: selectedAssignment.dueAt,
                            })
                          }}
                        >
                          载入当前作业
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          disabled={!selectedAssignment || updateAssignmentMutation.isPending}
                          onClick={() => updateAssignmentMutation.mutate()}
                        >
                          {updateAssignmentMutation.isPending ? '更新中...' : '更新作业'}
                        </button>
                        <button
                          className="danger-button"
                          type="button"
                          disabled={!selectedAssignment || cancelAssignmentMutation.isPending}
                          onClick={() => {
                            if (confirmDestructive('确认取消当前作业并清除相关提交记录吗？')) {
                              cancelAssignmentMutation.mutate()
                            }
                          }}
                        >
                          {cancelAssignmentMutation.isPending ? '取消中...' : '取消作业'}
                        </button>
                      </div>
                    </form>
                  )}
                </SectionCard>
              ) : null}
            </div>
            ) : null}

            {showSecondGrid ? (
            <div className="workspace-grid">
              {showCourseFeedbacks ? (
              <SectionCard
                title="课程反馈"
                subtitle="学生提交课程维度反馈，教师和教务员可按课程查看。"
                className="wide-card"
              >
                <p className="muted-paragraph">
                  当前课程：
                  <strong>{selectedCourse?.courseName ?? '未选择课程时显示当前账号可查看的反馈'}</strong>
                </p>

                {currentRole === 'student' ? (
                  <form
                    className="stack-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      createCourseFeedbackMutation.mutate()
                    }}
                  >
                    <div className="form-grid">
                      <label htmlFor="course-feedback-dimension">
                        反馈维度
                        <select
                          id="course-feedback-dimension"
                          name="dimension"
                          required
                          value={courseFeedbackDraft.dimension}
                          onChange={(event) =>
                            setCourseFeedbackDraft((current) => ({
                              ...current,
                              dimension: event.target.value as CourseFeedbackItem['dimension'],
                            }))
                          }
                        >
                          {Object.entries(courseFeedbackDimensionLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label htmlFor="course-feedback-content">
                      课程反馈内容
                      <textarea
                        id="course-feedback-content"
                        name="content"
                        required
                        minLength={2}
                        title="请输入课程反馈内容"
                        value={courseFeedbackDraft.content}
                        onChange={(event) =>
                          setCourseFeedbackDraft((current) => ({
                            ...current,
                            content: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={!selectedCourse || createCourseFeedbackMutation.isPending}
                    >
                      {createCourseFeedbackMutation.isPending ? '提交中...' : '提交课程反馈'}
                    </button>
                  </form>
                ) : null}

                <div className="entity-list">
                  {courseFeedbacksQuery.isLoading ? (
                    <StatePanel title="课程反馈正在加载" detail="正在同步课程反馈。" />
                  ) : courseFeedbacks.length > 0 ? (
                    courseFeedbacks.map((feedback) => (
                      <article key={feedback.id} className="thread-card">
                        <span className="thread-tag">
                          {courseFeedbackDimensionLabels[feedback.dimension]} · {feedback.courseName}
                        </span>
                        <p>{feedback.content}</p>
                        <small>
                          学生：{feedback.studentName ?? feedback.studentId}
                          {feedback.studentNo ? `（${feedback.studentNo}）` : ''}
                        </small>
                        {currentRole === 'student' ? (
                          <div className="inline-row">
                            <button
                              className="ghost-button"
                              type="button"
                              onClick={() =>
                                setCourseFeedbackDraft({
                                  dimension: feedback.dimension,
                                  content: feedback.content,
                                })
                              }
                            >
                              载入反馈
                            </button>
                            <button
                              className="ghost-button"
                              type="button"
                              onClick={() => updateCourseFeedbackMutation.mutate(feedback.id)}
                              disabled={updateCourseFeedbackMutation.isPending}
                            >
                              修改反馈
                            </button>
                            <button
                              className="danger-button"
                              type="button"
                              onClick={() => {
                                if (confirmDestructive('确认删除该课程反馈吗？删除后无法恢复。')) {
                                  deleteCourseFeedbackMutation.mutate(feedback.id)
                                }
                              }}
                              disabled={deleteCourseFeedbackMutation.isPending}
                            >
                              删除反馈
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <StatePanel title="暂无课程反馈" detail="学生提交课程反馈后会在这里展示。" />
                  )}
                </div>
              </SectionCard>
              ) : null}

              {showAssignmentsList ? (
              <SectionCard
                title="作业安排"
                subtitle="查看当前课程下的作业信息与截止时间。"
              >
                <div className="entity-list">
                  {assignmentsQuery.isLoading ? (
                    <StatePanel title="作业正在加载" detail="正在获取当前课程下的作业安排。" />
                  ) : assignments.length > 0 ? (
                    assignments.map((assignment) => (
                      <button
                        key={assignment.id}
                        className={selectedAssignmentId === assignment.id ? 'entity-card active' : 'entity-card'}
                        type="button"
                        onClick={() => {
                          startTransition(() => {
                            setSelectedAssignmentId(assignment.id)
                            setSelectedSubmissionId(assignment.mySubmission?.id ?? assignment.submissionId ?? null)
                            setSubmissionContent(assignment.mySubmission?.content ?? '')
                          })
                        }}
                      >
                        <div>
                          <strong>{assignment.title}</strong>
                          <span>{assignment.status}</span>
                        </div>
                        <p>{assignment.description}</p>
                        <small>截止：{formatDateTimeForDisplay(assignment.dueAt)}</small>
                        {currentRole === 'student' ? (
                          <small>
                            提交状态：{assignment.hasSubmitted ? '已提交' : '未提交'}
                          </small>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <StatePanel
                      title="当前没有作业"
                      detail={selectedCourse ? '该课程暂未发布作业。' : '先选择课程，再查看对应作业安排。'}
                    />
                  )}
                </div>
              </SectionCard>
              ) : null}

              {showAssignmentDetail ? (
              <SectionCard
                title={currentRole === 'teacher' ? '教师任务工作台' : '我的作业'}
                subtitle={
                  currentRole === 'teacher'
                    ? '集中处理待批改提交、待回复反馈与课程反馈。'
                    : '学生在一个页面内完成作业查看、提交与反馈。'
                }
              >
                {currentRole === 'student' ? (
                  <StudentAssignmentWorkspace
                    assignment={selectedAssignment}
                    feedbacks={feedbacks}
                    submissionContent={submissionContent}
                    feedbackKind={feedbackDraft.kind}
                    feedbackContent={feedbackDraft.content}
                    isSubmitting={createSubmissionMutation.isPending}
                    isUpdating={updateSubmissionMutation.isPending}
                    isPostingFeedback={createFeedbackMutation.isPending}
                    onSubmissionContentChange={setSubmissionContent}
                    onSubmitAnswer={() => createSubmissionMutation.mutate()}
                    onUpdateAnswer={() => updateSubmissionMutation.mutate()}
                    onFeedbackKindChange={(kind) => setFeedbackDraft((current) => ({ ...current, kind }))}
                    onFeedbackContentChange={(content) => setFeedbackDraft((current) => ({ ...current, content }))}
                    onPostFeedback={() => createFeedbackMutation.mutate()}
                  />
                ) : (
                  <TeacherTaskWorkspace
                    course={selectedCourse}
                    assignment={selectedAssignment}
                    submissions={submissions}
                    feedbackThreads={feedbackThreads}
                    courseFeedbacks={courseFeedbacks}
                    selectedSubmissionId={selectedSubmissionId}
                    gradeScore={gradeDraft.score}
                    gradeFeedback={gradeDraft.teacherFeedback}
                    responseDraft={responseDraft}
                    isLoadingSubmissions={submissionsQuery.isLoading}
                    isLoadingFeedbackThreads={feedbackThreadsQuery.isLoading}
                    isLoadingCourseFeedbacks={courseFeedbacksQuery.isLoading}
                    isGrading={gradeSubmissionMutation.isPending}
                    isResponding={createResponseMutation.isPending}
                    onSelectSubmission={(submission) => {
                      setSelectedSubmissionId(submission.id)
                      setSubmissionContent(submission.content)
                      setGradeDraft({
                        score: submission.score == null ? '' : String(submission.score),
                        teacherFeedback: submission.teacherFeedback ?? '',
                      })
                    }}
                    onGradeScoreChange={(score) => setGradeDraft((current) => ({ ...current, score }))}
                    onGradeFeedbackChange={(teacherFeedback) =>
                      setGradeDraft((current) => ({ ...current, teacherFeedback }))
                    }
                    onSubmitGrade={() => gradeSubmissionMutation.mutate()}
                    onResponseDraftChange={setResponseDraft}
                    onCreateResponse={(feedbackId) => createResponseMutation.mutate(feedbackId)}
                    onSelectFeedbackThread={(feedback) => {
                      const submission = submissions.find((item) => item.id === feedback.submissionId) ?? null
                      setSubmissionContent(submission?.content ?? '')
                      setGradeDraft({
                        score: submission?.score == null ? '' : String(submission.score),
                        teacherFeedback: submission?.teacherFeedback ?? '',
                      })
                      startTransition(() => {
                        setSelectedCourseId(feedback.courseId ?? selectedCourseId)
                        setSelectedAssignmentId(feedback.assignmentId)
                        setSelectedSubmissionId(feedback.submissionId)
                      })
                    }}
                  />
                )}
              </SectionCard>
              ) : null}
            </div>
            ) : null}

            {showThirdGrid ? (
            <div className="workspace-grid">
              {showInteraction ? (
              <SectionCard
                title="互动交流"
                subtitle="围绕课程学习与作业反馈持续沟通。"
              >
                {currentRole === 'student' ? (
                  <form
                    className="stack-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      createFeedbackMutation.mutate()
                    }}
                  >
                    <div className="form-grid">
                      <label htmlFor="feedback-kind">
                        类型
                        <select
                          id="feedback-kind"
                          name="kind"
                          required
                          value={feedbackDraft.kind}
                          onChange={(event) =>
                            setFeedbackDraft((current) => ({
                              ...current,
                              kind: event.target.value as 'question' | 'feedback',
                            }))
                          }
                        >
                          <option value="question">问题</option>
                          <option value="feedback">反馈</option>
                        </select>
                      </label>
                    </div>
                    <label htmlFor="feedback-content">
                      内容
                      <textarea
                        id="feedback-content"
                        name="content"
                        required
                        minLength={2}
                        title="请输入问题或反馈内容"
                        value={feedbackDraft.content}
                        onChange={(event) =>
                          setFeedbackDraft((current) => ({ ...current, content: event.target.value }))
                        }
                      />
                    </label>
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={!selectedSubmissionId || createFeedbackMutation.isPending}
                    >
                      {createFeedbackMutation.isPending ? '发布中...' : '发布问题/反馈'}
                    </button>
                  </form>
                ) : (
                  <p className="muted-paragraph">
                    教师可在当前留言下直接补充回复，与学生持续交流。
                  </p>
                )}

                <div className="thread-stack">
                  {feedbacksQuery.isLoading ? (
                    <StatePanel title="互动正在加载" detail="正在同步问题、反馈与教师回复。" />
                  ) : feedbacks.length > 0 ? (
                    feedbacks.map((feedback) => (
                      <article key={feedback.id} className="thread-card">
                        <div className="thread-meta">
                          <span>{feedback.kind === 'question' ? '学生问题' : '学生反馈'}</span>
                          <strong>{feedback.status}</strong>
                        </div>
                        <p>{feedback.content}</p>

                        {feedback.responses.map((response) => (
                          <div key={response.id} className="thread-response">
                            <span>教师回复</span>
                            <p>{response.content}</p>
                          </div>
                        ))}

                        {currentRole === 'student' ? (
                          <div className="inline-row">
                            <button
                              className="ghost-button"
                              type="button"
                              onClick={() => {
                                setFeedbackDraft({
                                  kind: feedback.kind,
                                  content: feedback.content,
                                })
                              }}
                            >
                              载入问题/反馈
                            </button>
                            <button
                              className="ghost-button"
                              type="button"
                              disabled={updateFeedbackMutation.isPending}
                              onClick={() => updateFeedbackMutation.mutate(feedback.id)}
                            >
                              修改问题/反馈
                            </button>
                            <button
                              className="danger-button"
                              type="button"
                              disabled={deleteFeedbackMutation.isPending}
                              onClick={() => {
                                if (confirmDestructive('确认删除该问题/反馈吗？删除后无法恢复。')) {
                                  deleteFeedbackMutation.mutate(feedback.id)
                                }
                              }}
                            >
                              删除问题/反馈
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <StatePanel
                      title="还没有互动内容"
                      detail={
                        selectedSubmissionId
                          ? '可以先发布问题或反馈，随后教师会在这里继续回复。'
                          : '先选择一个提交记录，再查看相关互动。'
                      }
                    />
                  )}
                </div>
              </SectionCard>
              ) : null}

              {showCurrentProgress ? (
                <SectionCard
                  title="当前进度"
                  subtitle="帮助你快速查看当前课程、作业与提交状态。"
                  className="current-progress-card"
                >
                  <ul className="bullet-list">
                    <li>课程：{selectedCourse ? `${selectedCourse.courseName} / ${selectedCourse.courseCode}` : '未选择'}</li>
                    <li>作业：{selectedAssignment ? selectedAssignment.title : '未选择'}</li>
                    <li>提交：{selectedSubmission ? selectedSubmission.content : '未选择'}</li>
                    <li>课程状态：{coursesQuery.isFetching ? '更新中' : '已就绪'}</li>
                    <li>作业状态：{assignmentsQuery.isFetching ? '更新中' : '已就绪'}</li>
                    <li>互动状态：{feedbacksQuery.isFetching ? '更新中' : '已就绪'}</li>
                  </ul>
                </SectionCard>
              ) : null}
            </div>
            ) : null}
              </div>
            }
          />
        </Routes>
    </RoleShell>
  )
}

export default App
