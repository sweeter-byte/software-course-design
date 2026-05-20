import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { AssignmentItem, CourseItem } from '../../domain'
import { assignmentStatusLabel } from '../../utils/assignment-status'
import { formatDateTimeForDisplay } from '../../utils/date'

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  draft: '未提交',
  submitted: '已提交',
  graded: '已批改',
}

export function StudentAssignmentsRoute() {
  const { apiBaseUrl, session } = useAuth()
  const navigate = useNavigate()
  const [submissionFilter, setSubmissionFilter] = useState<string>('')
  // Snapshot wall-clock once per mount so derivation stays pure during render.
  const [nowMs] = useState(() => Date.now())

  const coursesQuery = useQuery<{ items: CourseItem[] }>({
    queryKey: ['courses', apiBaseUrl, session.accessToken, 'student-enrolled'],
    queryFn: async () => {
      const payload = await api.listCourses(apiBaseUrl, session.accessToken, {})
      return { items: payload.items as CourseItem[] }
    },
  })

  const enrolledCourses = useMemo(
    () => (coursesQuery.data?.items ?? []).filter((course) => course.enrolled),
    [coursesQuery.data],
  )

  const assignmentQueries = useQueries({
    queries: enrolledCourses.map((course) => ({
      queryKey: ['assignments', apiBaseUrl, session.accessToken, course.id],
      queryFn: async () => {
        const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
        return { items: payload.items as AssignmentItem[], course }
      },
    })),
  })

  const rows = useMemo(() => {
    const merged: Array<{
      assignment: AssignmentItem
      courseId: string
      courseName: string
      submissionStatus: string
    }> = []
    assignmentQueries.forEach((query) => {
      if (!query.data) return
      const { items, course } = query.data
      for (const assignment of items) {
        const submissionStatus =
          assignment.mySubmission?.status ??
          (assignment.hasSubmitted ? 'submitted' : 'draft')
        merged.push({
          assignment,
          courseId: course.id,
          courseName: course.courseName,
          submissionStatus,
        })
      }
    })
    return merged
      .filter((row) =>
        submissionFilter ? row.submissionStatus === submissionFilter : true,
      )
      .sort((a, b) => (a.assignment.dueAt < b.assignment.dueAt ? 1 : -1))
  }, [assignmentQueries, submissionFilter])

  const isLoading =
    coursesQuery.isLoading || assignmentQueries.some((query) => query.isLoading)

  return (
    <div className="student-assignments-route">
      <section className="section-card wide-card">
        <div className="section-head">
          <h3>我的作业</h3>
          <p>跨课程汇总所有作业。点击作业进入课程工作区的作业详情。</p>
        </div>
        <div className="form-grid">
          <label htmlFor="my-assignments-filter">
            提交状态
            <select
              id="my-assignments-filter"
              value={submissionFilter}
              onChange={(event) => setSubmissionFilter(event.target.value)}
            >
              <option value="">全部</option>
              <option value="draft">未提交</option>
              <option value="submitted">已提交</option>
              <option value="graded">已批改</option>
            </select>
          </label>
        </div>
        {isLoading ? (
          <StatePanel title="作业加载中" detail="正在汇总各课程的作业。" />
        ) : enrolledCourses.length === 0 ? (
          <StatePanel title="尚未加入课程" detail="先在「我的课程」加入课程，再查看对应作业。" />
        ) : rows.length === 0 ? (
          <StatePanel title="没有匹配的作业" detail="可以调整提交状态筛选。" />
        ) : (
          <div className="entity-list">
            {rows.map(({ assignment, courseId, courseName, submissionStatus }) => (
              <button
                key={assignment.id}
                type="button"
                className="entity-card"
                onClick={() =>
                  navigate(`/student/courses/${courseId}/assignments/${assignment.id}`)
                }
              >
                <div>
                  <strong>{assignment.title}</strong>
                  <span>{assignmentStatusLabel(assignment, nowMs)}</span>
                </div>
                <p>{assignment.description}</p>
                <small>课程：{courseName}</small>
                <small>截止：{formatDateTimeForDisplay(assignment.dueAt)}</small>
                <small>
                  提交状态：{SUBMISSION_STATUS_LABELS[submissionStatus] ?? submissionStatus}
                </small>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
