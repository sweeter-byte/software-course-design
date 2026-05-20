import { useQuery } from '@tanstack/react-query'
import { Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { FeedbackItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

export function TeacherCourseFeedbacksTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()
  const params = useParams<{ courseId: string; feedbackId?: string }>()
  const navigate = useNavigate()

  const threadsQuery = useQuery<{ items: FeedbackItem[] }>({
    queryKey: ['feedbackThreads', apiBaseUrl, session.accessToken, course.id, 'teacher'],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {
        courseId: course.id,
      })
      return { items: payload.items as FeedbackItem[] }
    },
  })

  const threads = threadsQuery.data?.items ?? []
  const selectedFeedbackId = params.feedbackId ?? null

  return (
    <div className="course-tab-content course-feedbacks-layout">
      <aside className="feedback-thread-list">
        <header>
          <h3>作业反馈</h3>
          <p className="muted-paragraph">
            列出本课程下学生发起的作业问题或反馈，点击进入回复。
          </p>
        </header>
        {threadsQuery.isLoading ? (
          <StatePanel title="反馈加载中" detail="正在同步反馈线程。" />
        ) : threads.length === 0 ? (
          <StatePanel title="暂无反馈" detail="当前课程范围内没有学生作业反馈。" />
        ) : (
          <div className="entity-list">
            {threads.map((thread) => {
              const answered = thread.responses.length > 0
              const cardClassName = [
                'entity-card',
                'feedback-thread-card',
                answered ? 'feedback-thread-card--answered' : 'feedback-thread-card--pending',
                selectedFeedbackId === thread.id ? 'active' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={thread.id}
                  type="button"
                  className={cardClassName}
                  onClick={() => navigate(`/teacher/courses/${course.id}/feedbacks/${thread.id}`)}
                >
                  <div>
                    <strong>
                      {thread.studentName ?? thread.studentId} · {thread.assignmentTitle ?? '作业'}
                    </strong>
                    <span className="feedback-card-tags">
                      <span className="feedback-card-tag feedback-card-tag--kind">
                        {thread.kind === 'question' ? '问题' : '反馈'}
                      </span>
                      <span
                        className={
                          answered
                            ? 'feedback-card-tag feedback-card-tag--answered'
                            : 'feedback-card-tag feedback-card-tag--pending'
                        }
                      >
                        {answered ? '已回答' : '未回答'}
                      </span>
                    </span>
                  </div>
                  <p>{thread.content}</p>
                  {thread.createdAt ? (
                    <small>发起：{formatDateTimeForDisplay(thread.createdAt)}</small>
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
            detail="在左侧选择一条问题或反馈进入回答页面。"
          />
        )}
      </section>
    </div>
  )
}
