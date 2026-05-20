import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { AssignmentItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

const MAX_RECENT_ASSIGNMENTS = 5

export function StudentCourseOverviewTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()

  const assignmentsQuery = useQuery<{ items: AssignmentItem[] }>({
    enabled: Boolean(course),
    queryKey: ['assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as AssignmentItem[] }
    },
  })

  const assignments = assignmentsQuery.data?.items ?? []
  const recentAssignments = [...assignments]
    .sort((a, b) => (a.dueAt < b.dueAt ? 1 : -1))
    .slice(0, MAX_RECENT_ASSIGNMENTS)

  return (
    <div className="course-tab-content">
      <article className="section-card wide-card">
        <div className="section-head">
          <h3>课程简介</h3>
          <p>了解课程基本信息与教学安排。</p>
        </div>
        <p className="muted-paragraph">{course.description || '该课程暂未填写简介。'}</p>
        <dl className="detail-list">
          <div>
            <dt>开课日期</dt>
            <dd>{course.startDate ?? '—'}</dd>
          </div>
          <div>
            <dt>结课日期</dt>
            <dd>{course.endDate ?? '—'}</dd>
          </div>
          <div>
            <dt>课程人数上限</dt>
            <dd>{course.capacity}</dd>
          </div>
        </dl>
      </article>

      <article className="section-card wide-card">
        <div className="section-head">
          <h3>最近作业</h3>
          <p>按截止时间倒序展示本课程最近发布的作业。</p>
        </div>
        {assignmentsQuery.isLoading ? (
          <StatePanel title="作业加载中" detail="正在同步课程作业。" />
        ) : recentAssignments.length === 0 ? (
          <StatePanel title="暂无作业" detail="该课程尚未发布作业。" />
        ) : (
          <ul className="bullet-list">
            {recentAssignments.map((assignment) => (
              <li key={assignment.id}>
                <strong>{assignment.title}</strong>
                <span className="muted-text"> · 截止 {formatDateTimeForDisplay(assignment.dueAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  )
}
