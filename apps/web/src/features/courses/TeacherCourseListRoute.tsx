import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { CourseItem } from '../../domain'

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

export function TeacherCourseListRoute() {
  const { apiBaseUrl, session } = useAuth()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')

  const coursesQuery = useQuery<{ items: CourseItem[] }>({
    queryKey: ['courses', apiBaseUrl, session.accessToken, 'teacher-own'],
    queryFn: async () => {
      const payload = await api.listCourses(apiBaseUrl, session.accessToken, {})
      return { items: payload.items as CourseItem[] }
    },
  })

  const myCourses = useMemo(() => {
    const items = coursesQuery.data?.items ?? []
    return items
      .filter((course) => course.teacherId === session.user.id)
      .filter((course) => {
        if (status && course.status !== status) return false
        const lower = keyword.trim().toLowerCase()
        if (!lower) return true
        return (
          course.courseName.toLowerCase().includes(lower) ||
          course.courseCode.toLowerCase().includes(lower)
        )
      })
  }, [coursesQuery.data, session.user.id, keyword, status])

  return (
    <div className="teacher-course-list-route">
      <section className="section-card wide-card">
        <div className="section-head">
          <h3>授课课程</h3>
          <p>仅展示本账号授课的课程。点击进入课程工作区处理作业、批改与反馈。</p>
        </div>
        <div className="form-grid">
          <label htmlFor="teacher-course-keyword">
            搜索
            <input
              id="teacher-course-keyword"
              placeholder="按课程名称 / 课程代码"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <label htmlFor="teacher-course-status">
            状态
            <select
              id="teacher-course-status"
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
          <StatePanel title="课程加载中" detail="正在同步授课课程。" />
        ) : myCourses.length === 0 ? (
          <StatePanel title="没有授课课程" detail="请联系教务员分配课程。" />
        ) : (
          <div className="entity-list">
            {myCourses.map((course) => (
              <button
                key={course.id}
                type="button"
                className="entity-card"
                onClick={() => navigate(`/teacher/courses/${course.id}`)}
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
