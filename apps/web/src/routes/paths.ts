import type { UserRole } from '../domain'

export const PUBLIC_PATHS = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
} as const

export function dashboardPath(role: UserRole): string {
  return `/${role}/dashboard`
}

export function coursesPath(role: UserRole): string {
  return `/${role}/courses`
}

export function courseWorkspacePath(role: UserRole, courseId: string, tab: string): string {
  return `/${role}/courses/${courseId}/${tab}`
}

export function accountPath(role: UserRole): string {
  return `/${role}/account`
}

export const STUDENT_PATHS = {
  dashboard: '/student/dashboard',
  courses: '/student/courses',
  assignments: '/student/assignments',
  account: '/student/account',
} as const

export const TEACHER_PATHS = {
  dashboard: '/teacher/dashboard',
  courses: '/teacher/courses',
  assignments: '/teacher/assignments',
  tasks: '/teacher/tasks',
  account: '/teacher/account',
} as const

export const OFFICER_PATHS = {
  dashboard: '/officer/dashboard',
  courses: '/officer/courses',
  users: '/officer/users',
  usersStudents: '/officer/users/students',
  usersTeachers: '/officer/users/teachers',
  usersOfficers: '/officer/users/officers',
  courseFeedbacks: '/officer/course-feedbacks',
  account: '/officer/account',
} as const

export const COURSE_WORKSPACE_TABS = {
  overview: 'overview',
  assignments: 'assignments',
  submissions: 'submissions',
  feedbacks: 'feedbacks',
  courseFeedbacks: 'course-feedbacks',
  basicInfo: 'basic-info',
} as const
