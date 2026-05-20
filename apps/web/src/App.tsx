import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import './App.css'
import { ApiError, api, type SessionPayload } from './api'
import { RoleShell } from './components/layout/RoleShell'
import { AuthProvider } from './contexts/AuthContext'
import { AccountRoute } from './features/account/AccountRoute'
import { StudentAssignmentsRoute } from './features/assignments/StudentAssignmentsRoute'
import { LoginShell, type AuthMode } from './features/auth/LoginShell'
import { CourseWorkspace } from './features/courseWorkspace/CourseWorkspace'
import { OfficerCourseAssignmentsTab } from './features/courseWorkspace/OfficerCourseAssignmentsTab'
import { OfficerCourseBasicInfoTab } from './features/courseWorkspace/OfficerCourseBasicInfoTab'
import { OfficerCourseOverviewTab } from './features/courseWorkspace/OfficerCourseOverviewTab'
import { StudentAssignmentDetailRoute } from './features/courseWorkspace/StudentAssignmentDetailRoute'
import { StudentCourseAssignmentsTab } from './features/courseWorkspace/StudentCourseAssignmentsTab'
import { StudentCourseFeedbacksOverallTab } from './features/courseWorkspace/StudentCourseFeedbacksOverallTab'
import { StudentCourseFeedbacksTab } from './features/courseWorkspace/StudentCourseFeedbacksTab'
import { StudentCourseOverviewTab } from './features/courseWorkspace/StudentCourseOverviewTab'
import { StudentFeedbackThreadRoute } from './features/courseWorkspace/StudentFeedbackThreadRoute'
import { TeacherAssignmentDetailRoute } from './features/courseWorkspace/TeacherAssignmentDetailRoute'
import { TeacherCourseAssignmentsTab } from './features/courseWorkspace/TeacherCourseAssignmentsTab'
import { TeacherCourseFeedbacksReadonlyTab } from './features/courseWorkspace/TeacherCourseFeedbacksReadonlyTab'
import { TeacherCourseFeedbacksTab } from './features/courseWorkspace/TeacherCourseFeedbacksTab'
import { TeacherCourseOverviewTab } from './features/courseWorkspace/TeacherCourseOverviewTab'
import { TeacherCourseSubmissionsTab } from './features/courseWorkspace/TeacherCourseSubmissionsTab'
import { TeacherFeedbackThreadRoute } from './features/courseWorkspace/TeacherFeedbackThreadRoute'
import { TeacherSubmissionDetailRoute } from './features/courseWorkspace/TeacherSubmissionDetailRoute'
import { StudentCourseListRoute } from './features/courses/StudentCourseListRoute'
import { TeacherCourseListRoute } from './features/courses/TeacherCourseListRoute'
import { DashboardRoute } from './features/dashboard/DashboardRoute'
import { OfficerCourseListRoute } from './features/officer/OfficerCourseListRoute'
import { OfficerGlobalCourseFeedbacksRoute } from './features/officer/OfficerGlobalCourseFeedbacksRoute'
import { OfficerUsersRoute } from './features/officer/OfficerUsersRoute'
import { OfficerUsersTab } from './features/officer/OfficerUsersTab'
import { TeacherAssignmentsRoute } from './features/teacher/TeacherAssignmentsRoute'
import { TeacherTasksRoute } from './features/teacher/TeacherTasksRoute'
import { useNotifications } from './hooks/useNotifications'
import type { UserRole } from './domain'
import { dashboardPath } from './routes/paths'
import { readInitialRuntimeState } from './runtime-state'
import { friendlyErrorMessage } from './utils/errors'

const DEFAULT_API_BASE_URL = 'http://localhost:4100/api/v1'

const ROLE_LABELS: Record<UserRole, string> = {
  student: '学生',
  teacher: '教师',
  officer: '教务员',
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  student: '查看课程安排、提交学习成果，并围绕作业反馈持续交流。',
  teacher: '维护教学节奏、发布作业、处理提交并完成答疑反馈。',
  officer: '统筹课程基础信息，查看平台运行概况与教学状态。',
}

interface NavItem {
  to: string
  label: string
  hint: string
}

