import type {
  AdminUserItem,
  AssignmentItem,
  CourseEnrollmentItem,
  CourseFeedbackDimension,
  CourseFeedbackItem,
  CourseFilters,
  CourseItem,
  CourseOptions,
  FeedbackItem,
  FeedbackKind,
  FeedbackThreadFilters,
  Pagination,
  SessionUser,
  SubmissionItem,
  UserRole,
} from './domain'

export type { UserRole } from './domain'

export interface SessionPayload {
  accessToken: string
  refreshToken?: string
  user: SessionUser
}

type RequestOptions = {
  method?: string
  token?: string
  body?: unknown
}

export type ValidationIssue = {
  path: Array<string | number>
  message: string
  code?: string
}

export class ApiError extends Error {
  statusCode: number
  code?: string
  details?: ValidationIssue[]

  constructor(
    message: string,
    statusCode: number,
    options?: { code?: string; details?: ValidationIssue[] },
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = options?.code
    this.details = options?.details
  }
}

// Mobile-friendly Chinese error funnel; mirrors web's utils/errors.ts so the
// two clients show the same copy. Re-exported here to keep existing imports
// (`import { extractErrorMessage } from '../../api'`) working unchanged.
export { extractErrorMessage, friendlyErrorMessage } from './utils/errors'

// App.tsx registers a handler so a 401 from /users/me (because another
// client wiped the session via password change / cancel-account) clears the
// local session and bounces back to login.
let sessionInvalidHandler: ((reason: string) => void) | null = null
export function setSessionInvalidHandler(
  handler: ((reason: string) => void) | null,
) {
  sessionInvalidHandler = handler
}

async function requestJson<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  const hasBody = options.body !== undefined
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const rawDetails = payload?.error?.details
    const details = Array.isArray(rawDetails)
      ? (rawDetails.filter(
          (item): item is ValidationIssue =>
            typeof item === 'object' &&
            item !== null &&
            Array.isArray((item as ValidationIssue).path) &&
            typeof (item as ValidationIssue).message === 'string',
        ) as ValidationIssue[])
      : undefined

    const message = payload.message ?? 'request_failed'
    const code = typeof payload?.error?.code === 'string' ? payload.error.code : undefined

    if (response.status === 401 && options.token && sessionInvalidHandler) {
      sessionInvalidHandler(message)
    }

    throw new ApiError(message, response.status, { code, details })
  }

  return payload.data as T
}

function nullableText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed : null
}

function appendDefinedParams(params: URLSearchParams, values: Record<string, string | number | undefined>) {
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    params.set(key, String(value))
  })
}

