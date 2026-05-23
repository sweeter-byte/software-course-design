import type { UserRole } from '../../domain'

export type CourseWorkspaceTabValue =
  | 'overview'
  | 'assignments'
  | 'submissions'
  | 'feedbacks'
  | 'course-feedbacks'
  | 'basic-info'
  | 'enrollments'

export type CourseWorkspaceTab = {
  value: CourseWorkspaceTabValue
  label: string
}

const STUDENT_TABS: CourseWorkspaceTab[] = [
  { value: 'overview', label: '概览' },
  { value: 'assignments', label: '作业' },
  { value: 'feedbacks', label: '作业反馈' },
  { value: 'course-feedbacks', label: '课程反馈' },
]

const TEACHER_TABS: CourseWorkspaceTab[] = [
  { value: 'overview', label: '概览' },
  { value: 'enrollments', label: '学生' },
  { value: 'assignments', label: '作业' },
  { value: 'submissions', label: '批改' },
  { value: 'feedbacks', label: '作业反馈' },
  { value: 'course-feedbacks', label: '课程反馈' },
]

const OFFICER_TABS: CourseWorkspaceTab[] = [
  { value: 'overview', label: '概览' },
  { value: 'basic-info', label: '基础信息' },
  { value: 'enrollments', label: '学生' },
  { value: 'assignments', label: '作业概况' },
  { value: 'course-feedbacks', label: '课程反馈' },
]

export function getCourseWorkspaceTabs(role: UserRole): CourseWorkspaceTab[] {
  switch (role) {
    case 'student':
      return STUDENT_TABS
    case 'teacher':
      return TEACHER_TABS
    case 'officer':
      return OFFICER_TABS
  }
}

export function getInitialCourseWorkspaceTab(role: UserRole): CourseWorkspaceTabValue {
  return getCourseWorkspaceTabs(role)[0].value
}