const ROLE_NAVIGATION: Record<UserRole, NavItem[]> = {
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

const PAGE_TITLE_PATTERNS: Array<{ test: (path: string) => boolean; title: string }> = [
  { test: (p) => p.endsWith('/dashboard'), title: '工作台' },
  { test: (p) => p === '/student/account' || p === '/teacher/account' || p === '/officer/account', title: '账号维护' },
  { test: (p) => p === '/student/courses' || p === '/teacher/courses' || p === '/officer/courses', title: '课程' },
  { test: (p) => p === '/student/assignments', title: '我的作业' },
  { test: (p) => p === '/teacher/assignments', title: '作业管理' },
  { test: (p) => p === '/teacher/tasks', title: '教学任务' },
  { test: (p) => p === '/officer/course-feedbacks', title: '课程反馈查看' },
  { test: (p) => p.startsWith('/officer/users'), title: '用户管理' },
  { test: (p) => /^\/(student|teacher|officer)\/courses\/[^/]+/.test(p), title: '课程工作区' },
]

function derivePageTitle(pathname: string): string {
  for (const pattern of PAGE_TITLE_PATTERNS) {
    if (pattern.test(pathname)) return pattern.title
  }
  return '工作台'
}

const WORKSPACE_TIPS = [
  '先选择课程，再继续处理作业、提交与互动内容。',
  '教师可围绕当前课程发布作业并查看学生提交。',
  '学生在完成提交后，可继续围绕反馈开展沟通。',
]

const LOGIN_SUPPORT_NOTES = [
  '教师与教务员使用已分配账号登录。',
  '学生注册后可直接进入课程工作区。',
  '账号或密码问题请联系课程管理支持人员。',
]

const LOGIN_GUIDE_NOTES = [
  '统一入口仅用于身份认证，登录后进入课程工作台。',
  '建议在常用电脑浏览器中访问本系统。',
  '若连续输错密码，请联系管理人员处理账号问题。',
]

const STUDENT_COURSE_WORKSPACE_TABS = [
  { to: 'overview', label: '课程概览' },
  { to: 'assignments', label: '作业' },
  { to: 'feedbacks', label: '作业反馈' },
  { to: 'course-feedbacks', label: '课程整体反馈' },
] as const

const TEACHER_COURSE_WORKSPACE_TABS = [
  { to: 'overview', label: '课程概览' },
  { to: 'assignments', label: '作业' },
  { to: 'submissions', label: '提交批改' },
  { to: 'feedbacks', label: '作业反馈' },
  { to: 'course-feedbacks', label: '课程整体反馈' },
] as const

const OFFICER_COURSE_WORKSPACE_TABS = [
  { to: 'overview', label: '课程概览' },
  { to: 'basic-info', label: '基础信息维护' },
  { to: 'assignments', label: '作业概况' },
  { to: 'course-feedbacks', label: '课程反馈查看' },
] as const

function extractErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return friendlyErrorMessage(error.message, error.details)
  }
  if (error instanceof Error) {
    return friendlyErrorMessage(error.message)
  }
  return '请求失败'
}

