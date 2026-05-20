import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { AssignmentItem, CourseItem, FeedbackItem, SubmissionItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'

export function TeacherTasksRoute() {
  const { apiBaseUrl, session } = useAuth()
  const navigate = useNavigate()
  const [queueTab, setQueueTab] = useState<'submissions' | 'feedbacks'>('submissions')

  const coursesQuery = useQuery<{ items: CourseItem[] }>({
    queryKey: ['courses', apiBaseUrl, session.accessToken, 'teacher-own'],
    queryFn: async () => {
      const payload = await api.listCourses(apiBaseUrl, session.accessToken, {})
      return { items: payload.items as CourseItem[] }
    },
  })

  const myCourses = useMemo(
    () =>
      (coursesQuery.data?.items ?? []).filter((course) => course.teacherId === session.user.id),
    [coursesQuery.data, session.user.id],
  )

  const assignmentQueries = useQueries({
    queries: myCourses.map((course) => ({
      queryKey: ['assignments', apiBaseUrl, session.accessToken, course.id],
      queryFn: async () => {
        const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
        return { items: payload.items as AssignmentItem[], courseId: course.id }
      },
    })),
  })

  const allAssignments = useMemo(() => {
    const map = new Map<string, { assignment: AssignmentItem; courseId: string; courseName: string }>()
    assignmentQueries.forEach((query, index) => {
      const course = myCourses[index]
      if (!query.data || !course) return
      for (const assignment of query.data.items) {
        map.set(assignment.id, { assignment, courseId: course.id, courseName: course.courseName })
      }
    })
    return map
  }, [assignmentQueries, myCourses])

  const submissionQueries = useQueries({
    queries: Array.from(allAssignments.values())
      .filter(({ assignment }) => assignment.status !== 'cancelled')
      .map(({ assignment, courseId, courseName }) => ({
        queryKey: ['submissions', apiBaseUrl, session.accessToken, assignment.id],
        queryFn: async () => {
          const payload = await api.listSubmissions(
            apiBaseUrl,
            session.accessToken,
            assignment.id,
          )
          return {
            items: payload.items as SubmissionItem[],
            assignment,
            courseId,
            courseName,
          }
        },
      })),
  })

  const threadsQuery = useQuery<{ items: FeedbackItem[] }>({
    queryKey: ['feedbackThreads', apiBaseUrl, session.accessToken, 'all-courses', 'teacher'],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {})
      return { items: payload.items as FeedbackItem[] }
    },
  })

  const pendingSubmissions = useMemo(() => {
    const items: Array<{
      submission: SubmissionItem
      assignment: AssignmentItem
      courseId: string
      courseName: string
    }> = []
    submissionQueries.forEach((query) => {
      if (!query.data) return
      const { items: list, assignment, courseId, courseName } = query.data
      for (const submission of list) {
        if (submission.status === 'submitted') {
          items.push({ submission, assignment, courseId, courseName })
        }
      }
    })
    items.sort((a, b) =>
      (a.submission.submittedAt ?? '') < (b.submission.submittedAt ?? '') ? 1 : -1,
    )
    return items
  }, [submissionQueries])

  const pendingFeedbacks = useMemo(() => {
    return (threadsQuery.data?.items ?? []).filter((thread) => thread.responses.length === 0)
  }, [threadsQuery.data])

  const isLoading =
    coursesQuery.isLoading ||
    assignmentQueries.some((q) => q.isLoading) ||
    submissionQueries.some((q) => q.isLoading) ||
    threadsQuery.isLoading

  if (isLoading) {
    return <StatePanel title="任务加载中" detail="正在汇总授课课程下的待办任务。" />
  }

  return (
    <div className="teacher-tasks-route">
      <section className="section-card wide-card">
        <div className="section-head">
          <h3>教学任务</h3>
          <p>跨课程汇总当前待处理事项。点击进入即自动带入上下文。</p>
        </div>
        <div className="task-summary-grid">
          <button
            type="button"
            className={queueTab === 'submissions' ? 'task-summary-tab active' : 'task-summary-tab'}
            onClick={() => setQueueTab('submissions')}
          >
            <span>待批改提交</span>
            <strong>{pendingSubmissions.length}</strong>
          </button>
          <button
            type="button"
            className={queueTab === 'feedbacks' ? 'task-summary-tab active' : 'task-summary-tab'}
            onClick={() => setQueueTab('feedbacks')}
          >
            <span>未回答作业反馈</span>
            <strong>{pendingFeedbacks.length}</strong>
          </button>
        </div>
      </section>

      {queueTab === 'submissions' ? (
        <section className="section-card wide-card">
          <div className="section-head">
            <h3>待批改提交</h3>
            <p>按提交时间倒序。点击进入对应课程的提交批改详情。</p>
          </div>
          {pendingSubmissions.length === 0 ? (
            <StatePanel title="暂无待批改提交" detail="所有提交都已批改完成。" />
          ) : (
            <div className="entity-list">
              {pendingSubmissions.map(({ submission, assignment, courseId, courseName }) => (
                <button
                  key={submission.id}
                  type="button"
                  className="entity-card"
                  onClick={() =>
                    navigate(`/teacher/courses/${courseId}/submissions/${submission.id}`)
                  }
                >
                  <div>
                    <strong>{submission.studentName ?? submission.studentId}</strong>
                    <span>{assignment.title}</span>
                  </div>
                  <p>{submission.content}</p>
                  <small>课程：{courseName}</small>
                  <small>提交时间：{formatDateTimeForDisplay(submission.submittedAt)}</small>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="section-card wide-card">
          <div className="section-head">
            <h3>未回答作业反馈</h3>
            <p>按发起时间倒序。点击进入反馈线程回复。</p>
          </div>
          {pendingFeedbacks.length === 0 ? (
            <StatePanel title="暂无待回答反馈" detail="所有学生反馈都已回应。" />
          ) : (
            <div className="entity-list">
              {pendingFeedbacks.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className="entity-card"
                  onClick={() => {
                    if (thread.courseId) {
                      navigate(`/teacher/courses/${thread.courseId}/feedbacks/${thread.id}`)
                    }
                  }}
                >
                  <div>
                    <strong>
                      {thread.studentName ?? thread.studentId} · {thread.assignmentTitle ?? '作业'}
                    </strong>
                    <span>{thread.kind === 'question' ? '问题' : '反馈'}</span>
                  </div>
                  <p>{thread.content}</p>
                  {thread.courseName ? <small>课程：{thread.courseName}</small> : null}
                  {thread.createdAt ? (
                    <small>发起：{formatDateTimeForDisplay(thread.createdAt)}</small>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
