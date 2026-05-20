import { useQuery } from '@tanstack/react-query'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { UserRole } from '../../domain'

type SummaryRecord = Record<string, number>

const SUMMARY_LABELS: Record<string, string> = {
  totalCourses: '课程总数',
  totalTeachers: '教师总数',
  totalStudents: '学生总数',
  openFeedbacks: '作业互动反馈数',
  courseFeedbacks: '课程反馈数',
  enrolledCourses: '已加入课程',
  pendingAssignments: '待提交作业',
  gradedSubmissions: '已批改提交',
  totalCoursesForTeacher: '当前课程数',
  publishedAssignments: '已发布作业',
  pendingGrades: '待批改提交',
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  student: '查看课程安排、提交学习成果，并围绕作业反馈持续交流。',
  teacher: '维护教学节奏、发布作业、处理提交并完成答疑反馈。',
  officer: '统筹课程基础信息，查看平台运行概况与教学状态。',
}

const ROLE_LABELS: Record<UserRole, string> = {
  student: '学生',
  teacher: '教师',
  officer: '教务员',
}

const ACCENTS = ['#005bac', '#1d4ed8', '#d97706', '#9f1239']

interface SummaryCardProps {
  label: string
  value: number
  accent: string
}

function SummaryCard({ label, value, accent }: SummaryCardProps) {
  return (
    <article className="summary-card">
      <span className="summary-accent" style={{ background: accent }} />
      <span className="summary-caption">概览</span>
      <p className="summary-label">{label}</p>
      <strong className="summary-value">{value}</strong>
    </article>
  )
}

export function DashboardRoute() {
  const { apiBaseUrl, session } = useAuth()
  const role = session.user.role

  const dashboardQuery = useQuery<{ summary: SummaryRecord }>({
    queryKey: ['dashboard', apiBaseUrl, session.accessToken, role],
    queryFn: async () => {
      const payload = await api.getDashboard(apiBaseUrl, session.accessToken, role)
      return { summary: (payload as { summary: SummaryRecord }).summary }
    },
  })

  const summary = dashboardQuery.data?.summary ?? {}

  return (
    <div className="dashboard-route">
      <div className="hero-banner">
        <div>
          <p className="eyebrow">当前账号</p>
          <h3>
            {session.user.realName}
            <span> {ROLE_LABELS[role]}</span>
          </h3>
          <p>
            {ROLE_DESCRIPTIONS[role]} 当前登录手机号为 {session.user.phone}。
          </p>
        </div>
        <div className="identity-chip">
          <span>{ROLE_LABELS[role]}</span>
          <strong>{session.user.username}</strong>
        </div>
      </div>

      {dashboardQuery.isLoading ? (
        <StatePanel title="工作台加载中" detail="正在汇总平台数据。" />
      ) : Object.keys(summary).length === 0 ? (
        <StatePanel title="暂无概览数据" detail="请稍后刷新或确认网络连接。" />
      ) : (
        <div className="summary-grid">
          {Object.entries(summary).map(([key, value], index) => (
            <SummaryCard
              key={key}
              label={SUMMARY_LABELS[key] ?? key}
              value={value}
              accent={ACCENTS[index % ACCENTS.length]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
