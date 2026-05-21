import type { UserRole } from '../domain'

export type RoleTabRouteName =
  | 'Dashboard'
  | 'Courses'
  | 'Assignments'
  | 'TeacherTasks'
  | 'OfficerUsers'
  | 'OfficerFeedbacks'
  | 'Account'

export type RoleTabItem = {
  routeName: RoleTabRouteName
  label: string
}

export type CourseStackRouteName =
  | 'CourseList'
  | 'CourseWorkspace'
  | 'AssignmentDetail'
  | 'SubmissionDetail'
  | 'FeedbackThread'

export const roleLabels: Record<UserRole, string> = {
  student: '学生',
  teacher: '教师',
  officer: '教务员',
}

const roleTabs: Record<UserRole, RoleTabItem[]> = {
  student: [
    { routeName: 'Dashboard', label: '工作台' },
    { routeName: 'Courses', label: '课程' },
    { routeName: 'Assignments', label: '作业' },
    { routeName: 'Account', label: '账号' },
  ],
  teacher: [
    { routeName: 'Dashboard', label: '工作台' },
    { routeName: 'Courses', label: '课程' },
    { routeName: 'Assignments', label: '作业' },
    { routeName: 'TeacherTasks', label: '任务' },
    { routeName: 'Account', label: '账号' },
  ],
  officer: [
    { routeName: 'Dashboard', label: '工作台' },
    { routeName: 'Courses', label: '课程' },
    { routeName: 'OfficerUsers', label: '用户' },
    { routeName: 'OfficerFeedbacks', label: '反馈' },
    { routeName: 'Account', label: '账号' },
  ],
}

export const courseStackRoutes: CourseStackRouteName[] = [
  'CourseList',
  'CourseWorkspace',
  'AssignmentDetail',
  'SubmissionDetail',
  'FeedbackThread',
]

export function getRoleTabs(role: UserRole) {
  return roleTabs[role]
}

export function getInitialTabForRole(_role: UserRole): RoleTabRouteName {
  return 'Dashboard'
}
