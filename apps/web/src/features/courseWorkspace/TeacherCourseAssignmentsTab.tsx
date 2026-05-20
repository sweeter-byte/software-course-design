import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import { createDefaultAssignmentDates } from '../../demo-defaults'
import type { AssignmentItem } from '../../domain'
import { assignmentStatusLabel } from '../../utils/assignment-status'
import { fromDateTimeLocalValue, toDateTimeLocalValue, formatDateTimeForDisplay } from '../../utils/date'
import { extractErrorMessage } from '../../utils/errors'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

interface DraftState {
  title: string
  description: string
  requirement: string
  startAt: string
  dueAt: string
}

function makeBlankDraft(): DraftState {
  return {
    title: '',
    description: '',
    requirement: '',
    ...createDefaultAssignmentDates(),
  }
}

export function TeacherCourseAssignmentsTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()
  const params = useParams<{ courseId: string; assignmentId?: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [draft, setDraft] = useState<DraftState>(() => makeBlankDraft())
  const [error, setError] = useState<string | null>(null)
  // Snapshot wall-clock once per mount so derivation stays pure during render.
  const [nowMs] = useState(() => Date.now())

  const assignmentsQuery = useQuery<{ items: AssignmentItem[] }>({
    queryKey: ['assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as AssignmentItem[] }
    },
  })

  const assignments = assignmentsQuery.data?.items ?? []
  const selectedAssignmentId = params.assignmentId ?? null

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.createAssignment(apiBaseUrl, session.accessToken, course.id, draft)
    },
    onSuccess: (payload) => {
      setError(null)
      setDraft(makeBlankDraft())
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      const created = payload.assignment as { id?: string } | undefined
      if (created?.id) {
        navigate(`/teacher/courses/${course.id}/assignments/${created.id}`)
      }
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  return (
    <div className="course-tab-content course-assignments-layout">
      <aside className="course-assignment-list">
        <header>
          <h3>作业列表</h3>
          <p className="muted-paragraph">点击作业进入详情页编辑或取消，下面表单可发布新作业。</p>
        </header>
        {assignmentsQuery.isLoading ? (
          <StatePanel title="作业加载中" detail="正在同步课程作业。" />
        ) : assignments.length === 0 ? (
          <StatePanel title="暂无作业" detail="使用下方表单发布第一次作业。" />
        ) : (
          <div className="entity-list">
            {assignments.map((assignment) => (
              <button
                key={assignment.id}
                type="button"
                className={
                  selectedAssignmentId === assignment.id ? 'entity-card active' : 'entity-card'
                }
                onClick={() => navigate(`/teacher/courses/${course.id}/assignments/${assignment.id}`)}
              >
                <div>
                  <strong>{assignment.title}</strong>
                  <span>{assignmentStatusLabel(assignment, nowMs)}</span>
                </div>
                <p>{assignment.description}</p>
                <small>截止：{formatDateTimeForDisplay(assignment.dueAt)}</small>
              </button>
            ))}
          </div>
        )}

        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault()
            createMutation.mutate()
          }}
        >
          <h4>发布新作业</h4>
          {error ? <p className="error-banner">{error}</p> : null}
          <label htmlFor="new-assignment-title">
            作业标题
            <input
              id="new-assignment-title"
              required
              minLength={2}
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label htmlFor="new-assignment-description">
            作业描述
            <textarea
              id="new-assignment-description"
              required
              minLength={2}
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>
          <label htmlFor="new-assignment-requirement">
            作业要求
            <textarea
              id="new-assignment-requirement"
              required
              minLength={2}
              value={draft.requirement}
              onChange={(event) =>
                setDraft((current) => ({ ...current, requirement: event.target.value }))
              }
            />
          </label>
          <div className="form-grid">
            <label htmlFor="new-assignment-start">
              开始时间
              <input
                id="new-assignment-start"
                type="datetime-local"
                required
                value={toDateTimeLocalValue(draft.startAt)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    startAt: fromDateTimeLocalValue(event.target.value),
                  }))
                }
              />
            </label>
            <label htmlFor="new-assignment-due">
              截止时间
              <input
                id="new-assignment-due"
                type="datetime-local"
                required
                value={toDateTimeLocalValue(draft.dueAt)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dueAt: fromDateTimeLocalValue(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? '发布中...' : '发布作业'}
          </button>
        </form>
      </aside>

      <section className="course-assignment-detail">
        {selectedAssignmentId ? (
          <Outlet context={{ course } as CourseWorkspaceOutletContext} />
        ) : (
          <StatePanel
            title="尚未选择作业"
            detail="点击左侧某条作业进入详情，或在下方表单发布新作业。"
          />
        )}
      </section>
    </div>
  )
}
