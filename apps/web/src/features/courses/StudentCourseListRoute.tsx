import { useDeferredValue, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { CourseItem } from '../../domain'
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

export function StudentCourseListRoute() {
  const { apiBaseUrl, session } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [keyword, setKeyword] = useState('')
  const [semester, setSemester] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const deferredKeyword = useDeferredValue(keyword)
  const deferredSemester = useDeferredValue(semester)
  const deferredStatus = useDeferredValue(status)

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

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) =>
      api.enrollCourse(apiBaseUrl, session.accessToken, courseId),
    onSuccess: (_data, courseId) => {
      setError(null)
      setNotice('已加入课程，可在课程工作区继续学习。')
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      navigate(`/student/courses/${courseId}`)
    },
    onError: (error) => {
      const message = extractErrorMessage(error)
      if (message.includes('ALREADY_ENROLLED') || message.includes('already_enrolled')) {
        setNotice('你已加入该课程。')
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        return
      }
      setError(message)
    },
  })

  const courses = coursesQuery.data?.items ?? []

  return (
    <div className="student-course-list-route">
      {notice ? <p className="info-banner">{notice}</p> : null}
      {error ? <p className="error-banner">{error}</p> : null}
      <section className="section-card wide-card">
        <div className="section-head">
          <h3>我的课程</h3>
          <p>查找可加入的课程，或进入已加入课程的工作区。</p>
        </div>
        <div className="form-grid">
          <label htmlFor="student-course-keyword">
            搜索
            <input
              id="student-course-keyword"
              placeholder="按课程名称 / 课程代码"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <label htmlFor="student-course-semester">
            学期
            <input
              id="student-course-semester"
              placeholder="例如 2026 春"
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
            />
          </label>
          <label htmlFor="student-course-status">
            状态
            <select
              id="student-course-status"
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

        {coursesQuery.isLoading ? (
          <StatePanel title="课程加载中" detail="正在同步课程信息。" />
        ) : courses.length === 0 ? (
          <StatePanel title="没有匹配的课程" detail="可以调整筛选条件。" />
        ) : (
          <div className="entity-list">
            {courses.map((course) => (
              <article key={course.id} className="entity-card">
                <div>
                  <strong>{course.courseName}</strong>
                  <span>{course.courseCode}</span>
                </div>
                <p>{course.location}</p>
                <small>{course.scheduleText}</small>
                <small>学期：{course.semester}</small>
                <small>状态：{STATUS_LABELS[course.status] ?? course.status}</small>
                <div className="inline-row">
                  {course.enrolled ? (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => navigate(`/student/courses/${course.id}`)}
                    >
                      进入课程
                    </button>
                  ) : (
                    <button
                      className="ghost-button"
                      type="button"
                      disabled={enrollMutation.isPending}
                      onClick={() => enrollMutation.mutate(course.id)}
                    >
                      {enrollMutation.isPending ? '处理中...' : '加入课程'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
