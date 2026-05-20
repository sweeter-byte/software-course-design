import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { CourseFeedbackItem } from '../../domain'
import { confirmDestructive } from '../../utils/confirm'
import { formatDateTimeForDisplay } from '../../utils/date'
import { extractErrorMessage } from '../../utils/errors'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

type Dimension = CourseFeedbackItem['dimension']

const DIMENSION_LABELS: Record<Dimension, string> = {
  content: '课程内容',
  method: '教学方法',
  teaching: '教师授课',
  gain: '学习收获',
  other: '其他建议',
}

const DEFAULT_DRAFT: { dimension: Dimension; content: string } = {
  dimension: 'teaching',
  content: '',
}

export function StudentCourseFeedbacksOverallTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()
  const queryClient = useQueryClient()

  const [draft, setDraft] = useState(DEFAULT_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const feedbacksQuery = useQuery<{ items: CourseFeedbackItem[] }>({
    queryKey: ['courseFeedbacks', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listCourseFeedbacks(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as CourseFeedbackItem[] }
    },
  })

  const myFeedbacks = (feedbacksQuery.data?.items ?? []).filter(
    (item) => item.studentId === session.user.id,
  )

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.createCourseFeedback(apiBaseUrl, session.accessToken, course.id, draft)
    },
    onSuccess: () => {
      setDraft(DEFAULT_DRAFT)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['courseFeedbacks'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return null
      return api.updateCourseFeedback(apiBaseUrl, session.accessToken, editingId, draft)
    },
    onSuccess: () => {
      setDraft(DEFAULT_DRAFT)
      setEditingId(null)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['courseFeedbacks'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.deleteCourseFeedback(apiBaseUrl, session.accessToken, id)
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['courseFeedbacks'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  return (
    <div className="course-tab-content">
      <article className="section-card wide-card">
        <div className="section-head">
          <h3>{editingId ? '修改课程整体反馈' : '提交课程整体反馈'}</h3>
          <p>按维度提交对本课程的整体看法，可多次提交。</p>
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (editingId) {
              updateMutation.mutate()
            } else {
              createMutation.mutate()
            }
          }}
        >
          <label htmlFor="course-feedback-dimension">
            反馈维度
            <select
              id="course-feedback-dimension"
              value={draft.dimension}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  dimension: event.target.value as Dimension,
                }))
              }
            >
              {Object.entries(DIMENSION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="course-feedback-content">
            反馈内容
            <textarea
              id="course-feedback-content"
              required
              minLength={2}
              value={draft.content}
              onChange={(event) =>
                setDraft((current) => ({ ...current, content: event.target.value }))
              }
            />
          </label>
          <div className="inline-row">
            <button
              className="primary-button"
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId
                ? updateMutation.isPending
                  ? '保存中...'
                  : '保存修改'
                : createMutation.isPending
                  ? '提交中...'
                  : '提交反馈'}
            </button>
            {editingId ? (
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setDraft(DEFAULT_DRAFT)
                }}
              >
                取消修改
              </button>
            ) : null}
          </div>
        </form>
      </article>

      <article className="section-card wide-card">
        <div className="section-head">
          <h3>我的课程整体反馈</h3>
          <p>仅展示我已提交的反馈，可修改或删除。</p>
        </div>
        {feedbacksQuery.isLoading ? (
          <StatePanel title="反馈加载中" detail="正在获取我的课程反馈。" />
        ) : myFeedbacks.length === 0 ? (
          <StatePanel title="还未提交课程反馈" detail="可以使用上方表单提交。" />
        ) : (
          <ul className="response-list">
            {myFeedbacks.map((feedback) => (
              <li key={feedback.id} className="thread-card">
                <span className="thread-tag">{DIMENSION_LABELS[feedback.dimension]}</span>
                <p>{feedback.content}</p>
                {feedback.createdAt ? (
                  <small>提交于 {formatDateTimeForDisplay(feedback.createdAt)}</small>
                ) : null}
                <div className="inline-row">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      setEditingId(feedback.id)
                      setDraft({ dimension: feedback.dimension, content: feedback.content })
                    }}
                  >
                    修改
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirmDestructive('确认删除该课程反馈吗？删除后无法恢复。')) {
                        deleteMutation.mutate(feedback.id)
                      }
                    }}
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  )
}