function App() {
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

  useEffect(() => {
    window.localStorage.setItem('cms_session', JSON.stringify(session))
  }, [session])

  useEffect(() => {
    if (!session) {
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true })
      }
      return
    }
    const role = session.user.role
    const rolePrefix = `/${role}/`
    const hasRolePrefix =
      location.pathname === `/${role}` || location.pathname.startsWith(rolePrefix)
    if (!hasRolePrefix) {
      navigate(dashboardPath(role), { replace: true })
    }
  }, [session, location.pathname, navigate])

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

  const loginMutation = useMutation({
    mutationFn: async () => api.login(apiBaseUrl, loginForm.phone, loginForm.password),
    onSuccess: (payload) => {
      setSession(payload)
      notify({
        type: 'success',
        content: `${ROLE_LABELS[payload.user.role]} ${payload.user.realName}，欢迎回来。`,
      })
      navigate(dashboardPath(payload.user.role), { replace: true })
    },
    onError: (error) => notify({ type: 'error', content: extractErrorMessage(error) }),
  })

  const verificationMutation = useMutation({
    mutationFn: async () => api.requestVerificationCode(apiBaseUrl, registerForm.phone),
    onSuccess: (payload) => {
      if (payload.previewCode) {
        setRegisterForm((current) => ({ ...current, verificationCode: payload.previewCode ?? '' }))
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
      setResetForm({ phone: '', verificationCode: '', newPassword: '', confirmPassword: '' })
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

  if (!session) {
    return (
      <LoginShell
        authMode={authMode}
        notifications={notifications}
        onDismissNotification={dismissNotification}
        supportNotes={LOGIN_SUPPORT_NOTES}
        guideNotes={LOGIN_GUIDE_NOTES}
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

  const role = session.user.role

  return (
    <AuthProvider apiBaseUrl={apiBaseUrl} session={session}>
      <RoleShell
        user={session.user}
        roleLabel={ROLE_LABELS[role]}
        pageTitle={derivePageTitle(location.pathname)}
        roleDescription={ROLE_DESCRIPTIONS[role]}
        navItems={ROLE_NAVIGATION[role]}
        guideTip={WORKSPACE_TIPS[0]}
        notifications={notifications}
        onDismissNotification={dismissNotification}
        onLogout={() => logoutMutation.mutate()}
        isLoggingOut={logoutMutation.isPending}
      >
        <Routes>
          {/* Dashboards + account + cross-course lists shared across roles. */}
          <Route path="/student/dashboard" element={<DashboardRoute />} />
          <Route path="/teacher/dashboard" element={<DashboardRoute />} />
          <Route path="/officer/dashboard" element={<DashboardRoute />} />

          <Route
            path="/student/account"
            element={
              <AccountRoute
                onSessionInvalidated={() => {
                  setSession(null)
                  notify({ type: 'info', content: '账号已注销，后续需重新注册。' })
                }}
                onUpdateUser={(next) =>
                  setSession((current) =>
                    current ? { ...current, user: { ...current.user, ...next } } : current,
                  )
                }
              />
            }
          />
          <Route
            path="/teacher/account"
            element={
              <AccountRoute
                onSessionInvalidated={() => {
                  setSession(null)
                  notify({ type: 'info', content: '账号已注销，后续需重新注册。' })
                }}
                onUpdateUser={(next) =>
                  setSession((current) =>
                    current ? { ...current, user: { ...current.user, ...next } } : current,
                  )
                }
              />
            }
          />
          <Route
            path="/officer/account"
            element={
              <AccountRoute
                onSessionInvalidated={() => {
                  setSession(null)
                  notify({ type: 'info', content: '账号已注销，后续需重新注册。' })
                }}
                onUpdateUser={(next) =>
                  setSession((current) =>
                    current ? { ...current, user: { ...current.user, ...next } } : current,
                  )
                }
              />
            }
          />

          {/* Student space (§2). */}
          <Route path="/student/courses" element={<StudentCourseListRoute />} />
          <Route path="/student/assignments" element={<StudentAssignmentsRoute />} />
          <Route path="/student/courses/:courseId" element={<Navigate to="overview" replace />} />
          <Route
            path="/student/courses/:courseId"
            element={<CourseWorkspace role="student" tabs={STUDENT_COURSE_WORKSPACE_TABS} />}
          >
            <Route path="overview" element={<StudentCourseOverviewTab />} />
            <Route path="assignments" element={<StudentCourseAssignmentsTab />}>
              <Route path=":assignmentId" element={<StudentAssignmentDetailRoute />} />
            </Route>
            <Route path="feedbacks" element={<StudentCourseFeedbacksTab />}>
              <Route path=":feedbackId" element={<StudentFeedbackThreadRoute />} />
            </Route>
            <Route path="course-feedbacks" element={<StudentCourseFeedbacksOverallTab />} />
          </Route>

          {/* Teacher space (§3). */}
          <Route path="/teacher/courses" element={<TeacherCourseListRoute />} />
          <Route path="/teacher/assignments" element={<TeacherAssignmentsRoute />} />
          <Route path="/teacher/tasks" element={<TeacherTasksRoute />} />
          <Route path="/teacher/courses/:courseId" element={<Navigate to="overview" replace />} />
          <Route
            path="/teacher/courses/:courseId"
            element={<CourseWorkspace role="teacher" tabs={TEACHER_COURSE_WORKSPACE_TABS} />}
          >
            <Route path="overview" element={<TeacherCourseOverviewTab />} />
            <Route path="assignments" element={<TeacherCourseAssignmentsTab />}>
              <Route path=":assignmentId" element={<TeacherAssignmentDetailRoute />} />
            </Route>
            <Route path="submissions" element={<TeacherCourseSubmissionsTab />}>
              <Route path=":submissionId" element={<TeacherSubmissionDetailRoute />} />
            </Route>
            <Route path="feedbacks" element={<TeacherCourseFeedbacksTab />}>
              <Route path=":feedbackId" element={<TeacherFeedbackThreadRoute />} />
            </Route>
            <Route path="course-feedbacks" element={<TeacherCourseFeedbacksReadonlyTab />} />
          </Route>

          {/* Officer space (§4). */}
          <Route path="/officer/courses" element={<OfficerCourseListRoute />} />
          <Route path="/officer/course-feedbacks" element={<OfficerGlobalCourseFeedbacksRoute />} />
          <Route path="/officer/courses/:courseId" element={<Navigate to="overview" replace />} />
          <Route
            path="/officer/courses/:courseId"
            element={<CourseWorkspace role="officer" tabs={OFFICER_COURSE_WORKSPACE_TABS} />}
          >
            <Route path="overview" element={<OfficerCourseOverviewTab />} />
            <Route path="basic-info" element={<OfficerCourseBasicInfoTab />} />
            <Route path="assignments" element={<OfficerCourseAssignmentsTab />} />
            <Route path="course-feedbacks" element={<TeacherCourseFeedbacksReadonlyTab />} />
          </Route>
          <Route path="/officer/users" element={<OfficerUsersRoute />}>
            <Route index element={<Navigate to="students" replace />} />
            <Route
              path="students"
              element={
                <OfficerUsersTab
                  role="student"
                  showStatusToggle
                  identityFieldLabel="学号"
                  description="学生账号由学生自助注册。"
                />
              }
            />
            <Route
              path="teachers"
              element={
                <OfficerUsersTab
                  role="teacher"
                  showStatusToggle
                  identityFieldLabel="工号"
                  description="教师账号由系统管理员在初始化阶段通过 seed 预置，不在此处创建。"
                />
              }
            />
            <Route
              path="officers"
              element={
                <OfficerUsersTab
                  role="officer"
                  showStatusToggle={false}
                  identityFieldLabel="账号"
                  description="教务员账号由系统管理员通过 seed 预置，仅做只读查看。"
                />
              }
            />
          </Route>

          {/* Anything else under the current role redirects to the dashboard. */}
          <Route path="*" element={<Navigate to={dashboardPath(role)} replace />} />
        </Routes>
      </RoleShell>
    </AuthProvider>
  )
}

export default App
