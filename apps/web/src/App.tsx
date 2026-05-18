import { startTransition, useDeferredValue, useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import './App.css'
import { ApiError, api, type SessionPayload } from './api'
import { WorkspaceContextBar } from './components/layout/WorkspaceContextBar'
import { StatePanel } from './components/ui/StatePanel'
import { createDefaultAssignmentDates } from './demo-defaults'
import type {
  AssignmentItem,
  CourseFeedbackItem,
  CourseItem,
  FeedbackItem,
  SubmissionItem,
  UserRole,
} from './domain'
import { StudentAssignmentWorkspace } from './features/assignments/StudentAssignmentWorkspace'
import { TeacherTaskWorkspace } from './features/teacher/TeacherTaskWorkspace'
import { readInitialRuntimeState } from './runtime-state'
import { formatDateTimeForDisplay, fromDateTimeLocalValue, toDateTimeLocalValue } from './utils/date'
import { friendlyErrorMessage } from './utils/errors'

const DEFAULT_API_BASE_URL = 'http://localhost:4100/api/v1'

type SummaryRecord = Record<string, number>
type WorkspaceView =
  | 'dashboard'
  | 'courses'
  | 'courseAdmin'
  | 'assignments'
  | 'grading'
  | 'courseFeedbacks'
  | 'interaction'
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

const viewLabels: Record<WorkspaceView, string> = {
  dashboard: '工作台',
  courses: '课程',
  courseAdmin: '课程维护',
  assignments: '作业管理',
  grading: '教师任务',
  courseFeedbacks: '课程反馈',
  interaction: '互动交流',
  account: '账号维护',
}

const roleNavigation: Record<UserRole, Array<{ view: WorkspaceView; label: string; hint: string }>> = {
  student: [
    { view: 'dashboard', label: '工作台', hint: '学习总览' },
    { view: 'courses', label: '课程', hint: '课程检索与加入' },
    { view: 'assignments', label: '我的作业', hint: '查看作业与提交答案' },
    { view: 'courseFeedbacks', label: '课程反馈', hint: '课程维度反馈' },
    { view: 'interaction', label: '互动交流', hint: '问题与教师回复' },
    { view: 'account', label: '账号维护', hint: '资料与安全' },
  ],
  teacher: [
    { view: 'dashboard', label: '工作台', hint: '教学处理总览' },
    { view: 'courses', label: '课程', hint: '授课课程列表' },
    { view: 'assignments', label: '作业管理', hint: '发布与维护作业' },
    { view: 'grading', label: '教师任务', hint: '批改与答疑' },
    { view: 'interaction', label: '待回复反馈', hint: '答疑与回复' },
    { view: 'courseFeedbacks', label: '课程反馈', hint: '学生课程反馈' },
    { view: 'account', label: '账号维护', hint: '资料与安全' },
  ],
  officer: [
    { view: 'dashboard', label: '工作台', hint: '平台运行总览' },
    { view: 'courses', label: '课程列表', hint: '课程查询与详情' },
    { view: 'courseAdmin', label: '课程维护', hint: '创建与修改课程' },
    { view: 'courseFeedbacks', label: '反馈总览', hint: '课程反馈查看' },
    { view: 'account', label: '账号维护', hint: '资料与安全' },
  ],
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
    return friendlyErrorMessage(error.message)
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
  const [initialRuntimeState] = useState(() =>
    readInitialRuntimeState(window.localStorage, DEFAULT_API_BASE_URL),
  )
  const apiBaseUrl = initialRuntimeState.apiBaseUrl
  const [session, setSession] = useState<SessionPayload | null>(initialRuntimeState.session)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login')
  const [activeView, setActiveView] = useState<WorkspaceView>('dashboard')
  const [notice, setNotice] = useState(
    initialRuntimeState.recoveredInvalidSession
      ? '登录状态已更新，请重新登录。'
      : '欢迎使用课程互动平台。',
  )
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
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)
  const [joinedCourseIds, setJoinedCourseIds] = useState<string[]>([])
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
  const currentRole = session?.user.role
  const navItems = currentRole ? roleNavigation[currentRole] : []
  const visibleView = navItems.some((item) => item.view === activeView) ? activeView : 'dashboard'
  const activePageTitle = viewLabels[visibleView]

  useEffect(() => {
    window.localStorage.setItem('cms_session', JSON.stringify(session))
  }, [session])

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
      session?.user.role === 'teacher' && (visibleView === 'grading' || visibleView === 'interaction'),
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
      setNotice(`${roleLabels[payload.user.role]} ${payload.user.realName}，欢迎回来。`)
      startTransition(() => {
        setActiveView('dashboard')
        setSelectedCourseId(null)
        setSelectedAssignmentId(null)
        setSelectedSubmissionId(null)
      })
    },
    onError: (error) => {
      setNotice(extractErrorMessage(error))
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
        setNotice('验证码已自动填入，可继续完成注册。')
      } else {
        setNotice('验证码已发送，请注意查收。')
      }
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const resetCodeMutation = useMutation({
    mutationFn: async () => api.requestVerificationCode(apiBaseUrl, resetForm.phone, 'reset_password'),
    onSuccess: (payload) => {
      setResetForm((current) => ({
        ...current,
        verificationCode: payload.previewCode ?? current.verificationCode,
      }))
      setNotice(payload.previewCode ? '重置验证码已自动填入。' : '重置验证码已发送。')
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async () => api.resetPassword(apiBaseUrl, resetForm),
    onSuccess: () => {
      setNotice('密码已重置，请使用新密码登录。')
      setLoginForm({ phone: resetForm.phone, password: resetForm.newPassword })
      setResetForm({
        phone: '',
        verificationCode: '',
        newPassword: '',
        confirmPassword: '',
      })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const registerMutation = useMutation({
    mutationFn: async () => api.registerStudent(apiBaseUrl, registerForm),
    onSuccess: () => {
      setAuthMode('login')
      setNotice('注册成功，请使用手机号和密码登录。')
      setLoginForm({ phone: registerForm.phone, password: registerForm.password })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
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
      setNotice('个人资料已更新。')
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
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
      setNotice('密码已修改，请妥善保管新密码。')
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
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
      setNotice(`${target === 'old' ? '旧手机号' : '新手机号'}验证码已回填。`)
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
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
      setNotice('手机号已修改。')
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!session) return null
      return api.logout(apiBaseUrl, session.accessToken)
    },
    onSuccess: () => {
      setSession(null)
      setNotice('已退出当前账号。')
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const cancelAccountMutation = useMutation({
    mutationFn: async () => {
      if (!session) return null
      return api.cancelAccount(apiBaseUrl, session.accessToken)
    },
    onSuccess: () => {
      setSession(null)
      setNotice('账号已注销，后续需重新注册。')
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
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
      setNotice(`课程《${String(payload.course.courseName)}》已创建。`)
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      startTransition(() => {
        setSelectedCourseId(String(payload.course.id))
      })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
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
      setNotice(`课程《${String(payload.course.courseName)}》已更新。`)
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const deleteCourseMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedCourseId) return null
      return api.deleteCourse(apiBaseUrl, session.accessToken, selectedCourseId)
    },
    onSuccess: () => {
      setNotice('课程已删除。')
      startTransition(() => {
        setSelectedCourseId(null)
        setSelectedAssignmentId(null)
        setSelectedSubmissionId(null)
      })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!session) return null
      return api.enrollCourse(apiBaseUrl, session.accessToken, courseId)
    },
    onSuccess: (_, courseId) => {
      setJoinedCourseIds((current) => [...new Set([...current, courseId])])
      setNotice('已加入课程，可以开始查看作业与学习内容。')
      startTransition(() => {
        setSelectedCourseId(courseId)
      })
    },
    onError: (error, courseId) => {
      const message = extractErrorMessage(error)

      if (message.includes('ALREADY_ENROLLED') || message.includes('already_enrolled')) {
        setJoinedCourseIds((current) => [...new Set([...current, courseId])])
        setNotice('你已加入该课程。')
        return
      }

      setNotice(message)
    },
  })

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedCourseId) return null
      return api.createAssignment(apiBaseUrl, session.accessToken, selectedCourseId, assignmentDraft)
    },
    onSuccess: (payload) => {
      if (!payload) return
      setNotice(`作业《${String(payload.assignment.title)}》已发布。`)
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      startTransition(() => {
        setSelectedAssignmentId(String(payload.assignment.id))
      })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const updateAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedAssignmentId) return null
      return api.updateAssignment(apiBaseUrl, session.accessToken, selectedAssignmentId, assignmentDraft)
    },
    onSuccess: (payload) => {
      if (!payload) return
      setNotice(`作业《${String(payload.assignment.title)}》已更新。`)
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
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
      setNotice('作业已取消，相关提交已清理。')
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const createSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedAssignmentId) return null
      return api.createSubmission(apiBaseUrl, session.accessToken, selectedAssignmentId, submissionContent)
    },
    onSuccess: (payload) => {
      if (!payload) return
      setNotice('作业已提交。')
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      startTransition(() => {
        setSelectedSubmissionId(String(payload.submission.id))
      })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const updateSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedSubmissionId) return null
      return api.updateSubmission(apiBaseUrl, session.accessToken, selectedSubmissionId, submissionContent)
    },
    onSuccess: () => {
      setNotice('答案已修改。')
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
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
      setNotice('批改结果已保存。')
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
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
      setNotice('留言已提交。')
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const createResponseMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      if (!session) return null
      return api.createResponse(apiBaseUrl, session.accessToken, feedbackId, responseDraft)
    },
    onSuccess: () => {
      setNotice('回复已提交。')
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
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
      setNotice('问题/反馈已修改。')
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      if (!session) return null
      return api.deleteFeedback(apiBaseUrl, session.accessToken, feedbackId)
    },
    onSuccess: () => {
      setNotice('问题/反馈已删除。')
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const updateResponseMutation = useMutation({
    mutationFn: async (responseId: string) => {
      if (!session) return null
      return api.updateResponse(apiBaseUrl, session.accessToken, responseId, responseDraft)
    },
    onSuccess: () => {
      setNotice('回复已修改。')
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const deleteResponseMutation = useMutation({
    mutationFn: async (responseId: string) => {
      if (!session) return null
      return api.deleteResponse(apiBaseUrl, session.accessToken, responseId)
    },
    onSuccess: () => {
      setNotice('回复已删除。')
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const createCourseFeedbackMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedCourseId) return null
      return api.createCourseFeedback(apiBaseUrl, session.accessToken, selectedCourseId, courseFeedbackDraft)
    },
    onSuccess: () => {
      setNotice('课程反馈已提交。')
      queryClient.invalidateQueries({ queryKey: ['courseFeedbacks'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const updateCourseFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      if (!session) return null
      return api.updateCourseFeedback(apiBaseUrl, session.accessToken, feedbackId, courseFeedbackDraft)
    },
    onSuccess: () => {
      setNotice('课程反馈已修改。')
      queryClient.invalidateQueries({ queryKey: ['courseFeedbacks'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const deleteCourseFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      if (!session) return null
      return api.deleteCourseFeedback(apiBaseUrl, session.accessToken, feedbackId)
    },
    onSuccess: () => {
      setNotice('课程反馈已删除。')
      queryClient.invalidateQueries({ queryKey: ['courseFeedbacks'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
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
  const selectedCourse = visibleCourses.find((course) => course.id === selectedCourseId) ?? null
  const selectedAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null
  const selectedSubmission =
    submissions.find((submission) => submission.id === selectedSubmissionId) ??
    selectedAssignment?.mySubmission ??
    null
  const roleDescription = currentRole ? roleWorkspaceDescriptions[currentRole] : '通过统一入口进入课程工作区。'
  const heroHighlights = session
    ? [
        {
          label: currentRole === 'student' ? '已加入课程' : '当前课程数',
          value: currentRole === 'student' ? joinedCourseIds.length : visibleCourses.length,
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
      <div className="login-shell">
        <header className="login-header">
          <div className="login-header-inner">
            <div className="login-header-brand">
              <div className="login-mark">课</div>
              <div className="login-header-copy">
                <p className="login-kicker">统一身份认证</p>
                <h1>课程互动管理系统</h1>
              </div>
            </div>
            <p className="login-header-meta">桌面端认证入口</p>
          </div>
        </header>

        <main className="login-stage">
          <section className="login-card">
            <div className="login-layout">
              <aside className="login-aside">
                <div className="login-aside-head">
                  <span className="login-aside-label">账号服务</span>
                  <strong>统一身份认证</strong>
                  <p>教师、教务员和学生通过同一入口完成认证，登录后进入课程工作区。</p>
                </div>

                <div className="login-support">
                  {loginSupportNotes.map((note) => (
                    <span key={note}>{note}</span>
                  ))}
                </div>

                <ul className="login-guide-list">
                  {loginGuideNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </aside>

              <div className="login-form-column">
                <div className="notice-bar login-notice">{notice}</div>

                <div className="login-panel">
                  <div className="login-panel-head">
                    <div>
                      <p className="eyebrow">身份认证</p>
                      <h2>
                        {authMode === 'login'
                          ? '账号登录'
                          : authMode === 'register'
                            ? '学生注册'
                            : '找回密码'}
                      </h2>
                      <p>
                        {authMode === 'login'
                          ? '输入手机号和密码后进入课程工作台。'
                          : authMode === 'register'
                            ? '完成注册后即可使用学生身份查看课程与提交作业。'
                            : '通过手机号验证码重置密码后返回登录。'}
                      </p>
                    </div>
                  </div>

                  {authMode === 'login' ? (
                    <div className="auth-flow">
                      <form
                        className="stack-form"
                        onSubmit={(event) => {
                          event.preventDefault()
                          loginMutation.mutate()
                        }}
                      >
                        <label>
                          手机号
                          <input
                            autoComplete="username"
                            value={loginForm.phone}
                            onChange={(event) =>
                              setLoginForm((current) => ({ ...current, phone: event.target.value }))
                            }
                          />
                        </label>
                        <label>
                          密码
                          <input
                            autoComplete="current-password"
                            type="password"
                            value={loginForm.password}
                            onChange={(event) =>
                              setLoginForm((current) => ({ ...current, password: event.target.value }))
                            }
                          />
                        </label>
                        <button className="primary-button" type="submit" disabled={loginMutation.isPending}>
                          {loginMutation.isPending ? '登录中...' : '进入工作台'}
                        </button>
                      </form>

                      <div className="auth-entry-row">
                        <button className="link-button" type="button" onClick={() => setAuthMode('reset')}>
                          忘记密码？
                        </button>
                        <span>还没有学生账号？</span>
                        <button className="link-button" type="button" onClick={() => setAuthMode('register')}>
                          学生注册
                        </button>
                      </div>
                    </div>
                  ) : authMode === 'reset' ? (
                    <div className="auth-flow">
                      <form
                        className="stack-form"
                        onSubmit={(event) => {
                          event.preventDefault()
                          resetPasswordMutation.mutate()
                        }}
                      >
                        <p className="muted-paragraph">忘记密码时，可通过手机号验证码重置。</p>
                        <div className="form-grid">
                          <label>
                            手机号
                            <input
                              autoComplete="tel"
                              value={resetForm.phone}
                              onChange={(event) =>
                                setResetForm((current) => ({ ...current, phone: event.target.value }))
                              }
                            />
                          </label>
                          <label>
                            验证码
                            <input
                              autoComplete="one-time-code"
                              value={resetForm.verificationCode}
                              onChange={(event) =>
                                setResetForm((current) => ({
                                  ...current,
                                  verificationCode: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            新密码
                            <input
                              autoComplete="new-password"
                              type="password"
                              value={resetForm.newPassword}
                              onChange={(event) =>
                                setResetForm((current) => ({
                                  ...current,
                                  newPassword: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            确认新密码
                            <input
                              autoComplete="new-password"
                              type="password"
                              value={resetForm.confirmPassword}
                              onChange={(event) =>
                                setResetForm((current) => ({
                                  ...current,
                                  confirmPassword: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>
                        <div className="inline-row">
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={() => resetCodeMutation.mutate()}
                            disabled={resetCodeMutation.isPending}
                          >
                            {resetCodeMutation.isPending ? '发送中...' : '获取重置验证码'}
                          </button>
                          <button
                            className="primary-button"
                            type="submit"
                            disabled={resetPasswordMutation.isPending}
                          >
                            {resetPasswordMutation.isPending ? '重置中...' : '重置密码'}
                          </button>
                        </div>
                      </form>

                      <div className="auth-entry-row">
                        <span>已完成重置或想起密码？</span>
                        <button className="link-button" type="button" onClick={() => setAuthMode('login')}>
                          返回账号登录
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="auth-flow">
                      <form
                        className="stack-form"
                        onSubmit={(event) => {
                          event.preventDefault()
                          registerMutation.mutate()
                        }}
                      >
                        <div className="form-grid">
                          <label>
                            手机号
                            <input
                              autoComplete="tel"
                              value={registerForm.phone}
                              onChange={(event) =>
                                setRegisterForm((current) => ({ ...current, phone: event.target.value }))
                              }
                            />
                          </label>
                          <label>
                            学号
                            <input
                              value={registerForm.studentId}
                              onChange={(event) =>
                                setRegisterForm((current) => ({ ...current, studentId: event.target.value }))
                              }
                            />
                          </label>
                          <label>
                            用户名
                            <input
                              value={registerForm.username}
                              onChange={(event) =>
                                setRegisterForm((current) => ({ ...current, username: event.target.value }))
                              }
                            />
                          </label>
                          <label>
                            真实姓名
                            <input
                              value={registerForm.realName}
                              onChange={(event) =>
                                setRegisterForm((current) => ({ ...current, realName: event.target.value }))
                              }
                            />
                          </label>
                          <label>
                            密码
                            <input
                              autoComplete="new-password"
                              type="password"
                              value={registerForm.password}
                              onChange={(event) =>
                                setRegisterForm((current) => ({ ...current, password: event.target.value }))
                              }
                            />
                          </label>
                          <label>
                            确认密码
                            <input
                              autoComplete="new-password"
                              type="password"
                              value={registerForm.confirmPassword}
                              onChange={(event) =>
                                setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }))
                              }
                            />
                          </label>
                        </div>

                        <div className="inline-row">
                          <label className="grow">
                            验证码
                            <input
                              value={registerForm.verificationCode}
                              onChange={(event) =>
                                setRegisterForm((current) => ({
                                  ...current,
                                  verificationCode: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={() => verificationMutation.mutate()}
                            disabled={verificationMutation.isPending}
                          >
                            {verificationMutation.isPending ? '发送中...' : '获取验证码'}
                          </button>
                        </div>

                        <button className="primary-button" type="submit" disabled={registerMutation.isPending}>
                          {registerMutation.isPending ? '注册中...' : '完成注册'}
                        </button>
                      </form>

                      <div className="auth-entry-row">
                        <span>已有账号？</span>
                        <button className="link-button" type="button" onClick={() => setAuthMode('login')}>
                          返回账号登录
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
          <p className="login-footer">如需账号支持，请联系课程管理支持人员。</p>
        </main>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <aside className="brand-rail app-sidebar">
        <div className="sidebar-brand">
          <div className="brand-crest">
            <span>航</span>
          </div>
          <div>
            <h1>课程互动管理系统</h1>
            <p>{roleLabels[session.user.role]}端</p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Web 端功能导航">
          {navItems.map((item) => (
            <button
              key={item.view}
              className={visibleView === item.view ? 'nav-item active' : 'nav-item'}
              type="button"
              onClick={() => setActiveView(item.view)}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.label.slice(0, 1)}
              </span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="service-dot" />
          <p>平台运行正常</p>
        </div>
        <div className="sidebar-guide">
          <strong>使用指引</strong>
          <p>{workspaceTips[0]}</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-head">
          <div className="workspace-title-block">
            <p className="eyebrow">课程互动管理系统</p>
            <h2>{activePageTitle}</h2>
            <p className="workspace-subcopy">
              {roleDescription}
            </p>
          </div>

          <div className="api-field">
            <span>{session.user.realName}</span>
            <strong>{roleLabels[session.user.role]}</strong>
            <div className="service-pill">
              <span className="service-dot" />
              在线
            </div>
          </div>

          {session ? (
            <button
              className="ghost-button"
              type="button"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? '退出中...' : '退出会话'}
            </button>
          ) : null}
        </header>

        <div className="notice-bar">{notice}</div>
        <WorkspaceContextBar
          context={{ course: selectedCourse, assignment: selectedAssignment, submission: selectedSubmission }}
          courses={visibleCourses}
          assignments={assignments}
          submissions={submissions}
          onCourseChange={(courseId) => {
            startTransition(() => {
              setSelectedCourseId(courseId || null)
              setSelectedAssignmentId(null)
              setSelectedSubmissionId(null)
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
        />

        <div className="dashboard-layout">
            <div className={visibleView === 'dashboard' ? 'hero-banner' : 'hero-banner view-hidden'}>
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

            <div className={visibleView === 'dashboard' ? 'hero-metrics' : 'hero-metrics view-hidden'}>
              {heroHighlights.map((item) => (
                <article key={item.label} className="hero-metric">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>

            <div className={visibleView === 'dashboard' ? 'summary-grid' : 'summary-grid view-hidden'}>
              {Object.entries(dashboardSummary).map(([label, value], index) => (
                <SummaryCard
                  key={label}
                  label={summaryLabels[label] ?? label}
                  value={value}
                  accent={['#005bac', '#1d4ed8', '#d97706', '#9f1239'][index % 4]}
                />
              ))}
            </div>

            <div className="workspace-grid">
              <SectionCard
                title="账号维护"
                subtitle="修改个人资料、密码或注销当前账号。"
                className={visibleView === 'account' ? 'wide-card' : 'view-hidden'}
              >
                <form
                  className="stack-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    updateProfileMutation.mutate()
                  }}
                >
                  <div className="form-grid">
                    <label>
                      用户名
                      <input
                        value={profileDraft.username}
                        onChange={(event) =>
                          setProfileDraft((current) => ({ ...current, username: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      真实姓名
                      <input
                        value={profileDraft.realName}
                        onChange={(event) =>
                          setProfileDraft((current) => ({ ...current, realName: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      邮箱
                      <input
                        value={profileDraft.email}
                        onChange={(event) =>
                          setProfileDraft((current) => ({ ...current, email: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      性别
                      <input
                        value={profileDraft.gender}
                        onChange={(event) =>
                          setProfileDraft((current) => ({ ...current, gender: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      学院
                      <input
                        value={profileDraft.college}
                        onChange={(event) =>
                          setProfileDraft((current) => ({ ...current, college: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      专业
                      <input
                        value={profileDraft.major}
                        onChange={(event) =>
                          setProfileDraft((current) => ({ ...current, major: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      班级
                      <input
                        value={profileDraft.className}
                        onChange={(event) =>
                          setProfileDraft((current) => ({ ...current, className: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? '保存中...' : '保存资料'}
                  </button>
                </form>

                <form
                  className="stack-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    changePasswordMutation.mutate()
                  }}
                >
                  <input
                    autoComplete="username"
                    hidden
                    readOnly
                    value={session.user.phone}
                  />
                  <div className="form-grid">
                    <label>
                      旧密码
                      <input
                        autoComplete="current-password"
                        type="password"
                        value={passwordDraft.oldPassword}
                        onChange={(event) =>
                          setPasswordDraft((current) => ({ ...current, oldPassword: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      新密码
                      <input
                        autoComplete="new-password"
                        type="password"
                        value={passwordDraft.newPassword}
                        onChange={(event) =>
                          setPasswordDraft((current) => ({ ...current, newPassword: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      确认新密码
                      <input
                        autoComplete="new-password"
                        type="password"
                        value={passwordDraft.confirmPassword}
                        onChange={(event) =>
                          setPasswordDraft((current) => ({
                            ...current,
                            confirmPassword: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="inline-row">
                    <button
                      className="ghost-button"
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? '修改中...' : '修改密码'}
                    </button>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => cancelAccountMutation.mutate()}
                      disabled={cancelAccountMutation.isPending}
                    >
                      {cancelAccountMutation.isPending ? '注销中...' : '注销账号'}
                    </button>
                  </div>
                </form>

                <form
                  className="stack-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    changePhoneMutation.mutate()
                  }}
                >
                  <div className="form-grid">
                    <label>
                      旧手机号
                      <input
                        value={phoneDraft.oldPhone}
                        onChange={(event) =>
                          setPhoneDraft((current) => ({ ...current, oldPhone: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      旧手机号验证码
                      <input
                        value={phoneDraft.oldVerificationCode}
                        onChange={(event) =>
                          setPhoneDraft((current) => ({
                            ...current,
                            oldVerificationCode: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label>
                      新手机号
                      <input
                        value={phoneDraft.newPhone}
                        onChange={(event) =>
                          setPhoneDraft((current) => ({ ...current, newPhone: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      新手机号验证码
                      <input
                        value={phoneDraft.newVerificationCode}
                        onChange={(event) =>
                          setPhoneDraft((current) => ({
                            ...current,
                            newVerificationCode: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                  <div className="inline-row">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => phoneCodeMutation.mutate('old')}
                      disabled={phoneCodeMutation.isPending}
                    >
                      获取旧号验证码
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => phoneCodeMutation.mutate('new')}
                      disabled={phoneCodeMutation.isPending}
                    >
                      获取新号验证码
                    </button>
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={changePhoneMutation.isPending}
                    >
                      {changePhoneMutation.isPending ? '修改中...' : '修改手机号'}
                    </button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard
                title="课程列表"
                subtitle="支持搜索、查看与进入对应课程。"
                className={visibleView === 'dashboard' || visibleView === 'courses' ? 'wide-card' : 'view-hidden'}
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
                            setSelectedAssignmentId(null)
                            setSelectedSubmissionId(null)
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
                            {joinedCourseIds.includes(course.id) ? '已加入' : '可加入'}
                          </span>
                        ) : null}
                      </button>
                    ))
                  ) : (
                    <StatePanel title="暂无可展示课程" detail="可以稍后刷新，或由教务员先创建课程信息。" />
                  )}
                </div>
              </SectionCard>

              {currentRole === 'officer' ? (
                <SectionCard
                  title="课程信息维护"
                  subtitle="完善课程基础信息，安排教学时间与授课教师。"
                  className={visibleView === 'courseAdmin' ? 'wide-card' : 'view-hidden'}
                >
                  <form
                    className="stack-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      createCourseMutation.mutate()
                    }}
                  >
                    <div className="form-grid">
                      <label>
                        课程代码
                        <input
                          value={courseDraft.courseCode}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, courseCode: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        课程名称
                        <input
                          value={courseDraft.courseName}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, courseName: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        授课教师编号
                        <input
                          value={courseDraft.teacherId}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, teacherId: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        开课学期
                        <input
                          value={courseDraft.semester}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, semester: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        授课地点
                        <input
                          value={courseDraft.location}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, location: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        上课时间
                        <input
                          value={courseDraft.scheduleText}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, scheduleText: event.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <label>
                      课程简介
                      <textarea
                        value={courseDraft.description}
                        onChange={(event) =>
                          setCourseDraft((current) => ({ ...current, description: event.target.value }))
                        }
                      />
                    </label>
                    <div className="form-grid">
                      <label>
                        容量
                        <input
                          value={courseDraft.capacity}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, capacity: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        开课日期
                        <input
                          value={courseDraft.startDate}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, startDate: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        结课日期
                        <input
                          value={courseDraft.endDate}
                          onChange={(event) =>
                            setCourseDraft((current) => ({ ...current, endDate: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        课程状态
                        <select
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
                          if (window.confirm('确认修改当前课程信息吗？')) {
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
                          if (window.confirm('确认删除当前课程及其关联数据吗？')) {
                            deleteCourseMutation.mutate()
                          }
                        }}
                      >
                        {deleteCourseMutation.isPending ? '删除中...' : '删除课程'}
                      </button>
                    </div>
                  </form>
                </SectionCard>
              ) : (
                <SectionCard
                  title={currentRole === 'student' ? '课程参与' : '教学安排'}
                  subtitle={
                    currentRole === 'student'
                      ? '加入课程后，可继续查看当前课程下的作业与互动内容。'
                      : '选定课程后，可继续发布作业并组织教学活动。'
                  }
                  className={
                    currentRole === 'student'
                      ? visibleView === 'courses'
                        ? 'wide-card'
                        : 'view-hidden'
                      : visibleView === 'assignments'
                        ? 'wide-card'
                        : 'view-hidden'
                  }
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
                      <label>
                        作业标题
                        <input
                          value={assignmentDraft.title}
                          onChange={(event) =>
                            setAssignmentDraft((current) => ({ ...current, title: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        作业描述
                        <textarea
                          value={assignmentDraft.description}
                          onChange={(event) =>
                            setAssignmentDraft((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        作业要求
                        <textarea
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
                        <label>
                          开始时间
                          <input
                            type="datetime-local"
                            value={toDateTimeLocalValue(assignmentDraft.startAt)}
                            onChange={(event) =>
                              setAssignmentDraft((current) => ({
                                ...current,
                                startAt: fromDateTimeLocalValue(event.target.value),
                              }))
                            }
                          />
                        </label>
                        <label>
                          截止时间
                          <input
                            type="datetime-local"
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
                      <label>
                        取消原因
                        <input
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
                            if (window.confirm('确认取消当前作业并清除相关提交记录吗？')) {
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
              )}
            </div>

            <div className="workspace-grid">
              <SectionCard
                title="课程反馈"
                subtitle="学生提交课程维度反馈，教师和教务员可按课程查看。"
                className={
                  visibleView === 'courseFeedbacks' ? 'wide-card' : 'view-hidden'
                }
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
                      <label>
                        反馈维度
                        <select
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
                    <label>
                      课程反馈内容
                      <textarea
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
                        <small>学生：{feedback.studentId}</small>
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
                              onClick={() => deleteCourseFeedbackMutation.mutate(feedback.id)}
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

              <SectionCard
                title="作业安排"
                subtitle="查看当前课程下的作业信息与截止时间。"
                className={visibleView === 'assignments' ? undefined : 'view-hidden'}
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

              <SectionCard
                title={currentRole === 'teacher' ? '教师任务工作台' : '我的作业'}
                subtitle={
                  currentRole === 'teacher'
                    ? '集中处理待批改提交、待回复反馈与课程反馈。'
                    : '学生在一个页面内完成作业查看、提交与反馈。'
                }
                className={
                  currentRole === 'teacher'
                    ? visibleView === 'grading' || visibleView === 'interaction'
                      ? undefined
                      : 'view-hidden'
                    : visibleView === 'assignments'
                      ? undefined
                      : 'view-hidden'
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
                      startTransition(() => {
                        setSelectedCourseId(feedback.courseId ?? selectedCourseId)
                        setSelectedAssignmentId(feedback.assignmentId)
                        setSelectedSubmissionId(feedback.submissionId)
                      })
                    }}
                  />
                )}
              </SectionCard>
            </div>

            <div className="workspace-grid">
              <SectionCard
                title="互动交流"
                subtitle="围绕课程学习与作业反馈持续沟通。"
                className={currentRole === 'teacher' || visibleView !== 'interaction' ? 'view-hidden' : undefined}
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
                      <label>
                        类型
                        <select
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
                    <label>
                      内容
                      <textarea
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
                            {currentRole === 'teacher' ? (
                              <div className="inline-row">
                                <button
                                  className="ghost-button"
                                  type="button"
                                  onClick={() => {
                                    setResponseDraft(response.content)
                                  }}
                                >
                                  载入回复
                                </button>
                                <button
                                  className="ghost-button"
                                  type="button"
                                  disabled={updateResponseMutation.isPending}
                                  onClick={() => updateResponseMutation.mutate(response.id)}
                                >
                                  修改回复
                                </button>
                                <button
                                  className="danger-button"
                                  type="button"
                                  disabled={deleteResponseMutation.isPending}
                                  onClick={() => deleteResponseMutation.mutate(response.id)}
                                >
                                  删除回复
                                </button>
                              </div>
                            ) : null}
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
                              onClick={() => deleteFeedbackMutation.mutate(feedback.id)}
                            >
                              删除问题/反馈
                            </button>
                          </div>
                        ) : null}

                        {currentRole === 'teacher' ? (
                          <form
                            className="inline-form"
                            onSubmit={(event) => {
                              event.preventDefault()
                              createResponseMutation.mutate(feedback.id)
                            }}
                          >
                            <input
                              value={responseDraft}
                              onChange={(event) => setResponseDraft(event.target.value)}
                            />
                            <button
                              className="ghost-button"
                              type="submit"
                              disabled={createResponseMutation.isPending}
                            >
                              回复
                            </button>
                          </form>
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

              <SectionCard
                title="当前进度"
                subtitle="帮助你快速查看当前课程、作业与提交状态。"
                className={
                  visibleView === 'account' || visibleView === 'courseAdmin'
                    ? 'view-hidden'
                    : 'current-progress-card'
                }
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
            </div>
          </div>
      </main>
    </div>
  )
}

export default App
