import { useDeferredValue, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { ApiError, api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { CourseItem } from '../../domain'
import { friendlyErrorMessage } from '../../utils/errors'

const STATUS_LABELS: Record<string, string> = {
  not_started: '未开始',
  active: '开课中',
  completed: '已结课',
  suspended: '暂停',
  cancelled: '已取消',
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '全部状态' },
  { value: 'not_started', label: '未开始' },
  { value: 'active', label: '开课中' },
  { value: 'completed', label: '已结课' },
  { value: 'suspended', label: '暂停' },
]

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
  courseCode: string
  courseName: string
  teacherId: string
  semester: string
  description: string
  location: string
  scheduleText: string
  capacity: string
  startDate: string
  endDate: string
}

function makeBlankDraft(): DraftState {
  return {
    courseCode: '',
    courseName: '',
    teacherId: '',
    semester: '',
    description: '',
    location: '',
    scheduleText: '',
    capacity: '60',
    startDate: '2026-03-01',
    endDate: '2026-07-01',
  }
}

export function OfficerCourseListRoute() {
  const { apiBaseUrl, session } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [keyword, setKeyword] = useState('')
  const [semester, setSemester] = useState('')
  const [status, setStatus] = useState('')
  const deferredKeyword = useDeferredValue(keyword)
  const deferredSemester = useDeferredValue(semester)
  const deferredStatus = useDeferredValue(status)
  const [draft, setDraft] = useState<DraftState>(() => makeBlankDraft())
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const coursesQuery = useQuery<{ items: CourseItem[] }>({
    queryKey: [
      'courses',
      apiBaseUrl,
      session.accessToken,
      deferredKeyword,
      deferredSemester,
      deferredStatus,
    ],
    queryFn: async () => {
      const payload = await api.listCourses(apiBaseUrl, session.accessToken, {
        keyword: deferredKeyword,
        semester: deferredSemester,
        status: deferredStatus,
      })
      return { items: payload.items as CourseItem[] }
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.createCourse(apiBaseUrl, session.accessToken, {
        courseCode: draft.courseCode,
        courseName: draft.courseName,
        teacherId: draft.teacherId,
        semester: draft.semester,
        description: draft.description,
        location: draft.location,
        scheduleText: draft.scheduleText,
        capacity: Number(draft.capacity),
        startDate: draft.startDate,
        endDate: draft.endDate,
      })
    },
    onSuccess: (payload) => {
      setError(null)
      setShowCreate(false)
      setDraft(makeBlankDraft())
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      const created = payload.course as { id?: string } | undefined
      if (created?.id) {
        navigate(`/officer/courses/${created.id}`)
      }
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const courses = coursesQuery.data?.items ?? []

  return (
    <div className="officer-course-list-route">
      {error ? <p className="error-banner">{error}</p> : null}

      <section className="section-card wide-card">
        <div className="section-head">
          <h3>课程运营</h3>
          <p>覆盖课程的添加、查询、修改、删除全生命周期。</p>
        </div>
        <div className="form-grid">
          <label htmlFor="officer-course-keyword">
            搜索
            <input
              id="officer-course-keyword"
              placeholder="按课程名称 / 课程代码"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <label htmlFor="officer-course-semester">
            学期
            <input
              id="officer-course-semester"
              placeholder="例如 2026 春"
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
            />
          </label>
          <label htmlFor="officer-course-status">
            状态
            <select
              id="officer-course-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="inline-row">
          <button
            className="primary-button"
            type="button"
            onClick={() => setShowCreate((prev) => !prev)}
          >
            {showCreate ? '关闭新建表单' : '新建课程'}
          </button>
        </div>

        {showCreate ? (
          <form
            className="stack-form"
            onSubmit={(event) => {
              event.preventDefault()
              createMutation.mutate()
            }}
          >
            <div className="form-grid">
              <label htmlFor="new-course-code">
                课程代码
                <input
                  id="new-course-code"
                  required
                  minLength={2}
                  value={draft.courseCode}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, courseCode: event.target.value }))
                  }
                />
              </label>
              <label htmlFor="new-course-name">
                课程名称
                <input
                  id="new-course-name"
                  required
                  minLength={2}
                  value={draft.courseName}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, courseName: event.target.value }))
                  }
                />
              </label>
              <label htmlFor="new-course-teacher">
                授课教师编号
                <input
                  id="new-course-teacher"
                  required
                  value={draft.teacherId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, teacherId: event.target.value }))
                  }
                />
              </label>
              <label htmlFor="new-course-semester">
                开课学期
                <input
                  id="new-course-semester"
                  required
                  minLength={2}
                  value={draft.semester}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, semester: event.target.value }))
                  }
                />
              </label>
              <label htmlFor="new-course-location">
                授课地点
                <input
                  id="new-course-location"
                  required
                  value={draft.location}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, location: event.target.value }))
                  }
                />
              </label>
              <label htmlFor="new-course-schedule">
                上课时间
                <input
                  id="new-course-schedule"
                  required
                  value={draft.scheduleText}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, scheduleText: event.target.value }))
                  }
                />
              </label>
            </div>
            <label htmlFor="new-course-description">
              课程简介
              <textarea
                id="new-course-description"
                required
                minLength={2}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <div className="form-grid">
              <label htmlFor="new-course-capacity">
                课程人数上限
                <input
                  id="new-course-capacity"
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={draft.capacity}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, capacity: event.target.value }))
                  }
                />
              </label>
              <label htmlFor="new-course-start">
                开课日期
                <input
                  id="new-course-start"
                  type="date"
                  required
                  value={draft.startDate}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, startDate: event.target.value }))
                  }
                />
              </label>
              <label htmlFor="new-course-end">
                结课日期
                <input
                  id="new-course-end"
                  type="date"
                  required
                  value={draft.endDate}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, endDate: event.target.value }))
                  }
                />
              </label>
            </div>
            <button className="primary-button" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? '创建中...' : '创建课程'}
            </button>
          </form>
        ) : null}

        {coursesQuery.isLoading ? (
          <StatePanel title="课程加载中" detail="正在同步课程列表。" />
        ) : courses.length === 0 ? (
          <StatePanel title="没有匹配的课程" detail="可以调整筛选条件，或新建课程。" />
        ) : (
          <div className="entity-list">
            {courses.map((course) => (
              <button
                key={course.id}
                type="button"
                className="entity-card"
                onClick={() => navigate(`/officer/courses/${course.id}`)}
              >
                <div>
                  <strong>{course.courseName}</strong>
                  <span>{course.courseCode}</span>
                </div>
                <p>{course.location}</p>
                <small>{course.scheduleText}</small>
                <small>学期：{course.semester}</small>
                <small>状态：{STATUS_LABELS[course.status] ?? course.status}</small>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
