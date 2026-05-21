export type UserRole = 'student' | 'teacher' | 'officer'

export type SessionUser = {
  id: string
  role: UserRole
  phone: string
  username: string
  realName: string
  studentNo?: string | null
}

export type CourseStatus = 'not_started' | 'active' | 'finished' | 'cancelled' | string

export type CourseItem = {
  id: string
  courseCode: string
  courseName: string
  description: string
  teacherId: string
  teacherName?: string | null
  teacherNo?: string | null
  semester: string
  location: string
  scheduleText: string
  capacity: number
  startDate?: string | null
  endDate?: string | null
  status: CourseStatus
  enrolled?: boolean
}

export type CourseFilters = {
  keyword?: string
  teacherId?: string
  semester?: string
  location?: string
  status?: string
}

export type CourseOptions = {
  semesters: string[]
  locations: string[]
}

export type AssignmentItem = {
  id: string
  courseId: string
  teacherId: string
  title: string
  description: string
  requirement: string
  startAt: string
  dueAt: string
  status: string
  hasSubmitted?: boolean
  submissionId?: string | null
  mySubmission?: SubmissionItem | null
}

export type SubmissionItem = {
  id: string
  assignmentId: string
  studentId: string
  studentName?: string | null
  studentNo?: string | null
  content: string
  status: string
  score?: number | null
  teacherFeedback?: string | null
  submittedAt?: string | null
  gradedAt?: string | null
}

export type FeedbackKind = 'question' | 'feedback'

export type FeedbackResponseItem = {
  id: string
  feedbackId: string
  teacherId: string
  teacherName?: string | null
  content: string
  createdAt?: string | null
  updatedAt?: string | null
  editedAt?: string | null
}

export type FeedbackItem = {
  id: string
  courseId?: string | null
  assignmentId: string
  submissionId: string
  studentId: string
  studentName?: string | null
  studentNo?: string | null
  courseName?: string | null
  courseCode?: string | null
  assignmentTitle?: string | null
  submissionStatus?: string | null
  kind: FeedbackKind
  content: string
  status: string
  createdAt?: string | null
  updatedAt?: string | null
  responses: FeedbackResponseItem[]
}

export type FeedbackThreadFilters = {
  courseId?: string
  assignmentId?: string
  status?: string
  limit?: number
  offset?: number
}

export type CourseFeedbackDimension = 'content' | 'method' | 'teaching' | 'gain' | 'other'

export type CourseFeedbackItem = {
  id: string
  courseId: string
  courseName?: string
  studentId: string
  studentName?: string | null
  studentNo?: string | null
  teacherId: string
  dimension: CourseFeedbackDimension
  content: string
  status: string
  createdAt?: string | null
  updatedAt?: string | null
}

export type WorkspaceContext = {
  course: CourseItem | null
  assignment: AssignmentItem | null
  submission: SubmissionItem | null
}

export type AdminUserItem = {
  id: string
  role: UserRole
  status: 'active' | 'cancelled' | 'disabled'
  phone: string
  username: string
  realName: string
  email?: string | null
  gender?: string | null
  studentNo?: string | null
  teacherNo?: string | null
  college?: string | null
  major?: string | null
  className?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type Pagination = {
  limit: number
  offset: number
  count: number
}
