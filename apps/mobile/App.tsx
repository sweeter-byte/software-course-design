import { useState } from 'react'
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
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, api, type SessionPayload, type UserRole } from './src/api'
import { createDefaultAssignmentDates } from './src/demo-defaults'
import type {
  AssignmentItem,
  CourseFeedbackItem,
  CourseItem,
  FeedbackItem,
  SubmissionItem,
} from './src/domain'

const queryClient = new QueryClient()
const DEFAULT_API_BASE_URL = 'http://localhost:4100/api/v1'

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

function Chip(props: {
  label: string
  active?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable onPress={props.onPress} style={[styles.chip, props.active ? styles.chipActive : null]}>
      <Text style={[styles.chipText, props.active ? styles.chipTextActive : null]}>{props.label}</Text>
    </Pressable>
  )
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

function Workspace() {
  const queryClient = useQueryClient()
  const confirmAction = (title: string, message: string, action: () => void) => {
    Alert.alert(title, message, [
      { text: '取消', style: 'cancel' },
      { text: '确认', style: 'destructive', onPress: action },
    ])
  }
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL)
  const [notice, setNotice] = useState('输入可访问后端的地址。Android 模拟器可改为 http://10.0.2.2:4100/api/v1')
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login')
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
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)
  const [courseDraft, setCourseDraft] = useState({
    courseCode: 'SE-5002',
    courseName: '移动端课程互动',
    teacherId: 'teacher-demo-001',
    semester: '2026 春',
    description: '面向移动端的课程互动工作台。',
    location: '将军路校区 B302',
    scheduleText: '周四 10:00-11:35',
    capacity: '50',
    startDate: '2026-03-01',
    endDate: '2026-07-01',
    status: 'not_started',
  })
  const [assignmentDraft, setAssignmentDraft] = useState(() => ({
    title: '移动端作业',
    description: '整理移动端交互流程。',
    requirement: '提交页面流和说明。',
    ...createDefaultAssignmentDates(),
  }))
  const [assignmentCancelReason, setAssignmentCancelReason] = useState('教学计划调整，取消本次作业。')
  const [submissionContent, setSubmissionContent] = useState('已完成移动端交互流程与页面关系说明。')
  const [gradeDraft, setGradeDraft] = useState({
    score: '91',
    teacherFeedback: '交互路径清楚，可以补强空状态说明。',
  })
  const [feedbackDraft, setFeedbackDraft] = useState({
    kind: 'question' as 'question' | 'feedback',
    content: '移动端是否也需要单独处理接口超时空态？',
  })
  const [responseDraft, setResponseDraft] = useState('需要，建议增加顶部提示和重试按钮。')
  const [courseFeedbackDraft, setCourseFeedbackDraft] = useState({
    dimension: 'teaching' as CourseFeedbackItem['dimension'],
    content: '移动端查看课程安排很方便，希望增加更多案例。',
  })

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

  const assignmentsQuery = useQuery({
    enabled: Boolean(session && selectedCourseId),
    queryKey: ['mobile-assignments', apiBaseUrl, session?.accessToken, selectedCourseId],
    queryFn: async () => {
      if (!session || !selectedCourseId) return { items: [] as AssignmentItem[] }
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, selectedCourseId)
      return { items: payload.items as AssignmentItem[] }
    },
  })

  const submissionsQuery = useQuery({
    enabled: Boolean(session?.user.role === 'teacher' && selectedAssignmentId),
    queryKey: ['mobile-submissions', apiBaseUrl, session?.accessToken, selectedAssignmentId],
    queryFn: async () => {
      if (!session || !selectedAssignmentId) return { items: [] as SubmissionItem[] }
      const payload = await api.listSubmissions(apiBaseUrl, session.accessToken, selectedAssignmentId)
      return { items: payload.items as SubmissionItem[] }
    },
  })

  const feedbacksQuery = useQuery({
    enabled: Boolean(session && selectedSubmissionId),
    queryKey: ['mobile-feedbacks', apiBaseUrl, session?.accessToken, selectedSubmissionId],
    queryFn: async () => {
      if (!session || !selectedSubmissionId) return { items: [] as FeedbackItem[] }
      const payload = await api.listFeedbacks(apiBaseUrl, session.accessToken, selectedSubmissionId)
      return { items: payload.items as FeedbackItem[] }
    },
  })

  const courseFeedbacksQuery = useQuery({
    enabled: Boolean(session),
    queryKey: ['mobile-course-feedbacks', apiBaseUrl, session?.accessToken, selectedCourseId],
    queryFn: async () => {
      if (!session) return { items: [] as CourseFeedbackItem[] }
      const payload = await api.listCourseFeedbacks(apiBaseUrl, session.accessToken, selectedCourseId ?? undefined)
      return { items: payload.items as CourseFeedbackItem[] }
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
      setNotice(`${roleLabels[payload.user.role]} ${payload.user.realName} 已登录移动端。`)
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
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
    onError: (error) => setNotice(extractErrorMessage(error)),
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
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async () => api.resetPassword(apiBaseUrl, resetForm),
    onSuccess: () => {
      setLoginForm({ phone: resetForm.phone, password: resetForm.newPassword })
      setAuthMode('login')
      setResetForm({
        phone: '',
        verificationCode: '',
        newPassword: '',
        confirmPassword: '',
      })
      setNotice('密码已重置，可直接登录。')
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const registerMutation = useMutation({
    mutationFn: async () => api.registerStudent(apiBaseUrl, registerForm),
    onSuccess: () => {
      setAuthMode('login')
      setNotice('注册成功，请返回登录。')
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
      setSession((current) =>
        current
          ? {
              ...current,
              user: {
                ...current.user,
                username: String(payload.user.username),
                realName: String(payload.user.realName),
              },
            }
          : current,
      )
      setNotice('资料已更新。')
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
      setNotice('密码已修改。')
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
      setNotice('已退出当前会话。')
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
      setNotice(
        previewCode
          ? `${target === 'old' ? '旧手机号' : '新手机号'}验证码已回填。`
          : `${target === 'old' ? '旧手机号' : '新手机号'}验证码已发送。`,
      )
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

  const cancelAccountMutation = useMutation({
    mutationFn: async () => {
      if (!session) return null
      return api.cancelAccount(apiBaseUrl, session.accessToken)
    },
    onSuccess: () => {
      setSession(null)
      setNotice('账号已注销。')
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
      setSelectedCourseId(String(payload.course.id))
      setNotice('课程已创建。')
      queryClient.invalidateQueries({ queryKey: ['mobile-courses'] })
      queryClient.invalidateQueries({ queryKey: ['mobile-dashboard'] })
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
    onSuccess: () => {
      setNotice('课程已更新。')
      queryClient.invalidateQueries({ queryKey: ['mobile-courses'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const deleteCourseMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedCourseId) return null
      return api.deleteCourse(apiBaseUrl, session.accessToken, selectedCourseId)
    },
    onSuccess: () => {
      setSelectedCourseId(null)
      setSelectedAssignmentId(null)
      setSelectedSubmissionId(null)
      setNotice('课程已删除。')
      queryClient.invalidateQueries({ queryKey: ['mobile-courses'] })
      queryClient.invalidateQueries({ queryKey: ['mobile-dashboard'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!session) return null
      return api.enrollCourse(apiBaseUrl, session.accessToken, courseId)
    },
    onSuccess: (_, courseId) => {
      setSelectedCourseId(courseId)
      setNotice('已加入课程。')
      queryClient.invalidateQueries({ queryKey: ['mobile-courses'] })
      queryClient.invalidateQueries({ queryKey: ['mobile-dashboard'] })
    },
    onError: (error) => {
      const message = extractErrorMessage(error)
      if (
        error instanceof ApiError &&
        (error.code === 'ALREADY_ENROLLED' || error.message === 'already_enrolled')
      ) {
        setNotice('课程已加入。')
        queryClient.invalidateQueries({ queryKey: ['mobile-courses'] })
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
      setSelectedAssignmentId(String(payload.assignment.id))
      setNotice('作业已发布。')
      queryClient.invalidateQueries({ queryKey: ['mobile-assignments'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const updateAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedAssignmentId) return null
      return api.updateAssignment(apiBaseUrl, session.accessToken, selectedAssignmentId, assignmentDraft)
    },
    onSuccess: () => {
      setNotice('作业已更新。')
      queryClient.invalidateQueries({ queryKey: ['mobile-assignments'] })
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
      setNotice('作业已取消。')
      queryClient.invalidateQueries({ queryKey: ['mobile-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['mobile-submissions'] })
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
      setSelectedSubmissionId(String(payload.submission.id))
      setNotice('答案已提交。')
      queryClient.invalidateQueries({ queryKey: ['mobile-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['mobile-dashboard'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const getSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!session || !selectedSubmissionId) return null
      return api.getSubmission(apiBaseUrl, session.accessToken, selectedSubmissionId)
    },
    onSuccess: (payload) => {
      if (!payload) return
      const submission = payload.submission
      setSubmissionContent(String(submission.content))
      setNotice(`提交状态：${String(submission.status)}，分数：${submission.score ?? '未批改'}`)
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
      queryClient.invalidateQueries({ queryKey: ['mobile-submissions'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const gradeMutation = useMutation({
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
      setNotice('批改结果已写回。')
      queryClient.invalidateQueries({ queryKey: ['mobile-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['mobile-feedbacks'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const feedbackMutation = useMutation({
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
      setNotice('反馈已发布。')
      queryClient.invalidateQueries({ queryKey: ['mobile-feedbacks'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const responseMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      if (!session) return null
      return api.createResponse(apiBaseUrl, session.accessToken, feedbackId, responseDraft)
    },
    onSuccess: () => {
      setNotice('回复已发送。')
      queryClient.invalidateQueries({ queryKey: ['mobile-feedbacks'] })
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
      setNotice('反馈已修改。')
      queryClient.invalidateQueries({ queryKey: ['mobile-feedbacks'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      if (!session) return null
      return api.deleteFeedback(apiBaseUrl, session.accessToken, feedbackId)
    },
    onSuccess: () => {
      setNotice('反馈已删除。')
      queryClient.invalidateQueries({ queryKey: ['mobile-feedbacks'] })
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
      queryClient.invalidateQueries({ queryKey: ['mobile-feedbacks'] })
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
      queryClient.invalidateQueries({ queryKey: ['mobile-feedbacks'] })
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
      queryClient.invalidateQueries({ queryKey: ['mobile-course-feedbacks'] })
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
      queryClient.invalidateQueries({ queryKey: ['mobile-course-feedbacks'] })
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
      queryClient.invalidateQueries({ queryKey: ['mobile-course-feedbacks'] })
    },
    onError: (error) => setNotice(extractErrorMessage(error)),
  })

  const courses = (coursesQuery.data?.items ?? []) as CourseItem[]
  const assignments = (assignmentsQuery.data?.items ?? []) as AssignmentItem[]
  const submissions = (submissionsQuery.data?.items ?? []) as SubmissionItem[]
  const feedbacks = (feedbacksQuery.data?.items ?? []) as FeedbackItem[]
  const courseFeedbacks = (courseFeedbacksQuery.data?.items ?? []) as CourseFeedbackItem[]
  const currentRole = session?.user.role
  const visibleCourses =
    currentRole === 'teacher'
      ? courses.filter((course) => course.teacherId === session?.user.id)
      : courses
  const selectedCourse = visibleCourses.find((course) => course.id === selectedCourseId) ?? null
  const selectedAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
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
            不是网页压缩版，而是围绕“当前课、当前作业、当前线程”的移动端业务视图。
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.notice}>{notice}</Text>
          <Field label="API Base URL" value={apiBaseUrl} onChangeText={setApiBaseUrl} />
        </View>

        {!session ? (
          <View style={styles.card}>
            <View style={styles.authHeader}>
              <Text style={styles.sectionTitle}>
                {authMode === 'login' ? '账号登录' : authMode === 'register' ? '学生注册' : '找回密码'}
              </Text>
              <Text style={styles.helper}>
                {authMode === 'login'
                  ? '使用 Web 端同一账号体系，移动端刷新后可同步课程、作业和反馈数据。'
                  : authMode === 'register'
                    ? '学生完成手机号验证后即可使用移动端课程互动功能。'
                    : '通过手机号验证码重置密码，完成后返回登录页。'}
              </Text>
            </View>

            {authMode === 'login' ? (
              <>
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
                  <Pressable style={styles.linkButton} onPress={() => setAuthMode('reset')}>
                    <Text style={styles.linkButtonText}>忘记密码？</Text>
                  </Pressable>
                  <Text style={styles.helper}>还没有学生账号？</Text>
                  <Pressable style={styles.linkButton} onPress={() => setAuthMode('register')}>
                    <Text style={styles.linkButtonText}>学生注册</Text>
                  </Pressable>
                </View>
              </>
            ) : authMode === 'reset' ? (
              <>
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
                  <Pressable style={styles.primaryButton} onPress={() => resetPasswordMutation.mutate()}>
                    <Text style={styles.primaryText}>重置密码</Text>
                  </Pressable>
                </View>
                <View style={styles.authEntryRow}>
                  <Pressable style={styles.linkButton} onPress={() => setAuthMode('login')}>
                    <Text style={styles.linkButtonText}>返回账号登录</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
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
                  <Pressable style={styles.primaryButton} onPress={() => registerMutation.mutate()}>
                    <Text style={styles.primaryText}>注册</Text>
                  </Pressable>
                </View>
                <View style={styles.authEntryRow}>
                  <Text style={styles.helper}>已有账号？</Text>
                  <Pressable style={styles.linkButton} onPress={() => setAuthMode('login')}>
                    <Text style={styles.linkButtonText}>返回账号登录</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sessionTitle}>
                {session.user.realName} · {roleLabels[session.user.role]}
              </Text>
              <Text style={styles.helper}>当前账号：{session.user.phone}</Text>
              <View style={styles.summaryRow}>
                {Object.entries(dashboardQuery.data?.summary ?? {}).map(([label, value], index) => (
                  <SummaryBadge
                    key={label}
                    label={label}
                    value={value}
                    accent={['#005bac', '#159447', '#d97706', '#dc2626'][index % 4]}
                  />
                ))}
              </View>
              <Pressable style={styles.secondaryButton} onPress={() => logoutMutation.mutate()}>
                <Text style={styles.secondaryText}>退出当前会话</Text>
              </Pressable>
            </View>

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
                <Pressable style={styles.dangerButton} onPress={() => cancelAccountMutation.mutate()}>
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
              <Text style={styles.sectionTitle}>课程池</Text>
              <View style={styles.chipRow}>
                {visibleCourses.map((course) => (
                  <Chip
                    key={course.id}
                    label={course.courseCode}
                    active={selectedCourseId === course.id}
                    onPress={() => {
                      setSelectedCourseId(course.id)
                      setSelectedAssignmentId(null)
                      setSelectedSubmissionId(null)
                    }}
                  />
                ))}
              </View>

              {currentRole === 'student' && selectedCourseId ? (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => enrollMutation.mutate(selectedCourseId)}
                >
                  <Text style={styles.primaryText}>
                    {selectedCourse?.enrolled ? '已加入当前课程' : '加入当前课程'}
                  </Text>
                </Pressable>
              ) : null}

              {currentRole === 'officer' ? (
                <>
                  <Text style={styles.sectionTitle}>课程创建</Text>
                  <Field label="课程代码" value={courseDraft.courseCode} onChangeText={(value) => setCourseDraft((current) => ({ ...current, courseCode: value }))} />
                  <Field label="课程名称" value={courseDraft.courseName} onChangeText={(value) => setCourseDraft((current) => ({ ...current, courseName: value }))} />
                  <Field label="教师 ID" value={courseDraft.teacherId} onChangeText={(value) => setCourseDraft((current) => ({ ...current, teacherId: value }))} />
                  <Field label="课程简介" value={courseDraft.description} multiline onChangeText={(value) => setCourseDraft((current) => ({ ...current, description: value }))} />
                  <Pressable style={styles.primaryButton} onPress={() => createCourseMutation.mutate()}>
                    <Text style={styles.primaryText}>创建课程</Text>
                  </Pressable>
                  <View style={styles.buttonRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        if (!selectedCourse) return
                        setCourseDraft({
                          courseCode: selectedCourse.courseCode,
                          courseName: selectedCourse.courseName,
                          teacherId: selectedCourse.teacherId,
                          semester: selectedCourse.semester,
                          description: selectedCourse.description,
                          location: selectedCourse.location,
                          scheduleText: selectedCourse.scheduleText,
                          capacity: String(selectedCourse.capacity ?? 50),
                          startDate: selectedCourse.startDate ?? '2026-03-01',
                          endDate: selectedCourse.endDate ?? '2026-07-01',
                          status: selectedCourse.status,
                        })
                      }}
                    >
                      <Text style={styles.secondaryText}>载入当前课程</Text>
                    </Pressable>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() =>
                        confirmAction('确认修改课程', '确认修改当前课程信息吗？', () =>
                          updateCourseMutation.mutate(),
                        )
                      }
                    >
                      <Text style={styles.secondaryText}>更新课程</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={styles.dangerButton}
                    onPress={() =>
                      confirmAction('确认删除课程', '确认删除当前课程及其关联数据吗？', () =>
                        deleteCourseMutation.mutate(),
                      )
                    }
                  >
                    <Text style={styles.dangerText}>删除当前课程</Text>
                  </Pressable>
                </>
              ) : null}

              {currentRole === 'teacher' ? (
                <>
                  <Text style={styles.sectionTitle}>发布作业</Text>
                  <Field label="标题" value={assignmentDraft.title} onChangeText={(value) => setAssignmentDraft((current) => ({ ...current, title: value }))} />
                  <Field label="描述" value={assignmentDraft.description} multiline onChangeText={(value) => setAssignmentDraft((current) => ({ ...current, description: value }))} />
                  <Field label="要求" value={assignmentDraft.requirement} multiline onChangeText={(value) => setAssignmentDraft((current) => ({ ...current, requirement: value }))} />
                  <Field label="取消原因" value={assignmentCancelReason} onChangeText={setAssignmentCancelReason} />
                  <Pressable style={styles.primaryButton} onPress={() => createAssignmentMutation.mutate()}>
                    <Text style={styles.primaryText}>发布到当前课程</Text>
                  </Pressable>
                  <View style={styles.buttonRow}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => {
                        if (!selectedAssignment) return
                        setAssignmentDraft({
                          title: selectedAssignment.title,
                          description: selectedAssignment.description,
                          requirement: selectedAssignment.requirement,
                          startAt: '2026-04-24T08:00:00.000Z',
                          dueAt: selectedAssignment.dueAt,
                        })
                      }}
                    >
                      <Text style={styles.secondaryText}>载入作业</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryButton} onPress={() => updateAssignmentMutation.mutate()}>
                      <Text style={styles.secondaryText}>更新作业</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={styles.dangerButton}
                    onPress={() =>
                      confirmAction('确认取消作业', '确认取消当前作业并清除相关提交记录吗？', () =>
                        cancelAssignmentMutation.mutate(),
                      )
                    }
                  >
                    <Text style={styles.dangerText}>取消当前作业</Text>
                  </Pressable>
                </>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>课程反馈</Text>
              <Text style={styles.helper}>
                当前课程：{selectedCourse?.courseName ?? '未选择课程时显示当前账号可查看的反馈'}
              </Text>
              {currentRole === 'student' ? (
                <>
                  <View style={styles.chipRow}>
                    {(Object.keys(courseFeedbackDimensionLabels) as CourseFeedbackItem['dimension'][]).map((dimension) => (
                      <Chip
                        key={dimension}
                        label={courseFeedbackDimensionLabels[dimension]}
                        active={courseFeedbackDraft.dimension === dimension}
                        onPress={() => setCourseFeedbackDraft((current) => ({ ...current, dimension }))}
                      />
                    ))}
                  </View>
                  <Field
                    label="课程反馈内容"
                    value={courseFeedbackDraft.content}
                    multiline
                    onChangeText={(value) =>
                      setCourseFeedbackDraft((current) => ({ ...current, content: value }))
                    }
                  />
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => createCourseFeedbackMutation.mutate()}
                  >
                    <Text style={styles.primaryText}>提交课程反馈</Text>
                  </Pressable>
                </>
              ) : null}

              <View style={styles.listBlock}>
                {courseFeedbacks.map((feedback) => (
                  <View key={feedback.id} style={styles.threadCard}>
                    <Text style={styles.threadTag}>
                      {courseFeedbackDimensionLabels[feedback.dimension]} · {feedback.courseName}
                    </Text>
                    <Text style={styles.threadContent}>{feedback.content}</Text>
                    <Text style={styles.helper}>学生：{feedback.studentId}</Text>
                    {currentRole === 'student' ? (
                      <View style={styles.buttonRow}>
                        <Pressable
                          style={styles.secondaryButton}
                          onPress={() =>
                            setCourseFeedbackDraft({
                              dimension: feedback.dimension,
                              content: feedback.content,
                            })
                          }
                        >
                          <Text style={styles.secondaryText}>载入</Text>
                        </Pressable>
                        <Pressable
                          style={styles.secondaryButton}
                          onPress={() => updateCourseFeedbackMutation.mutate(feedback.id)}
                        >
                          <Text style={styles.secondaryText}>修改</Text>
                        </Pressable>
                        <Pressable
                          style={styles.dangerButton}
                          onPress={() => deleteCourseFeedbackMutation.mutate(feedback.id)}
                        >
                          <Text style={styles.dangerText}>删除</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>作业与提交</Text>
              <View style={styles.chipRow}>
                {assignments.map((assignment) => (
                  <Chip
                    key={assignment.id}
                    label={assignment.title}
                    active={selectedAssignmentId === assignment.id}
                    onPress={() => {
                      setSelectedAssignmentId(assignment.id)
                      setSelectedSubmissionId(null)
                    }}
                  />
                ))}
              </View>
              {currentRole === 'student' && selectedAssignment ? (
                <Text style={styles.helper}>
                  提交状态：{selectedAssignment.hasSubmitted ? '已提交' : '未提交'}
                </Text>
              ) : null}

              {currentRole === 'student' ? (
                <>
                  <Field label="提交内容" value={submissionContent} multiline onChangeText={setSubmissionContent} />
                  <Pressable style={styles.primaryButton} onPress={() => createSubmissionMutation.mutate()}>
                    <Text style={styles.primaryText}>提交当前作业</Text>
                  </Pressable>
                  <View style={styles.buttonRow}>
                    <Pressable style={styles.secondaryButton} onPress={() => getSubmissionMutation.mutate()}>
                      <Text style={styles.secondaryText}>查看提交</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryButton} onPress={() => updateSubmissionMutation.mutate()}>
                      <Text style={styles.secondaryText}>修改答案</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.listBlock}>
                    {submissions.map((submission) => (
                      <Pressable
                        key={submission.id}
                        style={[styles.listItem, selectedSubmissionId === submission.id ? styles.listItemActive : null]}
                        onPress={() => setSelectedSubmissionId(submission.id)}
                      >
                        <Text style={styles.listItemTitle}>{submission.studentId}</Text>
                        <Text style={styles.listItemCopy}>{submission.content}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Field label="分数" value={gradeDraft.score} onChangeText={(value) => setGradeDraft((current) => ({ ...current, score: value }))} />
                  <Field label="评语" value={gradeDraft.teacherFeedback} multiline onChangeText={(value) => setGradeDraft((current) => ({ ...current, teacherFeedback: value }))} />
                  <Pressable style={styles.primaryButton} onPress={() => gradeMutation.mutate()}>
                    <Text style={styles.primaryText}>批改当前提交</Text>
                  </Pressable>
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>反馈线程</Text>
              {currentRole === 'student' ? (
                <>
                  <View style={styles.chipRow}>
                    <Chip label="问题" active={feedbackDraft.kind === 'question'} onPress={() => setFeedbackDraft((current) => ({ ...current, kind: 'question' }))} />
                    <Chip label="反馈" active={feedbackDraft.kind === 'feedback'} onPress={() => setFeedbackDraft((current) => ({ ...current, kind: 'feedback' }))} />
                  </View>
                  <Field label="内容" value={feedbackDraft.content} multiline onChangeText={(value) => setFeedbackDraft((current) => ({ ...current, content: value }))} />
                  <Pressable style={styles.primaryButton} onPress={() => feedbackMutation.mutate()}>
                    <Text style={styles.primaryText}>发布到当前线程</Text>
                  </Pressable>
                </>
              ) : null}

              {feedbacks.map((feedback) => (
                <View key={feedback.id} style={styles.threadCard}>
                  <Text style={styles.threadTag}>{feedback.kind === 'question' ? '学生问题' : '学生反馈'}</Text>
                  <Text style={styles.threadContent}>{feedback.content}</Text>
                  {feedback.responses.map((response) => (
                    <View key={response.id} style={styles.responseBubble}>
                      <Text style={styles.responseTag}>教师回复</Text>
                      <Text style={styles.responseText}>{response.content}</Text>
                      {currentRole === 'teacher' ? (
                        <View style={styles.buttonRow}>
                          <Pressable style={styles.secondaryButton} onPress={() => setResponseDraft(response.content)}>
                            <Text style={styles.secondaryText}>载入回复</Text>
                          </Pressable>
                          <Pressable style={styles.secondaryButton} onPress={() => updateResponseMutation.mutate(response.id)}>
                            <Text style={styles.secondaryText}>修改回复</Text>
                          </Pressable>
                          <Pressable style={styles.dangerButton} onPress={() => deleteResponseMutation.mutate(response.id)}>
                            <Text style={styles.dangerText}>删除回复</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  ))}
                  {currentRole === 'student' ? (
                    <View style={styles.buttonRow}>
                      <Pressable
                        style={styles.secondaryButton}
                        onPress={() => setFeedbackDraft({ kind: feedback.kind, content: feedback.content })}
                      >
                        <Text style={styles.secondaryText}>载入反馈</Text>
                      </Pressable>
                      <Pressable style={styles.secondaryButton} onPress={() => updateFeedbackMutation.mutate(feedback.id)}>
                        <Text style={styles.secondaryText}>修改反馈</Text>
                      </Pressable>
                      <Pressable style={styles.dangerButton} onPress={() => deleteFeedbackMutation.mutate(feedback.id)}>
                        <Text style={styles.dangerText}>删除反馈</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {currentRole === 'teacher' ? (
                    <View style={styles.inlineComposer}>
                      <TextInput style={styles.inlineInput} value={responseDraft} onChangeText={setResponseDraft} />
                      <Pressable style={styles.secondaryButton} onPress={() => responseMutation.mutate(feedback.id)}>
                        <Text style={styles.secondaryText}>回复</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
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
  summaryCard: {
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
})
