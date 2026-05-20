import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet, useParams } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { CourseItem, UserRole } from '../../domain'

export interface CourseWorkspaceTab {
  to: string
  label: string
}

interface CourseWorkspaceProps {
  role: UserRole
  tabs: ReadonlyArray<CourseWorkspaceTab>
}

const COURSE_STATUS_LABELS: Record<string, string> = {
  not_started: '未开始',
  active: '开课中',
  completed: '已结课',
  suspended: '暂停',
  cancelled: '已取消',
}

export function CourseWorkspace({ role, tabs }: CourseWorkspaceProps) {
  const { apiBaseUrl, session } = useAuth()
  const { courseId } = useParams<{ courseId: string }>()

  const courseQuery = useQuery<{ course: CourseItem }>({
    enabled: Boolean(courseId),
    queryKey: ['course-detail', apiBaseUrl, session.accessToken, courseId],
    queryFn: async () => {
      if (!courseId) {
        throw new Error('missing courseId')
      }
      const payload = await api.getCourse(apiBaseUrl, session.accessToken, courseId)
      return { course: payload.course as CourseItem }
    },
  })

  const course = courseQuery.data?.course ?? null
  const headerContext = useMemo(() => buildHeaderContext(role, course), [role, course])

  if (!courseId) {
    return <StatePanel title="缺少课程标识" detail="请从课程列表重新进入。" />
  }

  if (courseQuery.isLoading) {
    return <StatePanel title="课程加载中" detail="正在获取课程上下文。" />
  }

  if (courseQuery.isError || !course) {
    return <StatePanel title="无法访问该课程" detail="可能没有权限或课程已被删除。" />
  }

  return (
    <section className="course-workspace">
      <header className="course-workspace-head">
        <div className="course-workspace-title">
          <p className="eyebrow">课程工作区</p>
          <h3>
            {course.courseName} <span className="muted-text">/ {course.courseCode}</span>
          </h3>
        </div>
        <dl className="course-context-grid">
          {headerContext.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <nav className="course-workspace-tabs" aria-label="课程工作区导航">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => (isActive ? 'tab-link active' : 'tab-link')}
            end={tab.to === ''}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="course-workspace-body">
        <Outlet context={{ course, role } as CourseWorkspaceOutletContext} />
      </div>
    </section>
  )
}

function buildHeaderContext(role: UserRole, course: CourseItem | null) {
  if (!course) return []
  const items: Array<{ label: string; value: string }> = [
    { label: '授课教师', value: course.teacherId },
    { label: '学期', value: course.semester },
    { label: '上课时间', value: course.scheduleText },
    { label: '上课地点', value: course.location },
    { label: '课程状态', value: COURSE_STATUS_LABELS[course.status] ?? course.status },
  ]
  if (role === 'student') {
    items.push({
      label: '我的加入状态',
      value: course.enrolled ? '已加入' : '未加入',
    })
  }
  return items
}

export interface CourseWorkspaceOutletContext {
  course: CourseItem
  role: UserRole
}
