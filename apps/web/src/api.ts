export type UserRole = 'student' | 'teacher' | 'officer'

export interface SessionPayload {
  accessToken: string
  refreshToken?: string
  user: {
    id: string
    role: UserRole
    phone: string
    username: string
    realName: string
    studentNo?: string | null
  }
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
            typeof item === 'object' && item !== null && Array.isArray((item as ValidationIssue).path),
        ) as ValidationIssue[])
      : undefined

    throw new ApiError(payload.message ?? 'request_failed', response.status, {
      code: typeof payload?.error?.code === 'string' ? payload.error.code : undefined,
      details,
    })
  }

  return payload.data as T
}

function nullableText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed : null
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
    return requestJson<{ user: Record<string, unknown> }>(baseUrl, '/auth/phone/change', {
      method: 'POST',
      token,
      body,
    })
  },
  cancelAccount(baseUrl: string, token: string) {
    return requestJson<{ user: Record<string, unknown> }>(baseUrl, '/auth/cancel-account', {
      method: 'POST',
      token,
    })
  },
  getCurrentUser(baseUrl: string, token: string) {
    return requestJson<{ user: Record<string, unknown> }>(baseUrl, '/users/me', {
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
    return requestJson<{ user: Record<string, unknown> }>(baseUrl, '/users/me', {
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
  listCourses(
    baseUrl: string,
    token: string,
    filters:
      | string
      | {
          keyword?: string
          teacherId?: string
          semester?: string
          location?: string
          status?: string
        },
  ) {
    const params = new URLSearchParams()

    if (typeof filters === 'string') {
      if (filters) params.set('keyword', filters)
    } else {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })
    }

    const query = params.toString() ? `?${params.toString()}` : ''
    return requestJson<{ items: Array<Record<string, unknown>> }>(baseUrl, `/courses${query}`, {
      token,
    })
  },
  getCourse(baseUrl: string, token: string, courseId: string) {
    return requestJson<{ course: Record<string, unknown> }>(baseUrl, `/courses/${courseId}`, {
      token,
    })
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
    return requestJson<{ course: Record<string, unknown> }>(baseUrl, '/courses', {
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
      status: string
    }>,
  ) {
    return requestJson<{ course: Record<string, unknown> }>(baseUrl, `/courses/${courseId}`, {
      method: 'PATCH',
      token,
      body,
    })
  },
  deleteCourse(baseUrl: string, token: string, courseId: string) {
    return requestJson<{ course: Record<string, unknown> }>(baseUrl, `/courses/${courseId}`, {
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
  listAssignments(baseUrl: string, token: string, courseId: string) {
    return requestJson<{ items: Array<Record<string, unknown>> }>(
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
    return requestJson<{ assignment: Record<string, unknown> }>(
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
    return requestJson<{ assignment: Record<string, unknown> }>(
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
    return requestJson<{ assignment: Record<string, unknown> }>(
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
    return requestJson<{ items: Array<Record<string, unknown>> }>(
      baseUrl,
      `/assignments/${assignmentId}/submissions`,
      { token },
    )
  },
  createSubmission(baseUrl: string, token: string, assignmentId: string, content: string) {
    return requestJson<{ submission: Record<string, unknown> }>(
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
    return requestJson<{ submission: Record<string, unknown> }>(
      baseUrl,
      `/submissions/${submissionId}`,
      { token },
    )
  },
  updateSubmission(baseUrl: string, token: string, submissionId: string, content: string) {
    return requestJson<{ submission: Record<string, unknown> }>(
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
    return requestJson<{ submission: Record<string, unknown> }>(
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
    return requestJson<{ items: Array<Record<string, unknown>> }>(
      baseUrl,
      `/feedbacks?submissionId=${encodeURIComponent(submissionId)}`,
      { token },
    )
  },
  listFeedbackThreads(
    baseUrl: string,
    token: string,
    filters: {
      courseId?: string
      assignmentId?: string
      status?: string
      limit?: number
      offset?: number
    } = {},
  ) {
    const params = new URLSearchParams()

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      params.set(key, String(value))
    })

    const query = params.toString() ? `?${params.toString()}` : ''
    return requestJson<{
      items: Array<Record<string, unknown>>
      pagination?: { limit: number; offset: number; count: number }
    }>(baseUrl, `/feedbacks/threads${query}`, { token })
  },
  createFeedback(
    baseUrl: string,
    token: string,
    submissionId: string,
    kind: 'question' | 'feedback',
    content: string,
  ) {
    return requestJson<{ feedback: Record<string, unknown> }>(
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
    kind: 'question' | 'feedback',
    content: string,
  ) {
    return requestJson<{ feedback: Record<string, unknown> }>(
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
    return requestJson<{ feedback: Record<string, unknown> }>(
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
    return requestJson<{ items: Array<Record<string, unknown>> }>(baseUrl, `/course-feedbacks${query}`, {
      token,
    })
  },
  createCourseFeedback(
    baseUrl: string,
    token: string,
    courseId: string,
    body: {
      dimension: 'content' | 'method' | 'teaching' | 'gain' | 'other'
      content: string
    },
  ) {
    return requestJson<{ feedback: Record<string, unknown> }>(
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
      dimension: 'content' | 'method' | 'teaching' | 'gain' | 'other'
      content: string
    },
  ) {
    return requestJson<{ feedback: Record<string, unknown> }>(
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
    return requestJson<{ feedback: Record<string, unknown> }>(
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
    return requestJson<{ users: Array<Record<string, unknown>> }>(baseUrl, `/users${query}`, {
      token,
    })
  },
  setUserDisabled(baseUrl: string, token: string, userId: string, disabled: boolean) {
    return requestJson<{ user: Record<string, unknown> }>(
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
