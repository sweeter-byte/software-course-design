import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { CourseEnrollmentItem } from '../../domain'
import { extractErrorMessage } from '../../utils/errors'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}

/**
 * Shared roster view for teacher + officer course workspaces. The endpoint
 * (GET /courses/:id/enrollments) enforces that teachers only see their own
 * courses, so we do not gate access here.
 */
export function CourseEnrollmentsTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()

  const enrollmentsQuery = useQuery<{ items: CourseEnrollmentItem[] }>({
    queryKey: ['course-enrollments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listCourseEnrollments(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as unknown as CourseEnrollmentItem[] }
    },
  })

  if (enrollmentsQuery.isLoading) {
    return <StatePanel title="加载中" detail="正在拉取选课名单。" />
  }

  if (enrollmentsQuery.isError) {
    return (
      <StatePanel
        title="无法加载选课名单"
        detail={extractErrorMessage(enrollmentsQuery.error)}
      />
    )
  }

  const items = enrollmentsQuery.data?.items ?? []

  return (
    <article className="section-card wide-card">
      <div className="section-head">
        <h3>选课学生名单</h3>
        <p>
          共 {items.length} / {course.capacity} 名学生。名单按加入时间升序排列。
        </p>
      </div>
      {items.length === 0 ? (
        <StatePanel title="暂无学生加入" detail="学生通过课程检索后自助加入即可出现在此列表。" />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>学号</th>
                <th>姓名</th>
                <th>手机号</th>
                <th>学院</th>
                <th>专业</th>
                <th>班级</th>
                <th>加入时间</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.studentId}>
                  <td>{item.studentNo ?? '—'}</td>
                  <td>{item.realName}</td>
                  <td>{item.phone}</td>
                  <td>{item.college ?? '—'}</td>
                  <td>{item.major ?? '—'}</td>
                  <td>{item.className ?? '—'}</td>
                  <td>{formatDate(item.enrolledAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  )
}
