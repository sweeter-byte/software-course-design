import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { AssignmentItem, SubmissionItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

export function TeacherCourseSubmissionsTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()
  const params = useParams<{ courseId: string; submissionId?: string }>()
  const navigate = useNavigate()

  const [assignmentFilter, setAssignmentFilter] = useState<string>('')

  const assignmentsQuery = useQuery<{ items: AssignmentItem[] }>({
    queryKey: ['assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as AssignmentItem[] }
    },
  })

  const assignments = assignmentsQuery.data?.items ?? []
  const activeAssignmentId = assignmentFilter || assignments[0]?.id || ''

  const submissionsQuery = useQuery<{ items: SubmissionItem[] }>({
    enabled: Boolean(activeAssignmentId),
    queryKey: ['submissions', apiBaseUrl, session.accessToken, activeAssignmentId],
    queryFn: async () => {
      if (!activeAssignmentId) return { items: [] }
      const payload = await api.listSubmissions(
        apiBaseUrl,
        session.accessToken,
        activeAssignmentId,
      )
      return { items: payload.items as SubmissionItem[] }
    },
  })

  const submissions = submissionsQuery.data?.items ?? []
  const selectedSubmissionId = params.submissionId ?? null

  return (
    <div className="course-tab-content course-submissions-layout">
      <aside className="course-submission-list">
        <header>
          <h3>提交批改</h3>
          <p className="muted-paragraph">
            按作业筛选，查看学生提交后填写分数与教师批改回复。
          </p>
        </header>
        <label htmlFor="submission-assignment-filter">
          作业筛选
          <select
            id="submission-assignment-filter"
            value={activeAssignmentId}
            onChange={(event) => setAssignmentFilter(event.target.value)}
          >
            {assignments.length === 0 ? (
              <option value="">暂无作业</option>
            ) : (
              assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </option>
              ))
            )}
          </select>
        </label>

        {submissionsQuery.isLoading ? (
          <StatePanel title="提交加载中" detail="正在同步学生提交。" />
        ) : submissions.length === 0 ? (
          <StatePanel
            title="暂无提交"
            detail={activeAssignmentId ? '该作业还没有学生提交。' : '请先发布作业。'}
          />
        ) : (
          <div className="entity-list">
            {submissions.map((submission) => (
              <button
                key={submission.id}
                type="button"
                className={
                  selectedSubmissionId === submission.id ? 'entity-card active' : 'entity-card'
                }
                onClick={() =>
                  navigate(`/teacher/courses/${course.id}/submissions/${submission.id}`)
                }
              >
                <div>
                  <strong>{submission.studentName ?? submission.studentId}</strong>
                  <span>{submission.status}</span>
                </div>
                <p>{submission.content}</p>
                <small>提交：{formatDateTimeForDisplay(submission.submittedAt)}</small>
                {submission.score != null ? (
                  <small>分数：{submission.score}</small>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </aside>

      <section className="course-submission-detail">
        {selectedSubmissionId ? (
          <Outlet context={{ course } as CourseWorkspaceOutletContext} />
        ) : (
          <StatePanel
            title="尚未选择提交"
            detail="在左侧选择一条提交，进入批改详情。"
          />
        )}
      </section>
    </div>
  )
}
