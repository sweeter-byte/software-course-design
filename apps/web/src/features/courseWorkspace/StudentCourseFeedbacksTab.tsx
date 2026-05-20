import { useQuery } from '@tanstack/react-query'
import { Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { FeedbackItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  open: '未回答',
  answered: '已回答',
  resolved: '已回答',
  closed: '已关闭',
}

export function StudentCourseFeedbacksTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()
  const params = useParams<{ courseId: string; feedbackId?: string }>()
  const navigate = useNavigate()

  const threadsQuery = useQuery<{ items: FeedbackItem[] }>({
    queryKey: ['feedbackThreads', apiBaseUrl, session.accessToken, course.id, 'student'],
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
            列出本课程下我已发起的问题或反馈。点击进入线程查看教师回复。
          </p>
        </header>
        {threadsQuery.isLoading ? (
          <StatePanel title="反馈加载中" detail="正在同步反馈线程。" />
        ) : threads.length === 0 ? (
          <StatePanel
            title="还没有反馈"
            detail="作业批改完成后，可在作业详情页点击「我有问题/反馈」发起。"
          />
        ) : (
          <div className="entity-list">
            {threads.map((thread) => {
              const hasResponse = thread.responses.length > 0
              return (
                <button
                  key={thread.id}
                  type="button"
                  className={selectedFeedbackId === thread.id ? 'entity-card active' : 'entity-card'}
                  onClick={() =>
                    navigate(`/student/courses/${course.id}/feedbacks/${thread.id}`)
                  }
                >
                  <div>
                    <strong>{thread.assignmentTitle ?? '作业'}</strong>
                    <span>{thread.kind === 'question' ? '问题' : '反馈'}</span>
                  </div>
                  <p>{thread.content}</p>
                  <small>
                    状态：
                    {hasResponse
                      ? FEEDBACK_STATUS_LABELS.answered
                      : FEEDBACK_STATUS_LABELS.open}
                  </small>
                  {thread.createdAt ? (
                    <small>发起时间：{formatDateTimeForDisplay(thread.createdAt)}</small>
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
            detail="在左侧选择一条问题或反馈以查看详情。"
          />
        )}
      </section>
    </div>
  )
}
