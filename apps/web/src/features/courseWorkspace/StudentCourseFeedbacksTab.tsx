import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { AssignmentItem, FeedbackItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

interface AggregatedRow {
  assignmentId: string
  assignmentTitle: string
  score: string
  teacherFeedback: string
  thread: FeedbackItem | null
  hasThread: boolean
  hasResponse: boolean
}

function truncate(text: string, max = 80): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

export function StudentCourseFeedbacksTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()
  const params = useParams<{ courseId: string; feedbackId?: string }>()
  const navigate = useNavigate()

  // Per §2.5 the aggregation key is "已批改作业" — students may not have
  // raised a thread yet, but the row should still appear so they can do so.
  const assignmentsQuery = useQuery<{ items: AssignmentItem[] }>({
    queryKey: ['assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as AssignmentItem[] }
    },
  })

  const threadsQuery = useQuery<{ items: FeedbackItem[] }>({
    queryKey: ['feedbackThreads', apiBaseUrl, session.accessToken, course.id, 'student'],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {
        courseId: course.id,
      })
      return { items: payload.items as FeedbackItem[] }
    },
  })

  const rows: AggregatedRow[] = useMemo(() => {
    const assignments = assignmentsQuery.data?.items ?? []
    const threads = threadsQuery.data?.items ?? []
    const gradedAssignments = assignments.filter(
      (assignment) => assignment.mySubmission?.status === 'graded',
    )
    return gradedAssignments.map((assignment) => {
      const submission = assignment.mySubmission
      const thread =
        threads.find((item) => item.assignmentId === assignment.id) ?? null
      return {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        score:
          submission?.score == null ? '暂无分数' : `${submission.score} 分`,
        teacherFeedback: submission?.teacherFeedback
          ? truncate(submission.teacherFeedback)
          : '教师暂未填写评语。',
        thread,
        hasThread: thread !== null,
        hasResponse: thread !== null && thread.responses.length > 0,
      }
    })
  }, [assignmentsQuery.data, threadsQuery.data])

  const selectedFeedbackId = params.feedbackId ?? null

  return (
    <div className="course-tab-content course-feedbacks-layout">
      <aside className="feedback-thread-list">
        <header>
          <h3>作业反馈</h3>
          <p className="muted-paragraph">
            按本课程的已批改作业聚合。点击有线程的条目进入详情；没有线程的条目跳转到作业详情发起反馈。
          </p>
        </header>
        {assignmentsQuery.isLoading || threadsQuery.isLoading ? (
          <StatePanel title="反馈加载中" detail="正在同步作业与反馈线程。" />
        ) : rows.length === 0 ? (
          <StatePanel
            title="还没有可反馈的作业"
            detail="作业批改完成后会在这里出现，可对每条已批改作业发起问题或反馈。"
          />
        ) : (
          <div className="entity-list">
            {rows.map((row) => {
              const threadId = row.thread?.id
              const isActive = threadId != null && threadId === selectedFeedbackId
              return (
                <button
                  key={row.assignmentId}
                  type="button"
                  className={isActive ? 'entity-card active' : 'entity-card'}
                  onClick={() => {
                    if (threadId) {
                      navigate(`/student/courses/${course.id}/feedbacks/${threadId}`)
                    } else {
                      navigate(
                        `/student/courses/${course.id}/assignments/${row.assignmentId}`,
                      )
                    }
                  }}
                >
                  <div>
                    <strong>{row.assignmentTitle}</strong>
                    <span>{row.score}</span>
                  </div>
                  <p>{row.teacherFeedback}</p>
                  <small>
                    是否已发起：{row.hasThread ? '已发起' : '未发起'}
                  </small>
                  <small>
                    教师是否回复：{row.hasResponse ? '已回复' : '未回复'}
                  </small>
                  {row.thread?.createdAt ? (
                    <small>发起时间：{formatDateTimeForDisplay(row.thread.createdAt)}</small>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </aside>

      <section className="feedback-thread-detail">
        {selectedFeedbackId ? (
          <Outlet context={{ course } as CourseWorkspaceOutletContext} />
        ) : (
          <StatePanel
            title="尚未选择反馈"
            detail="在左侧选择一条已有反馈线程的条目以查看详情，或点击未发起的作业去发起反馈。"
          />
        )}
      </section>
    </div>
  )
}
