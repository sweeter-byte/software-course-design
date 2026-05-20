import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useParams } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { FeedbackItem, SubmissionItem } from '../../domain'
import { confirmDestructive } from '../../utils/confirm'
import { formatDateTimeForDisplay } from '../../utils/date'
import { extractErrorMessage } from '../../utils/errors'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

export function TeacherFeedbackThreadRoute() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { feedbackId } = useParams<{ feedbackId: string }>()
  const { apiBaseUrl, session } = useAuth()
  const queryClient = useQueryClient()

  const threadsQuery = useQuery<{ items: FeedbackItem[] }>({
    queryKey: ['feedbackThreads', apiBaseUrl, session.accessToken, course.id, 'teacher'],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {
        courseId: course.id,
      })
      return { items: payload.items as FeedbackItem[] }
    },
  })

  const thread = threadsQuery.data?.items.find((item) => item.id === feedbackId) ?? null

  const submissionQuery = useQuery<{ submission: SubmissionItem }>({
    enabled: Boolean(thread?.submissionId),
    queryKey: ['submission-detail', apiBaseUrl, session.accessToken, thread?.submissionId],
    queryFn: async () => {
      if (!thread?.submissionId) throw new Error('missing submission')
      const payload = await api.getSubmission(apiBaseUrl, session.accessToken, thread.submissionId)
      return { submission: payload.submission as SubmissionItem }
    },
  })

  const [responseDraft, setResponseDraft] = useState('')
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createResponseMutation = useMutation({
    mutationFn: async () => {
      if (!feedbackId) return null
      return api.createResponse(apiBaseUrl, session.accessToken, feedbackId, responseDraft)
    },
    onSuccess: () => {
      setError(null)
      setResponseDraft('')
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const updateResponseMutation = useMutation({
    mutationFn: async () => {
      if (!editingResponseId) return null
      return api.updateResponse(
        apiBaseUrl,
        session.accessToken,
        editingResponseId,
        editingContent,
      )
    },
    onSuccess: () => {
      setError(null)
      setEditingResponseId(null)
      setEditingContent('')
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const deleteResponseMutation = useMutation({
    mutationFn: async (responseId: string) => {
      return api.deleteResponse(apiBaseUrl, session.accessToken, responseId)
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  if (threadsQuery.isLoading) {
    return <StatePanel title="反馈加载中" detail="正在获取反馈线程。" />
  }

  if (!thread) {
    return <StatePanel title="未找到反馈" detail="该反馈可能已被删除。" />
  }

  const submission = submissionQuery.data?.submission ?? null

  return (
    <article className="feedback-thread-card">
      {error ? <p className="error-banner">{error}</p> : null}

      <section className="section-card">
        <div className="section-head">
          <h3>提交上下文</h3>
          <p>批改后的学生提交与教师评语，仅可查看。</p>
        </div>
        {submission ? (
          <dl className="detail-list">
            <div>
              <dt>学生</dt>
              <dd>
                {submission.studentName ?? submission.studentId}
                {submission.studentNo ? `（${submission.studentNo}）` : ''}
              </dd>
            </div>
            <div>
              <dt>提交内容</dt>
              <dd>{submission.content}</dd>
            </div>
            <div>
              <dt>分数</dt>
              <dd>{submission.score == null ? '暂无分数' : `${submission.score} 分`}</dd>
            </div>
            <div>
              <dt>批改回复</dt>
              <dd>{submission.teacherFeedback ?? '教师暂未填写评语。'}</dd>
            </div>
          </dl>
        ) : (
          <StatePanel title="正在加载提交" detail="批改详情同步中。" />
        )}
      </section>

      <section className="section-card">
        <div className="section-head">
          <h3>{thread.kind === 'question' ? '学生问题' : '学生反馈'}</h3>
          <p>
            发起人：{thread.studentName ?? thread.studentId} ·{' '}
            {thread.createdAt ? formatDateTimeForDisplay(thread.createdAt) : ''}
          </p>
        </div>
        <p className="thread-content">{thread.content}</p>
      </section>

      <section className="section-card">
        <div className="section-head">
          <h3>教师回复</h3>
          <p>按时间排序。可发布多条回复。</p>
        </div>
        {thread.responses.length === 0 ? (
          <StatePanel title="尚无回复" detail="使用下方表单发布回复。" />
        ) : (
          <ul className="response-list">
            {thread.responses.map((response) => {
              // §3.3.4 / §5.6: 修改 / 删除 仅限自己发布的回答。
              const isMine = response.teacherId === session.user.id
              return (
              <li key={response.id} className="thread-response">
                <span>
                  {response.teacherName ?? '教师'}
                  {isMine ? '（我）' : ''}
                </span>
                {editingResponseId === response.id ? (
                  <form
                    className="inline-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      updateResponseMutation.mutate()
                    }}
                  >
                    <input
                      aria-label="修改回复内容"
                      required
                      minLength={2}
                      value={editingContent}
                      onChange={(event) => setEditingContent(event.target.value)}
                    />
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={updateResponseMutation.isPending}
                    >
                      保存
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => {
                        setEditingResponseId(null)
                        setEditingContent('')
                      }}
                    >
                      取消
                    </button>
                  </form>
                ) : (
                  <>
                    <p>{response.content}</p>
                    {response.createdAt ? (
                      <small>{formatDateTimeForDisplay(response.createdAt)}</small>
                    ) : null}
                    {isMine ? (
                    <div className="inline-row">
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => {
                          setEditingResponseId(response.id)
                          setEditingContent(response.content)
                        }}
                      >
                        修改
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        disabled={deleteResponseMutation.isPending}
                        onClick={() => {
                          if (confirmDestructive('确认删除该回复吗？')) {
                            deleteResponseMutation.mutate(response.id)
                          }
                        }}
                      >
                        删除
                      </button>
                    </div>
                    ) : null}
                  </>
                )}
              </li>
              )
            })}
          </ul>
        )}

        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault()
            createResponseMutation.mutate()
          }}
        >
          <label htmlFor="new-response-content">
            新增回复
            <textarea
              id="new-response-content"
              required
              minLength={2}
              value={responseDraft}
              onChange={(event) => setResponseDraft(event.target.value)}
            />
          </label>
          <button
            className="primary-button"
            type="submit"
            disabled={createResponseMutation.isPending}
          >
            {createResponseMutation.isPending ? '发布中...' : '发布回复'}
          </button>
        </form>
      </section>
    </article>
  )
}
