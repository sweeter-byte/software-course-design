import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { AdminUserItem, CourseItem } from '../../domain'
import { extractErrorMessage } from '../../utils/errors'

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

interface TeacherComboboxProps {
  teachers: AdminUserItem[]
  value: string
  onChange: (teacherId: string) => void
  inputId: string
  required?: boolean
  disabled?: boolean
}

function TeacherCombobox({
  teachers,
  value,
  onChange,
  inputId,
  required,
  disabled,
}: TeacherComboboxProps) {
  const options = useMemo(
    () =>
      teachers
        .filter((teacher) => Boolean(teacher.teacherNo))
        .map((teacher) => ({
          id: teacher.id,
          teacherNo: teacher.teacherNo as string,
          realName: teacher.realName,
        }))
        .sort((a, b) => a.teacherNo.localeCompare(b.teacherNo)),
    [teachers],
  )

  const selected = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  )

  const [query, setQuery] = useState(() => selected?.teacherNo ?? '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointer)
    return () => document.removeEventListener('mousedown', handlePointer)
  }, [])

  const trimmed = query.trim()
  const filtered = trimmed
    ? options.filter((option) =>
        option.teacherNo.toLowerCase().startsWith(trimmed.toLowerCase()),
      )
    : options

  const exactMatch = options.find((option) => option.teacherNo === trimmed) ?? null

  const hint: { kind: 'ok' | 'error' | 'idle'; text: string } =
    trimmed === ''
      ? { kind: 'idle', text: '从下拉列表中选择教师，可输入编号前缀过滤。' }
      : exactMatch
        ? { kind: 'ok', text: `已选择：${exactMatch.realName}` }
        : { kind: 'error', text: '未找到匹配的教师编号，请从下拉列表中选择。' }

  function handleSelect(option: { id: string; teacherNo: string }) {
    onChange(option.id)
    setQuery(option.teacherNo)
    setOpen(false)
  }

  function handleChange(nextValue: string) {
    setQuery(nextValue)
    setOpen(true)
    const match = options.find((option) => option.teacherNo === nextValue.trim())
    onChange(match?.id ?? '')
  }

  return (
    <div className="combobox" ref={containerRef}>
      <input
        id={inputId}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${inputId}-listbox`}
        placeholder="输入教师编号前缀以查询"
        required={required}
        disabled={disabled}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => handleChange(event.target.value)}
      />
      {open && filtered.length > 0 ? (
        <ul
          id={`${inputId}-listbox`}
          role="listbox"
          className="combobox-options"
        >
          {filtered.slice(0, 50).map((option) => (
            <li key={option.id} role="option" aria-selected={option.id === value}>
              <button
                type="button"
                className={option.id === value ? 'is-active' : ''}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option)}
              >
                {option.teacherNo}（{option.realName}）
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && filtered.length === 0 ? (
        <ul className="combobox-options" role="listbox">
          <li className="combobox-empty">没有匹配的教师编号</li>
        </ul>
      ) : null}
      <small className={`combobox-hint combobox-hint--${hint.kind}`}>{hint.text}</small>
    </div>
  )
}

export function OfficerCourseListRoute() {
  const { apiBaseUrl, session } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [keyword, setKeyword] = useState('')
  const [semester, setSemester] = useState('')
  const [status, setStatus] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const deferredKeyword = useDeferredValue(keyword)
  const deferredSemester = useDeferredValue(semester)
  const deferredStatus = useDeferredValue(status)
  const deferredTeacherId = useDeferredValue(teacherId)
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
      deferredTeacherId,
    ],
    queryFn: async () => {
      const payload = await api.listCourses(apiBaseUrl, session.accessToken, {
        keyword: deferredKeyword,
        semester: deferredSemester,
        status: deferredStatus,
        teacherId: deferredTeacherId,
      })
      return { items: payload.items as CourseItem[] }
    },
  })

  const teachersQuery = useQuery<{ users: AdminUserItem[] }>({
    queryKey: ['adminUsers', apiBaseUrl, session.accessToken, 'teacher'],
    queryFn: async () => {
      const payload = await api.listAdminUsers(apiBaseUrl, session.accessToken, 'teacher')
      return { users: payload.users as AdminUserItem[] }
    },
  })

  const teachers = teachersQuery.data?.users ?? []

  const courseOptionsQuery = useQuery<{ semesters: string[]; locations: string[] }>({
    queryKey: ['courseOptions', apiBaseUrl, session.accessToken],
    queryFn: async () => {
      const payload = await api.listCourseOptions(apiBaseUrl, session.accessToken)
      return { semesters: payload.semesters ?? [], locations: payload.locations ?? [] }
    },
  })

  const semesterSuggestions = courseOptionsQuery.data?.semesters ?? []
  const locationSuggestions = courseOptionsQuery.data?.locations ?? []

  const teacherIsValid = teachers.some((teacher) => teacher.id === draft.teacherId)

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
      queryClient.invalidateQueries({ queryKey: ['courseOptions'] })
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
          <label htmlFor="officer-course-teacher">
            授课教师
            <select
              id="officer-course-teacher"
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
            >
              <option value="">全部教师</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.realName}
                  {teacher.teacherNo ? `（${teacher.teacherNo}）` : ''}
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
              if (!teacherIsValid) {
                setError('请从下拉列表中选择有效的授课教师编号')
                return
              }
              setError(null)
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
                <TeacherCombobox
                  inputId="new-course-teacher"
                  required
                  teachers={teachers}
                  value={draft.teacherId}
                  onChange={(teacherId) =>
                    setDraft((current) => ({ ...current, teacherId }))
                  }
                />
              </label>
              <label htmlFor="new-course-semester">
                开课学期
                <input
                  id="new-course-semester"
                  required
                  minLength={2}
                  list="new-course-semester-options"
                  placeholder="例如 2026 春，可从已有学期中选择"
                  value={draft.semester}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, semester: event.target.value }))
                  }
                />
                <datalist id="new-course-semester-options">
                  {semesterSuggestions.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </label>
              <label htmlFor="new-course-location">
                授课地点
                <input
                  id="new-course-location"
                  required
                  list="new-course-location-options"
                  placeholder="例如 教学楼 A-301，可从已有地点中选择"
                  value={draft.location}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, location: event.target.value }))
                  }
                />
                <datalist id="new-course-location-options">
                  {locationSuggestions.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
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
            <button
              className="primary-button"
              type="submit"
              disabled={createMutation.isPending || !teacherIsValid}
            >
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
