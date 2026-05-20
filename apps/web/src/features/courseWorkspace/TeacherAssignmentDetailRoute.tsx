import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useParams } from 'react-router-dom'

import { ApiError, api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { AssignmentItem, SubmissionItem } from '../../domain'
import { confirmDestructive } from '../../utils/confirm'
import { formatDateTimeForDisplay, fromDateTimeLocalValue, toDateTimeLocalValue } from '../../utils/date'
import { friendlyErrorMessage } from '../../utils/errors'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

function extractErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return friendlyErrorMessage(error.message, error.details)
  }
  if (error instanceof Error) {
    return friendlyErrorMessage(error.message)
  }
  return '请求失败'
}

export function TeacherAssignmentDetailRoute() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const { apiBaseUrl, session } = useAuth()
  const queryClient = useQueryClient()

  const assignmentsQuery = useQuery<{ items: AssignmentItem[] }>({
    queryKey: ['assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as AssignmentItem[] }
    },
  })

  const assignment =
    assignmentsQuery.data?.items.find((item) => item.id === assignmentId) ?? null

  const submissionsQuery = useQuery<{ items: SubmissionItem[] }>({
    enabled: Boolean(assignmentId),
    queryKey: ['submissions', apiBaseUrl, session.accessToken, assignmentId],
    queryFn: async () => {
      if (!assignmentId) return { items: [] }
      const payload = await api.listSubmissions(apiBaseUrl, session.accessToken, assignmentId)
      return { items: payload.items as SubmissionItem[] }
    },
  })

  const [draft, setDraft] = useState<{
    title: string
    description: string
    requirement: string
    startAt: string
    dueAt: string
  } | null>(null)
  const [cancelReason, setCancelReason] = useState('教学计划调整，取消本次作业。')
  const [error, setError] = useState<string | null>(null)

  const isEditing = draft !== null

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!assignmentId || !draft) return null
      return api.updateAssignment(apiBaseUrl, session.accessToken, assignmentId, draft)
    },
    onSuccess: () => {
      setError(null)
      setDraft(null)
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!assignmentId) return null
      return api.cancelAssignment(apiBaseUrl, session.accessToken, assignmentId, cancelReason)
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  if (assignmentsQuery.isLoading) {
    return <StatePanel title="作业加载中" detail="正在获取作业详情。" />
  }

  if (!assignment) {
    return <StatePanel title="作业不存在" detail="该作业可能已被取消，或不属于当前课程。" />
  }

  const submissions = submissionsQuery.data?.items ?? []
  const gradedCount = submissions.filter((item) => item.status === 'graded').length
  const pendingCount = submissions.filter((item) => item.status === 'submitted').length
  const isCancelled = assignment.status === 'cancelled'

  return (
    <div className="course-assignment-detail-body">
      {error ? <p className="error-banner">{error}</p> : null}

      <section className="section-card">
        <div className="section-head">
          <h3>作业详情</h3>
          <p>查看作业基本信息和当前提交情况。</p>
        </div>
        <dl className="detail-list">
          <div>
            <dt>标题</dt>
            <dd>{assignment.title}</dd>
          </div>
          <div>
            <dt>描述</dt>
            <dd>{assignment.description}</dd>
          </div>
          <div>
            <dt>要求</dt>
            <dd>{assignment.requirement}</dd>
          </div>
          <div>
            <dt>开始时间</dt>
            <dd>{formatDateTimeForDisplay(assignment.startAt)}</dd>
          </div>
          <div>
            <dt>截止时间</dt>
            <dd>{formatDateTimeForDisplay(assignment.dueAt)}</dd>
          </div>
          <div>
            <dt>提交统计</dt>
            <dd>
              共 {submissions.length} 条 · 待批改 {pendingCount} · 已批改 {gradedCount}
            </dd>
          </div>
        </dl>
      </section>

      {!isCancelled ? (
        <section className="section-card">
          <div className="section-head">
            <h3>{isEditing ? '修改作业' : '作业操作'}</h3>
            <p>截止前可对未被学生提交的作业进行修改；取消会清除全部提交。</p>
          </div>
          {isEditing ? (
            <form
              className="stack-form"
              onSubmit={(event) => {
                event.preventDefault()
                updateMutation.mutate()
              }}
            >
              <label htmlFor="edit-assignment-title">
                作业标题
                <input
                  id="edit-assignment-title"
                  required
                  minLength={2}
                  value={draft?.title ?? ''}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, title: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label htmlFor="edit-assignment-description">
                作业描述
                <textarea
                  id="edit-assignment-description"
                  required
                  minLength={2}
                  value={draft?.description ?? ''}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, description: event.target.value } : current,
                    )
                  }
                />
              </label>
              <label htmlFor="edit-assignment-requirement">
                作业要求
                <textarea
                  id="edit-assignment-requirement"
                  required
                  minLength={2}
                  value={draft?.requirement ?? ''}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, requirement: event.target.value } : current,
                    )
                  }
                />
              </label>
              <div className="form-grid">
                <label htmlFor="edit-assignment-start">
                  开始时间
                  <input
                    id="edit-assignment-start"
                    type="datetime-local"
                    required
                    value={toDateTimeLocalValue(draft?.startAt ?? '')}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, startAt: fromDateTimeLocalValue(event.target.value) }
                          : current,
                      )
                    }
                  />
                </label>
                <label htmlFor="edit-assignment-due">
                  截止时间
                  <input
                    id="edit-assignment-due"
                    type="datetime-local"
                    required
                    value={toDateTimeLocalValue(draft?.dueAt ?? '')}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, dueAt: fromDateTimeLocalValue(event.target.value) }
                          : current,
                      )
                    }
                  />
                </label>
              </div>
              <div className="inline-row">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? '保存中...' : '保存修改'}
                </button>
                <button className="ghost-button" type="button" onClick={() => setDraft(null)}>
                  取消修改
                </button>
              </div>
            </form>
          ) : (
            <div className="stack-form">
              <div className="inline-row">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    setDraft({
                      title: assignment.title,
                      description: assignment.description,
                      requirement: assignment.requirement,
                      startAt: assignment.startAt,
                      dueAt: assignment.dueAt,
                    })
                  }
                >
                  修改作业
                </button>
              </div>
              <label htmlFor="cancel-reason">
                取消原因
                <input
                  id="cancel-reason"
                  required
                  minLength={2}
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                />
              </label>
              <button
                className="danger-button"
                type="button"
                disabled={cancelMutation.isPending}
                onClick={() => {
                  if (
                    confirmDestructive(
                      '确认取消该作业吗？此操作将清除所有学生在该作业下的提交记录，且不可恢复。',
                    )
                  ) {
                    cancelMutation.mutate()
                  }
                }}
              >
                {cancelMutation.isPending ? '取消中...' : '取消作业'}
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="section-card">
          <div className="section-head">
            <h3>作业已取消</h3>
            <p>取消后无法恢复，相关学生提交已被清除。</p>
          </div>
        </section>
      )}
    </div>
  )
}
