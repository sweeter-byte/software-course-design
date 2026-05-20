import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { AssignmentItem, SubmissionItem } from '../../domain'
import { assignmentStatusLabel } from '../../utils/assignment-status'
import { formatDateTimeForDisplay } from '../../utils/date'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

export function OfficerCourseAssignmentsTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()
  // Snapshot wall-clock once per mount so derivation stays pure during render.
  const [nowMs] = useState(() => Date.now())

  const assignmentsQuery = useQuery<{ items: AssignmentItem[] }>({
    queryKey: ['assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as AssignmentItem[] }
    },
  })

  const assignmentItems = assignmentsQuery.data?.items
  const assignments = useMemo(() => assignmentItems ?? [], [assignmentItems])

  const submissionQueries = useQueries({
    queries: assignments.map((assignment) => ({
      queryKey: ['submissions', apiBaseUrl, session.accessToken, assignment.id],
      queryFn: async () => {
        const payload = await api.listSubmissions(
          apiBaseUrl,
          session.accessToken,
          assignment.id,
        )
        return { items: payload.items as SubmissionItem[] }
      },
    })),
  })

  const rows = useMemo(() => {
    return assignments.map((assignment, index) => {
      const items = submissionQueries[index]?.data?.items ?? []
      return {
        assignment,
        total: items.length,
        graded: items.filter((item) => item.status === 'graded').length,
        pending: items.filter((item) => item.status === 'submitted').length,
      }
    })
  }, [assignments, submissionQueries])

  if (assignmentsQuery.isLoading) {
    return <StatePanel title="作业加载中" detail="正在同步课程作业。" />
  }

  if (assignments.length === 0) {
    return <StatePanel title="暂无作业" detail="该课程尚未发布作业。" />
  }

  return (
    <div className="course-tab-content">
      <article className="section-card wide-card">
        <div className="section-head">
          <h3>作业概况（只读）</h3>
          <p>用于教学质量审计。教务员不发布、修改、取消、批改作业。</p>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>作业</th>
              <th>状态</th>
              <th>发布</th>
              <th>截止</th>
              <th>提交</th>
              <th>待批改</th>
              <th>已批改</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ assignment, total, graded, pending }) => (
              <tr key={assignment.id}>
                <td>{assignment.title}</td>
                <td>{assignmentStatusLabel(assignment, nowMs)}</td>
                <td>{formatDateTimeForDisplay(assignment.startAt)}</td>
                <td>{formatDateTimeForDisplay(assignment.dueAt)}</td>
                <td>{total}</td>
                <td>{pending}</td>
                <td>{graded}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  )
}
