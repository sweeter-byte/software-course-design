import type { AssignmentItem, FeedbackItem, SubmissionItem, UserRole } from '../../domain'
import type { RoleTabRouteName } from '../../navigation/navigation-model'

export type DashboardSummary = Record<string, number>

export type DashboardMetric = {
  key: string
  label: string
  value: number
}

export type DashboardTask = {
  label: string
  value: number
  detail: string
  target: RoleTabRouteName
}

export type DashboardAction = {
  label: string
  detail: string
  target: RoleTabRouteName
}

export type TeacherAssignmentContext = {
  assignment: AssignmentItem
  courseId: string
  courseName: string
}

export type PendingSubmissionTask = TeacherAssignmentContext & {
  submission: SubmissionItem
}

export type TeacherTaskQueues = {
  pendingSubmissions: PendingSubmissionTask[]
  pendingFeedbacks: FeedbackItem[]
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
  publishedAssignments: '已发布作业',
  pendingGrades: '待批改提交',
}

const roleSummaryLabelOverrides: Partial<Record<UserRole, Record<string, string>>> = {
  teacher: {
    totalCourses: '当前课程数',
  },
}

const metricKeysByRole: Record<UserRole, string[]> = {
  student: [
    'enrolledCourses',
    'pendingAssignments',
    'gradedSubmissions',
    'openFeedbacks',
    'courseFeedbacks',
  ],
  teacher: [
    'totalCourses',
    'publishedAssignments',
    'pendingGrades',
    'openFeedbacks',
    'courseFeedbacks',
  ],
  officer: [
    'totalCourses',
    'totalTeachers',
    'totalStudents',
    'openFeedbacks',
    'courseFeedbacks',
  ],
}

const actionsByRole: Record<UserRole, DashboardAction[]> = {
  student: [
    { label: '我的课程', detail: '进入课程列表和课程工作区', target: 'Courses' },
    { label: '我的作业', detail: '查看课程内作业与提交状态', target: 'Assignments' },
    { label: '账号维护', detail: '维护个人资料、手机号和密码', target: 'Account' },
  ],
  teacher: [
    { label: '授课课程', detail: '查看课程工作区和课程反馈', target: 'Courses' },
    { label: '作业管理', detail: '进入课程作业发布与维护入口', target: 'Assignments' },
    { label: '教学任务', detail: '处理待批改提交和未回答反馈', target: 'TeacherTasks' },
  ],
  officer: [
    { label: '课程运营', detail: '查看课程列表与运营状态', target: 'Courses' },
    { label: '用户管理', detail: '巡检学生、教师、教务员账号', target: 'OfficerUsers' },
    { label: '反馈查看', detail: '查看全局课程反馈', target: 'OfficerFeedbacks' },
  ],
}

export function getDashboardSummaryLabel(key: string, role?: UserRole) {
  if (role) {
    const override = roleSummaryLabelOverrides[role]?.[key]
    if (override) return override
  }
  return summaryLabels[key] ?? key
}

export function buildDashboardMetrics(role: UserRole, summary: DashboardSummary): DashboardMetric[] {
  return metricKeysByRole[role].map((key) => ({
    key,
    label: getDashboardSummaryLabel(key, role),
    value: summary[key] ?? 0,
  }))
}

export function buildDashboardTasks(role: UserRole, summary: DashboardSummary): DashboardTask[] {
  if (role === 'student') {
    return [
      {
        label: '待提交作业',
        value: summary.pendingAssignments ?? 0,
        detail: '进入我的作业查看待处理提交。',
        target: 'Assignments',
      },
      {
        label: '已批改提交',
        value: summary.gradedSubmissions ?? 0,
        detail: '查看成绩、评语和可发起的作业反馈。',
        target: 'Assignments',
      },
      {
        label: '课程反馈',
        value: summary.courseFeedbacks ?? 0,
        detail: '进入课程工作区管理课程整体反馈。',
        target: 'Courses',
      },
    ]
  }

  if (role === 'teacher') {
    return [
      {
        label: '待批改提交',
        value: summary.pendingGrades ?? 0,
        detail: '进入教学任务按提交时间处理批改。',
        target: 'TeacherTasks',
      },
      {
        label: '未回答反馈',
        value: summary.openFeedbacks ?? 0,
        detail: '进入教学任务回复学生作业反馈。',
        target: 'TeacherTasks',
      },
      {
        label: '课程整体反馈',
        value: summary.courseFeedbacks ?? 0,
        detail: '进入课程查看学生整体反馈。',
        target: 'Courses',
      },
    ]
  }

  return [
    {
      label: '课程运营巡检',
      value: summary.totalCourses ?? 0,
      detail: '进入课程运营查看课程状态。',
      target: 'Courses',
    },
    {
      label: '用户账号巡检',
      value: (summary.totalTeachers ?? 0) + (summary.totalStudents ?? 0),
      detail: '进入用户管理查看账号状态。',
      target: 'OfficerUsers',
    },
    {
      label: '课程反馈查看',
      value: summary.courseFeedbacks ?? 0,
      detail: '进入课程反馈查看学生意见。',
      target: 'OfficerFeedbacks',
    },
  ]
}

export function buildDashboardActions(role: UserRole): DashboardAction[] {
  return actionsByRole[role]
}

export function buildTeacherTaskQueues({
  assignments,
  submissionsByAssignment,
  feedbackThreads,
}: {
  assignments: TeacherAssignmentContext[]
  submissionsByAssignment: Record<string, SubmissionItem[]>
  feedbackThreads: FeedbackItem[]
}): TeacherTaskQueues {
  const assignmentById = new Map(assignments.map((item) => [item.assignment.id, item]))
  const pendingSubmissions = Object.entries(submissionsByAssignment)
    .flatMap(([assignmentId, submissions]) => {
      const context = assignmentById.get(assignmentId)
      if (!context) return []

      return submissions
        .filter((submission) => submission.status === 'submitted')
        .map((submission) => ({
          ...context,
          submission,
        }))
    })
    .sort((a, b) => compareTimestampDesc(a.submission.submittedAt, b.submission.submittedAt))

  const pendingFeedbacks = feedbackThreads
    .filter((thread) => thread.responses.length === 0)
    .sort((a, b) => compareTimestampDesc(a.createdAt, b.createdAt))

  return {
    pendingSubmissions,
    pendingFeedbacks,
  }
}

function compareTimestampDesc(left: string | null | undefined, right: string | null | undefined) {
  return (right ?? '').localeCompare(left ?? '')
}
