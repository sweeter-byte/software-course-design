import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { CourseFeedbackItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'

type Dimension = CourseFeedbackItem['dimension']

const DIMENSION_LABELS: Record<Dimension, string> = {
  content: '课程内容',
  method: '教学方法',
  teaching: '教师授课',
  gain: '学习收获',
  other: '其他建议',
}

export function OfficerGlobalCourseFeedbacksRoute() {
  const { apiBaseUrl, session } = useAuth()
  const [dimensionFilter, setDimensionFilter] = useState<string>('')

  const feedbacksQuery = useQuery<{ items: CourseFeedbackItem[] }>({
    queryKey: ['courseFeedbacks', apiBaseUrl, session.accessToken, 'global'],
    queryFn: async () => {
      const payload = await api.listCourseFeedbacks(apiBaseUrl, session.accessToken)
      return { items: payload.items as CourseFeedbackItem[] }
    },
  })

  const filtered = useMemo(() => {
    const items = feedbacksQuery.data?.items ?? []
    if (!dimensionFilter) return items
    return items.filter((item) => item.dimension === dimensionFilter)
  }, [feedbacksQuery.data, dimensionFilter])

  if (feedbacksQuery.isLoading) {
    return <StatePanel title="课程反馈加载中" detail="正在汇总全部课程的课程整体反馈。" />
  }

  return (
    <div className="officer-global-course-feedbacks">
      <section className="section-card wide-card">
        <div className="section-head">
          <h3>课程反馈查看</h3>
          <p>聚合全部课程的学生课程整体反馈，只读视图。</p>
        </div>
        <div className="form-grid">
          <label htmlFor="global-feedback-dimension">
            维度筛选
            <select
              id="global-feedback-dimension"
              value={dimensionFilter}
              onChange={(event) => setDimensionFilter(event.target.value)}
            >
              <option value="">全部维度</option>
              {Object.entries(DIMENSION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filtered.length === 0 ? (
          <StatePanel title="没有匹配的反馈" detail="可以调整维度筛选。" />
        ) : (
          <ul className="response-list">
            {filtered.map((feedback) => (
              <li key={feedback.id} className="thread-card">
                <span className="thread-tag">{DIMENSION_LABELS[feedback.dimension]}</span>
                <p>{feedback.content}</p>
                <small>
                  课程：{feedback.courseName ?? '未命名课程'}
                  {' · '}
                  学生：{feedback.studentName ?? feedback.studentId}
                  {feedback.studentNo ? `（${feedback.studentNo}）` : ''}
                </small>
                {feedback.createdAt ? (
                  <small>提交于 {formatDateTimeForDisplay(feedback.createdAt)}</small>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
