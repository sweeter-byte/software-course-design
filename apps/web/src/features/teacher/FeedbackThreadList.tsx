import { StatePanel } from '../../components/ui/StatePanel'
import type { CourseItem, FeedbackItem } from '../../domain'

type FeedbackThreadListProps = {
  course: CourseItem | null
  feedbackThreads: FeedbackItem[]
  responseDraft: string
  isLoading: boolean
  isResponding: boolean
  onResponseDraftChange: (value: string) => void
  onCreateResponse: (feedbackId: string) => void
  onSelectFeedbackThread: (feedback: FeedbackItem) => void
}

export function FeedbackThreadList({
  course,
  feedbackThreads,
  responseDraft,
  isLoading,
  isResponding,
  onResponseDraftChange,
  onCreateResponse,
  onSelectFeedbackThread,
}: FeedbackThreadListProps) {
  if (isLoading) {
    return <StatePanel title="反馈正在加载" detail="正在同步学生作业问题与反馈。" />
  }

  if (feedbackThreads.length === 0) {
    return (
      <StatePanel
        title="暂无待回复反馈"
        detail={course ? '当前课程范围内没有学生作业反馈。' : '选择课程后会显示对应反馈线程。'}
      />
    )
  }

  return (
    <>
      {feedbackThreads.map((feedback) => (
        <article key={feedback.id} className="thread-card">
          <div className="thread-meta">
            <span>{feedback.kind === 'question' ? '学生问题' : '学生反馈'}</span>
            <strong>{feedback.status}</strong>
          </div>
          <small>
            {feedback.courseName ?? '课程'} / {feedback.assignmentTitle ?? '作业'} /{' '}
            {feedback.studentName ?? feedback.studentId}
            {feedback.studentNo ? `（${feedback.studentNo}）` : ''}
          </small>
          <p>{feedback.content}</p>
          <small>提交状态：{feedback.submissionStatus ?? '未知'}</small>

          {feedback.responses.map((response) => (
            <div key={response.id} className="thread-response">
              <span>{response.teacherName ?? '教师'} 回复</span>
              <p>{response.content}</p>
            </div>
          ))}

          <div className="inline-row">
            <button
              className="ghost-button"
              type="button"
              onClick={() => onSelectFeedbackThread(feedback)}
            >
              查看对应提交
            </button>
          </div>
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault()
              onCreateResponse(feedback.id)
            }}
          >
            <input
              aria-label={`回复 ${feedback.studentName ?? feedback.studentId} 的反馈`}
              value={responseDraft}
              onChange={(event) => onResponseDraftChange(event.target.value)}
            />
            <button className="ghost-button" type="submit" disabled={isResponding}>
              回复学生
            </button>
          </form>
        </article>
      ))}
    </>
  )
}
