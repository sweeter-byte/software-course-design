import { StatePanel } from '../../components/ui/StatePanel'
import type { CourseFeedbackItem } from '../../domain'

type CourseFeedbackOverviewProps = {
  courseFeedbacks: CourseFeedbackItem[]
  isLoading: boolean
}

export function CourseFeedbackOverview({
  courseFeedbacks,
  isLoading,
}: CourseFeedbackOverviewProps) {
  if (isLoading) {
    return <StatePanel title="课程反馈正在加载" detail="正在同步学生课程反馈。" />
  }

  if (courseFeedbacks.length === 0) {
    return <StatePanel title="暂无课程反馈" detail="学生提交课程反馈后会在这里展示。" />
  }

  return (
    <>
      {courseFeedbacks.map((feedback) => (
        <article key={feedback.id} className="thread-card">
          <div className="thread-meta">
            <span>{feedback.courseName ?? '课程反馈'}</span>
            <strong>{feedback.status}</strong>
          </div>
          <p>{feedback.content}</p>
          <small>
            学生：{feedback.studentName ?? feedback.studentId}
            {feedback.studentNo ? `（${feedback.studentNo}）` : ''}
          </small>
        </article>
      ))}
    </>
  )
}
