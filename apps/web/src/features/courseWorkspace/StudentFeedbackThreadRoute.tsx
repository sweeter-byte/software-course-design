import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { FeedbackItem } from '../../domain'
import { confirmDestructive } from '../../utils/confirm'
import { formatDateTimeForDisplay } from '../../utils/date'
import { extractErrorMessage } from '../../utils/errors'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

export function StudentFeedbackThreadRoute() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { feedbackId } = useParams<{ feedbackId: string }>()
  const { apiBaseUrl, session } = useAuth()
  const queryClient = useQueryClient()
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

  const thread = threadsQuery.data?.items.find((item) => item.id === feedbackId) ?? null

  const [draft, setDraft] = useState<{ kind: 'question' | 'feedback'; content: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const editing = draft !== null

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!feedbackId || !draft) return null
      return api.updateFeedback(
        apiBaseUrl,
        session.accessToken,
        feedbackId,
        draft.kind,
        draft.content,
      )
    },
    onSuccess: () => {
      setError(null)
      setDraft(null)
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!feedbackId) return null
      return api.deleteFeedback(apiBaseUrl, session.accessToken, feedbackId)
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
      navigate(`/student/courses/${course.id}/feedbacks`, { replace: true })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  if (threadsQuery.isLoading) {
    return <StatePanel title="反馈加载中" detail="正在获取反馈线程。" />
  }

  if (!thread) {
    return <StatePanel title="未找到该反馈" detail="可能已被删除，或不属于当前课程。" />
  }

  const hasResponses = thread.responses.length > 0
  const teacherAlreadyAnswered = hasResponses

  return (
    <article className="feedback-thread-card">
      <header className="thread-meta">
        <span>{thread.kind === 'question' ? '我的问题' : '我的反馈'}</span>
        <strong>{hasResponses ? '已回答' : '未回答'}</strong>
      </header>

      <section className="section-card">
        <div className="section-head">
          <h3>作业上下文</h3>
          <p>批改后的提交与教师评语，仅可查看。</p>
        </div>
        <dl className="detail-list">
          <div>
            <dt>作业</dt>
            <dd>{thread.assignmentTitle ?? '未命名作业'}</dd>
          </div>
          <div>
            <dt>提交状态</dt>
            <dd>{thread.submissionStatus ?? '已批改'}</dd>
          </div>
          {thread.createdAt ? (
            <div>
              <dt>发起时间</dt>
              <dd>{formatDateTimeForDisplay(thread.createdAt)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="section-card">
        <div className="section-head">
          <h3>我的问题/反馈</h3>
          <p>
            {teacherAlreadyAnswered
              ? '该内容已有教师回答，修改或删除可能影响上下文。'
              : '可以修改或删除本条反馈。'}
          </p>
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
        {editing ? (
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault()
              updateMutation.mutate()
            }}
          >
            <label htmlFor="thread-kind">
              类型
              <select
                id="thread-kind"
                value={draft?.kind ?? 'question'}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, kind: event.target.value as 'question' | 'feedback' } : current,
                  )
                }
              >
                <option value="question">问题</option>
                <option value="feedback">反馈</option>
              </select>
            </label>
            <label htmlFor="thread-content">
              内容
              <textarea
                id="thread-content"
                required
                minLength={2}
                value={draft?.content ?? ''}
                onChange={(event) =>
                  setDraft((current) =>
                    current ? { ...current, content: event.target.value } : current,
                  )
                }
              />
            </label>
            <div className="inline-row">
              <button
                className="primary-button"
                type="submit"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? '保存中...' : '保存修改'}
              </button>
              <button className="ghost-button" type="button" onClick={() => setDraft(null)}>
                取消
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="thread-content">{thread.content}</p>
            <div className="inline-row">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setDraft({ kind: thread.kind, content: thread.content })}
              >
                修改
              </button>
              <button
                className="danger-button"
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirmDestructive('确认删除该问题/反馈吗？删除后无法恢复。')) {
                    deleteMutation.mutate()
                  }
                }}
              >
                {deleteMutation.isPending ? '删除中...' : '删除'}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="section-card">
        <div className="section-head">
          <h3>教师回复</h3>
          <p>按时间排序。教师可发布多条回复。</p>
        </div>
        {hasResponses ? (
          <ul className="response-list">
            {thread.responses.map((response) => (
              <li key={response.id} className="thread-response">
                <span>{response.teacherName ?? '教师'}</span>
                <p>{response.content}</p>
                {response.createdAt ? (
                  <small>{formatDateTimeForDisplay(response.createdAt)}</small>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <StatePanel title="暂无教师回复" detail="教师回复后会在这里展示。" />
        )}
      </section>
    </article>
  )
}
