import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { AssignmentItem, CourseFeedbackItem } from '../../domain'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

export function OfficerCourseOverviewTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()

  const assignmentsQuery = useQuery<{ items: AssignmentItem[] }>({
    queryKey: ['assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as AssignmentItem[] }
    },
  })

  const feedbacksQuery = useQuery<{ items: CourseFeedbackItem[] }>({
    queryKey: ['courseFeedbacks', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listCourseFeedbacks(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as CourseFeedbackItem[] }
    },
  })

  if (assignmentsQuery.isLoading || feedbacksQuery.isLoading) {
    return <StatePanel title="课程概览加载中" detail="正在同步课程基础数据。" />
  }

  return (
    <div className="course-tab-content">
      <article className="section-card wide-card">
        <div className="section-head">
          <h3>课程基础信息</h3>
          <p>只读展示，编辑请进入基础信息维护 Tab。</p>
        </div>
        <p className="muted-paragraph">{course.description || '该课程暂未填写简介。'}</p>
        <dl className="detail-list">
          <div>
            <dt>课程代码</dt>
            <dd>{course.courseCode}</dd>
          </div>
          <div>
            <dt>学期</dt>
            <dd>{course.semester}</dd>
          </div>
          <div>
            <dt>授课教师</dt>
            <dd>
              {course.teacherName
                ? course.teacherNo
                  ? `${course.teacherName}（${course.teacherNo}）`
                  : course.teacherName
                : course.teacherId}
            </dd>
          </div>
          <div>
            <dt>上课时间</dt>
            <dd>{course.scheduleText}</dd>
          </div>
          <div>
            <dt>上课地点</dt>
            <dd>{course.location}</dd>
          </div>
        </dl>
      </article>

      <article className="section-card">
        <div className="section-head">
          <h3>运行数据</h3>
          <p>用于教学质量审计。</p>
        </div>
        <dl className="detail-list">
          <div>
            <dt>课程人数上限</dt>
            <dd>{course.capacity}</dd>
          </div>
          <div>
            <dt>作业数</dt>
            <dd>{assignmentsQuery.data?.items.length ?? 0}</dd>
          </div>
          <div>
            <dt>课程反馈条数</dt>
            <dd>{feedbacksQuery.data?.items.length ?? 0}</dd>
          </div>
        </dl>
      </article>
    </div>
  )
}
