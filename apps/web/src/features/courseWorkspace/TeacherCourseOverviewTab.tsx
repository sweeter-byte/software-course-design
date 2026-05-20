import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { AssignmentItem, FeedbackItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

const MAX_RECENT_ASSIGNMENTS = 5

export function TeacherCourseOverviewTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()

  const assignmentsQuery = useQuery<{ items: AssignmentItem[] }>({
    queryKey: ['assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as AssignmentItem[] }
    },
  })

  const threadsQuery = useQuery<{ items: FeedbackItem[] }>({
    queryKey: ['feedbackThreads', apiBaseUrl, session.accessToken, course.id, 'teacher'],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {
        courseId: course.id,
      })
      return { items: payload.items as FeedbackItem[] }
    },
  })

  const assignments = assignmentsQuery.data?.items ?? []
  const recentAssignments = [...assignments]
    .sort((a, b) => (a.dueAt < b.dueAt ? 1 : -1))
    .slice(0, MAX_RECENT_ASSIGNMENTS)
  const unansweredFeedback = (threadsQuery.data?.items ?? []).filter(
    (item) => item.responses.length === 0,
  )

  return (
    <div className="course-tab-content">
      <article className="section-card wide-card">
        <div className="section-head">
          <h3>课程基础信息</h3>
          <p>课程运行状态总览。</p>
        </div>
        <p className="muted-paragraph">{course.description || '该课程暂未填写简介。'}</p>
        <dl className="detail-list">
          <div>
            <dt>开课日期</dt>
            <dd>{course.startDate ?? '—'}</dd>
          </div>
          <div>
            <dt>结课日期</dt>
            <dd>{course.endDate ?? '—'}</dd>
          </div>
          <div>
            <dt>课程人数上限</dt>
            <dd>{course.capacity}</dd>
          </div>
        </dl>
      </article>

      <article className="section-card">
        <div className="section-head">
          <h3>最近作业</h3>
          <p>按截止时间倒序展示。</p>
        </div>
        {assignmentsQuery.isLoading ? (
          <StatePanel title="作业加载中" detail="正在同步课程作业。" />
        ) : recentAssignments.length === 0 ? (
          <StatePanel title="暂无作业" detail="还没有发布作业。" />
        ) : (
          <ul className="bullet-list">
            {recentAssignments.map((assignment) => (
              <li key={assignment.id}>
                <strong>{assignment.title}</strong>
                <span className="muted-text"> · 截止 {formatDateTimeForDisplay(assignment.dueAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="section-card">
        <div className="section-head">
          <h3>待回答作业反馈</h3>
          <p>学生在批改后提出的问题或反馈。</p>
        </div>
        {threadsQuery.isLoading ? (
          <StatePanel title="反馈加载中" detail="正在同步反馈线程。" />
        ) : unansweredFeedback.length === 0 ? (
          <StatePanel title="暂无待回答反馈" detail="所有反馈都已被回应。" />
        ) : (
          <ul className="bullet-list">
            {unansweredFeedback.slice(0, MAX_RECENT_ASSIGNMENTS).map((feedback) => (
              <li key={feedback.id}>
                <strong>{feedback.assignmentTitle ?? '作业'}</strong>
                <span className="muted-text">
                  {' '}
                  · {feedback.studentName ?? '学生'} · {feedback.kind === 'question' ? '问题' : '反馈'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  )
}
