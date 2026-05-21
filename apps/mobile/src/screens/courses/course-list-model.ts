import type { CourseFilters, CourseItem, UserRole } from '../../domain'

export type CourseStatusOption = {
  value: string
  label: string
}

export const COURSE_STATUS_LABELS: Record<string, string> = {
  not_started: '未开始',
  active: '开课中',
  completed: '已结课',
  suspended: '暂停',
  cancelled: '已取消',
}

export const COURSE_STATUS_OPTIONS: CourseStatusOption[] = [
  { value: '', label: '全部状态' },
  { value: 'not_started', label: '未开始' },
  { value: 'active', label: '开课中' },
  { value: 'completed', label: '已结课' },
  { value: 'suspended', label: '暂停' },
]

export type CourseListDraft = {
  keyword: string
  semester: string
  status: string
  teacherId: string
}

export const EMPTY_COURSE_LIST_DRAFT: CourseListDraft = {
  keyword: '',
  semester: '',
  status: '',
  teacherId: '',
}

/**
 * Convert UI draft to the `/courses` server filters per role.
 * - Student/officer push filters to the server (mirrors web behavior).
 * - Teacher always fetches `{}` server-side then filters own-courses + status
 *   on the client (also mirrors web).
 */
export function buildServerCourseFilters(role: UserRole, draft: CourseListDraft): CourseFilters {
  if (role === 'teacher') return {}

  const filters: CourseFilters = {}
  if (draft.keyword.trim()) filters.keyword = draft.keyword.trim()
  if (draft.semester.trim()) filters.semester = draft.semester.trim()
  if (draft.status) filters.status = draft.status
  if (role === 'officer' && draft.teacherId) filters.teacherId = draft.teacherId
  return filters
}

/**
 * Web teacher list applies own-courses + keyword + status client-side.
 * Student/officer rely on server filtering, but we still keep a safe pass-through.
 */
export function applyClientCourseFilters(
  role: UserRole,
  draft: CourseListDraft,
  teacherUserId: string | null,
  courses: CourseItem[],
): CourseItem[] {
  if (role !== 'teacher') return courses

  const keyword = draft.keyword.trim().toLowerCase()
  return courses
    .filter((course) => (teacherUserId ? course.teacherId === teacherUserId : true))
    .filter((course) => {
      if (draft.status && course.status !== draft.status) return false
      if (!keyword) return true
      const haystack = [course.courseName, course.courseCode].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(keyword)
    })
}

export function getCourseStatusLabel(status: string): string {
  return COURSE_STATUS_LABELS[status] ?? status
}
