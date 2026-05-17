export type UserRole = 'student' | 'teacher' | 'officer'

export type UserStatus = 'active' | 'cancelled' | 'disabled'

export type CourseStatus = 'not_started' | 'active' | 'completed' | 'suspended'

export type AssignmentStatus = 'draft' | 'published' | 'cancelled' | 'closed'

export type SubmissionStatus = 'draft' | 'submitted' | 'graded'

export type FeedbackKind = 'question' | 'feedback'

export type FeedbackStatus = 'open' | 'resolved' | 'deleted'

export type VerificationPurpose = 'register' | 'reset_password' | 'change_phone'

export interface ApiMeta {
  requestId: string
}

export interface ApiSuccess<T> {
  success: true
  message: string
  data: T
  meta: ApiMeta
}

export interface ApiFailure {
  success: false
  message: string
  error: {
    code: string
    details?: unknown[]
  }
  meta: ApiMeta
}

export interface SessionUser {
  id: string
  role: UserRole
  status: UserStatus
  phone: string
  username: string
  realName: string
}
