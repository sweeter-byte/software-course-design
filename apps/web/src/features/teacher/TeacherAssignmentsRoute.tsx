import { useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { ApiError, api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import { createDefaultAssignmentDates } from '../../demo-defaults'
import type { AssignmentItem, CourseItem } from '../../domain'
import { fromDateTimeLocalValue, toDateTimeLocalValue, formatDateTimeForDisplay } from '../../utils/date'
import { friendlyErrorMessage } from '../../utils/errors'

const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  closed: '已截止',
  cancelled: '已取消',
}

function extractErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return friendlyErrorMessage(error.message, error.details)
  }
  if (error instanceof Error) {
    return friendlyErrorMessage(error.message)
  }
  return '请求失败'
}

interface DraftState {
  courseId: string
  title: string
  description: string
  requirement: string
  startAt: string
  dueAt: string
}

function makeBlankDraft(courseId = ''): DraftState {
  return {
    courseId,
    title: '',
    description: '',
    requirement: '',
    ...createDefaultAssignmentDates(),
  }
}

export function TeacherAssignmentsRoute() {
  const { apiBaseUrl, session } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
    const merged: Array<AssignmentItem & { courseName: string }> = []
    assignmentQueries.forEach((query, index) => {
      const course = myCourses[index]
      if (!query.data || !course) return
      for (const assignment of query.data.items) {
        merged.push({ ...assignment, courseName: course.courseName })
      }
    })
    return merged
  }, [assignmentQueries, myCourses])

  const isLoading = coursesQuery.isLoading || assignmentQueries.some((q) => q.isLoading)

  const [courseFilter, setCourseFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [draft, setDraft] = useState<DraftState>(() => makeBlankDraft())
  const [error, setError] = useState<string | null>(null)

  const filteredAssignments = useMemo(() => {
    return [...allAssignments]
      .filter((assignment) => (courseFilter ? assignment.courseId === courseFilter : true))
      .filter((assignment) => (statusFilter ? assignment.status === statusFilter : true))
      .sort((a, b) => (a.dueAt < b.dueAt ? 1 : -1))
  }, [allAssignments, courseFilter, statusFilter])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!draft.courseId) {
        throw new Error('请先选择课程')
      }
      return api.createAssignment(apiBaseUrl, session.accessToken, draft.courseId, {
        title: draft.title,
        description: draft.description,
        requirement: draft.requirement,
        startAt: draft.startAt,
        dueAt: draft.dueAt,
      })
    },
    onSuccess: (payload) => {
      setError(null)
      setDraft(makeBlankDraft())
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      const created = payload.assignment as { id?: string; courseId?: string } | undefined
      if (created?.id && created?.courseId) {
        navigate(`/teacher/courses/${created.courseId}/assignments/${created.id}`)
      }
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  if (isLoading) {
    return <StatePanel title="作业加载中" detail="正在同步授课课程下的作业。" />
  }

  if (myCourses.length === 0) {
    return (
      <StatePanel
        title="尚未分配课程"
        detail="当前账号没有授课课程，请联系教务员分配课程后再使用本入口。"
      />
    )
  }

  return (
    <div className="teacher-assignments-route">
      {error ? <p className="error-banner">{error}</p> : null}

      <section className="section-card wide-card">
        <div className="section-head">
          <h3>跨课程作业</h3>
          <p>覆盖所有授课课程的作业对象，点击进入对应课程工作区的作业详情。</p>
        </div>
        <div className="form-grid">
          <label htmlFor="filter-course">
            课程
            <select
              id="filter-course"
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
            >
              <option value="">全部课程</option>
              {myCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.courseName}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="filter-status">
            状态
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">全部状态</option>
              {Object.entries(ASSIGNMENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {filteredAssignments.length === 0 ? (
          <StatePanel title="没有匹配的作业" detail="可以调整筛选条件，或在下方发布新作业。" />
        ) : (
          <div className="entity-list">
            {filteredAssignments.map((assignment) => (
              <button
                key={assignment.id}
                type="button"
                className="entity-card"
                onClick={() =>
                  navigate(`/teacher/courses/${assignment.courseId}/assignments/${assignment.id}`)
                }
              >
                <div>
                  <strong>{assignment.title}</strong>
                  <span>{ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status}</span>
                </div>
                <p>{assignment.description}</p>
                <small>课程：{assignment.courseName}</small>
                <small>截止：{formatDateTimeForDisplay(assignment.dueAt)}</small>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="section-card wide-card">
        <div className="section-head">
          <h3>发布作业</h3>
          <p>必须先选择课程；可选课程仅限本人授课课程。</p>
        </div>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault()
            createMutation.mutate()
          }}
        >
          <label htmlFor="new-cross-assignment-course">
            课程
            <select
              id="new-cross-assignment-course"
              required
              value={draft.courseId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, courseId: event.target.value }))
              }
            >
              <option value="">请选择课程</option>
              {myCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.courseName}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="new-cross-assignment-title">
            作业标题
            <input
              id="new-cross-assignment-title"
              required
              minLength={2}
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label htmlFor="new-cross-assignment-description">
            作业描述
            <textarea
              id="new-cross-assignment-description"
              required
              minLength={2}
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>
          <label htmlFor="new-cross-assignment-requirement">
            作业要求
            <textarea
              id="new-cross-assignment-requirement"
              required
              minLength={2}
              value={draft.requirement}
              onChange={(event) =>
                setDraft((current) => ({ ...current, requirement: event.target.value }))
              }
            />
          </label>
          <div className="form-grid">
            <label htmlFor="new-cross-assignment-start">
              开始时间
              <input
                id="new-cross-assignment-start"
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
            <label htmlFor="new-cross-assignment-due">
              截止时间
              <input
                id="new-cross-assignment-due"
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
      </section>
    </div>
  )
}
