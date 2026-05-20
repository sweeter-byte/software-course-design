import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { CourseFeedbackItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

type Dimension = CourseFeedbackItem['dimension']

const DIMENSION_LABELS: Record<Dimension, string> = {
  content: '课程内容',
  method: '教学方法',
  teaching: '教师授课',
  gain: '学习收获',
  other: '其他建议',
}

const DIMENSION_ORDER: Dimension[] = ['content', 'method', 'teaching', 'gain', 'other']

export function TeacherCourseFeedbacksReadonlyTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()

  const feedbacksQuery = useQuery<{ items: CourseFeedbackItem[] }>({
    queryKey: ['courseFeedbacks', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listCourseFeedbacks(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as CourseFeedbackItem[] }
    },
  })

  const items = feedbacksQuery.data?.items
  const grouped = useMemo(() => {
    const result: Record<Dimension, CourseFeedbackItem[]> = {
      content: [],
      method: [],
      teaching: [],
      gain: [],
      other: [],
    }
    if (items) {
      for (const feedback of items) {
        result[feedback.dimension].push(feedback)
      }
    }
    return result
  }, [items])
  const feedbacks = items ?? []

  if (feedbacksQuery.isLoading) {
    return <StatePanel title="课程反馈加载中" detail="正在同步学生课程反馈。" />
  }

  if (feedbacks.length === 0) {
    return <StatePanel title="暂无课程反馈" detail="学生提交课程反馈后会在这里展示。" />
  }

  return (
    <div className="course-tab-content">
      {DIMENSION_ORDER.map((dimension) => {
        const items = grouped[dimension]
        if (items.length === 0) return null
        return (
          <article key={dimension} className="section-card wide-card">
            <div className="section-head">
              <h3>{DIMENSION_LABELS[dimension]}</h3>
              <p>共 {items.length} 条</p>
            </div>
            <ul className="response-list">
              {items.map((feedback) => (
                <li key={feedback.id} className="thread-card">
                  <p>{feedback.content}</p>
                  <small>
                    {feedback.studentName ?? feedback.studentId}
                    {feedback.studentNo ? `（${feedback.studentNo}）` : ''}
                    {feedback.createdAt
                      ? ` · ${formatDateTimeForDisplay(feedback.createdAt)}`
                      : ''}
                  </small>
                </li>
              ))}
            </ul>
          </article>
        )
      })}
    </div>
  )
}