export const api = {
  login(baseUrl: string, phone: string, password: string) {
    return requestJson<SessionPayload>(baseUrl, '/auth/login', {
      method: 'POST',
      body: { phone, password },
    })
  },
  requestVerificationCode(
    baseUrl: string,
    phone: string,
    purpose: 'register' | 'reset_password' | 'change_phone' = 'register',
  ) {
    return requestJson<{ previewCode?: string; expiresIn?: number }>(baseUrl, '/auth/verification-code', {
      method: 'POST',
      body: { phone, purpose },
    })
  },
  registerStudent(
    baseUrl: string,
    body: {
      phone: string
      password: string
      confirmPassword: string
      username: string
      realName: string
      studentId: string
      email?: string | null
      gender?: string | null
      college?: string | null
      major?: string | null
      className?: string | null
      verificationCode: string
    },
  ) {
    return requestJson<{ user: { id: string } }>(baseUrl, '/auth/register/student', {
      method: 'POST',
      body: {
        ...body,
        email: nullableText(body.email),
        gender: nullableText(body.gender),
        college: nullableText(body.college),
        major: nullableText(body.major),
        className: nullableText(body.className),
      },
    })
  },
  logout(baseUrl: string, token: string) {
    return requestJson<Record<string, never>>(baseUrl, '/auth/logout', {
      method: 'POST',
      token,
    })
  },
  resetPassword(
    baseUrl: string,
    body: {
      phone: string
      verificationCode: string
      newPassword: string
      confirmPassword: string
    },
  ) {
    return requestJson<Record<string, never>>(baseUrl, '/auth/password/forgot', {
      method: 'POST',
      body,
    })
  },
  changePassword(
    baseUrl: string,
    token: string,
    body: {
      oldPassword: string
      newPassword: string
      confirmPassword: string
    },
  ) {
    return requestJson<Record<string, never>>(baseUrl, '/auth/password/change', {
      method: 'POST',
      token,
      body,
    })
  },
  changePhone(
    baseUrl: string,
    token: string,
    body: {
      oldPhone: string
      oldVerificationCode: string
      newPhone: string
      newVerificationCode: string
    },
  ) {
    return requestJson<{ user: SessionUser }>(baseUrl, '/auth/phone/change', {
      method: 'POST',
      token,
      body,
    })
  },
  cancelAccount(baseUrl: string, token: string) {
    return requestJson<{ user: SessionUser }>(baseUrl, '/auth/cancel-account', {
      method: 'POST',
      token,
    })
  },
  getCurrentUser(baseUrl: string, token: string) {
    return requestJson<{ user: SessionUser }>(baseUrl, '/users/me', {
      token,
    })
  },
  updateProfile(
    baseUrl: string,
    token: string,
    body: {
      username: string
      realName: string
      email?: string | null
      gender?: string | null
      college?: string | null
      major?: string | null
      className?: string | null
    },
  ) {
    return requestJson<{ user: SessionUser }>(baseUrl, '/users/me', {
      method: 'PATCH',
      token,
      body,
    })
  },
  getDashboard(baseUrl: string, token: string, role: UserRole) {
    return requestJson<{ summary: Record<string, number> }>(baseUrl, `/dashboard/${role}`, {
      token,
    })
  },
  listCourses(baseUrl: string, token: string, filters: string | CourseFilters = {}) {
    const params = new URLSearchParams()

    if (typeof filters === 'string') {
      if (filters) params.set('keyword', filters)
    } else {
      appendDefinedParams(params, filters)
    }

    const query = params.toString() ? `?${params.toString()}` : ''
    return requestJson<{ items: CourseItem[] }>(baseUrl, `/courses${query}`, {
      token,
    })
  },
  getCourse(baseUrl: string, token: string, courseId: string) {
    return requestJson<{ course: CourseItem }>(baseUrl, `/courses/${courseId}`, {
      token,
    })
  },
  listCourseOptions(baseUrl: string, token: string) {
    return requestJson<CourseOptions>(baseUrl, '/courses/options', { token })
  },
  createCourse(
    baseUrl: string,
    token: string,
    body: {
      courseCode: string
      courseName: string
      teacherId: string
      semester: string
      description: string
      location: string
      scheduleText: string
      capacity: number
      startDate: string
      endDate: string
    },
  ) {
    return requestJson<{ course: CourseItem }>(baseUrl, '/courses', {
      method: 'POST',
      token,
      body,
    })
  },
  updateCourse(
    baseUrl: string,
    token: string,
    courseId: string,
    body: Partial<{
      courseCode: string
      courseName: string
      teacherId: string
      semester: string
      description: string
      location: string
      scheduleText: string
      capacity: number
      startDate: string
      endDate: string
      suspended: boolean
    }>,
  ) {
    return requestJson<{ course: CourseItem }>(baseUrl, `/courses/${courseId}`, {
      method: 'PATCH',
      token,
      body,
    })
  },
  deleteCourse(baseUrl: string, token: string, courseId: string) {
    return requestJson<{ course: CourseItem }>(baseUrl, `/courses/${courseId}`, {
      method: 'DELETE',
      token,
    })
  },
  enrollCourse(baseUrl: string, token: string, courseId: string) {
    return requestJson<{ enrollment: Record<string, unknown> }>(baseUrl, `/courses/${courseId}/enroll`, {
      method: 'POST',
      token,
    })
  },
  listCourseEnrollments(baseUrl: string, token: string, courseId: string) {
    return requestJson<{ items: CourseEnrollmentItem[] }>(
      baseUrl,
      `/courses/${courseId}/enrollments`,
      { token },
    )
  },
  listAssignments(baseUrl: string, token: string, courseId: string) {
    return requestJson<{ items: AssignmentItem[] }>(
      baseUrl,
      `/courses/${courseId}/assignments`,
      { token },
    )
  },
  createAssignment(
    baseUrl: string,
    token: string,
    courseId: string,
    body: {
      title: string
      description: string
      requirement: string
      startAt: string
      dueAt: string
    },
  ) {
    return requestJson<{ assignment: AssignmentItem }>(
      baseUrl,
      `/courses/${courseId}/assignments`,
      {
        method: 'POST',
        token,
        body,
      },
    )
  },
  updateAssignment(
    baseUrl: string,
    token: string,
    assignmentId: string,
    body: Partial<{
      title: string
      description: string
      requirement: string
      startAt: string
      dueAt: string
    }>,
  ) {
    return requestJson<{ assignment: AssignmentItem }>(
      baseUrl,
      `/assignments/${assignmentId}`,
      {
        method: 'PATCH',
        token,
        body,
      },
    )
  },
  cancelAssignment(baseUrl: string, token: string, assignmentId: string, reason: string) {
    return requestJson<{ assignment: AssignmentItem }>(
      baseUrl,
      `/assignments/${assignmentId}/cancel`,
      {
        method: 'POST',
        token,
        body: { reason },
      },
    )
  },
  listSubmissions(baseUrl: string, token: string, assignmentId: string) {
    return requestJson<{ items: SubmissionItem[] }>(
      baseUrl,
      `/assignments/${assignmentId}/submissions`,
      { token },
    )
  },
  createSubmission(baseUrl: string, token: string, assignmentId: string, content: string) {
    return requestJson<{ submission: SubmissionItem }>(
      baseUrl,
      `/assignments/${assignmentId}/submissions`,
      {
        method: 'POST',
        token,
        body: { content },
      },
    )
  },
  getSubmission(baseUrl: string, token: string, submissionId: string) {
    return requestJson<{ submission: SubmissionItem }>(
      baseUrl,
      `/submissions/${submissionId}`,
      { token },
    )
  },
  updateSubmission(baseUrl: string, token: string, submissionId: string, content: string) {
    return requestJson<{ submission: SubmissionItem }>(
      baseUrl,
      `/submissions/${submissionId}`,
      {
        method: 'PATCH',
        token,
        body: { content },
      },
    )
  },
  gradeSubmission(
    baseUrl: string,
    token: string,
    submissionId: string,
    score: number,
    teacherFeedback: string,
  ) {
    return requestJson<{ submission: SubmissionItem }>(
      baseUrl,
      `/submissions/${submissionId}/grade`,
      {
        method: 'POST',
        token,
        body: { score, teacherFeedback },
      },
    )
  },
  listFeedbacks(baseUrl: string, token: string, submissionId: string) {
    return requestJson<{ items: FeedbackItem[] }>(
      baseUrl,
      `/feedbacks?submissionId=${encodeURIComponent(submissionId)}`,
      { token },
    )
  },
  listFeedbackThreads(
    baseUrl: string,
    token: string,
    filters: FeedbackThreadFilters = {},
  ) {
    const params = new URLSearchParams()
    appendDefinedParams(params, filters)

    const query = params.toString() ? `?${params.toString()}` : ''
    return requestJson<{ items: FeedbackItem[]; pagination?: Pagination }>(
      baseUrl,
      `/feedbacks/threads${query}`,
      { token },
    )
  },
  createFeedback(
    baseUrl: string,
    token: string,
    submissionId: string,
    kind: FeedbackKind,
    content: string,
  ) {
    return requestJson<{ feedback: FeedbackItem }>(
      baseUrl,
      `/submissions/${submissionId}/feedbacks`,
      {
        method: 'POST',
        token,
        body: { kind, content },
      },
    )
  },
  updateFeedback(
    baseUrl: string,
    token: string,
    feedbackId: string,
    kind: FeedbackKind,
    content: string,
  ) {
    return requestJson<{ feedback: FeedbackItem }>(
      baseUrl,
      `/feedbacks/${feedbackId}`,
      {
        method: 'PATCH',
        token,
        body: { kind, content },
      },
    )
  },
  deleteFeedback(baseUrl: string, token: string, feedbackId: string) {
    return requestJson<{ feedback: FeedbackItem }>(
      baseUrl,
      `/feedbacks/${feedbackId}`,
      {
        method: 'DELETE',
        token,
      },
    )
  },
  createResponse(baseUrl: string, token: string, feedbackId: string, content: string) {
    return requestJson<{ response: Record<string, unknown> }>(
      baseUrl,
      `/feedbacks/${feedbackId}/responses`,
      {
        method: 'POST',
        token,
        body: { content },
      },
    )
  },
  updateResponse(baseUrl: string, token: string, responseId: string, content: string) {
    return requestJson<{ response: Record<string, unknown> }>(
      baseUrl,
      `/responses/${responseId}`,
      {
        method: 'PATCH',
        token,
        body: { content },
      },
    )
  },
  deleteResponse(baseUrl: string, token: string, responseId: string) {
    return requestJson<{ response: Record<string, unknown> }>(
      baseUrl,
      `/responses/${responseId}`,
      {
        method: 'DELETE',
        token,
      },
    )
  },
  listCourseFeedbacks(baseUrl: string, token: string, courseId?: string) {
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : ''
    return requestJson<{ items: CourseFeedbackItem[] }>(baseUrl, `/course-feedbacks${query}`, {
      token,
    })
  },
  createCourseFeedback(
    baseUrl: string,
    token: string,
    courseId: string,
    body: {
      dimension: CourseFeedbackDimension
      content: string
    },
  ) {
    return requestJson<{ feedback: CourseFeedbackItem }>(
      baseUrl,
      `/courses/${courseId}/course-feedbacks`,
      {
        method: 'POST',
        token,
        body,
      },
    )
  },
  updateCourseFeedback(
    baseUrl: string,
    token: string,
    feedbackId: string,
    body: {
      dimension: CourseFeedbackDimension
      content: string
    },
  ) {
    return requestJson<{ feedback: CourseFeedbackItem }>(
      baseUrl,
      `/course-feedbacks/${feedbackId}`,
      {
        method: 'PATCH',
        token,
        body,
      },
    )
  },
  deleteCourseFeedback(baseUrl: string, token: string, feedbackId: string) {
    return requestJson<{ feedback: CourseFeedbackItem }>(
      baseUrl,
      `/course-feedbacks/${feedbackId}`,
      {
        method: 'DELETE',
        token,
      },
    )
  },
  listAdminUsers(baseUrl: string, token: string, role?: UserRole) {
    const query = role ? `?role=${encodeURIComponent(role)}` : ''
    return requestJson<{ users: AdminUserItem[] }>(baseUrl, `/users${query}`, {
      token,
    })
  },
  setUserDisabled(baseUrl: string, token: string, userId: string, disabled: boolean) {
    return requestJson<{ user: AdminUserItem }>(
      baseUrl,
      `/users/${userId}/status`,
      {
        method: 'PATCH',
        token,
        body: { disabled },
      },
    )
  },
}
