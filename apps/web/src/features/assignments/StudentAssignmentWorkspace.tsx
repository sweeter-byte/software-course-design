import { StatePanel } from '../../components/ui/StatePanel'
import type { AssignmentItem, FeedbackItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'

type StudentAssignmentWorkspaceProps = {
  assignment: AssignmentItem | null
  feedbacks: FeedbackItem[]
  submissionContent: string
  feedbackKind: 'question' | 'feedback'
  feedbackContent: string
  isSubmitting: boolean
  isUpdating: boolean
  isPostingFeedback: boolean
  onSubmissionContentChange: (value: string) => void
  onSubmitAnswer: () => void
  onUpdateAnswer: () => void
  onFeedbackKindChange: (value: 'question' | 'feedback') => void
  onFeedbackContentChange: (value: string) => void
  onPostFeedback: () => void
}

export function StudentAssignmentWorkspace({
  assignment,
  feedbacks,
  submissionContent,
  feedbackKind,
  feedbackContent,
  isSubmitting,
  isUpdating,
  isPostingFeedback,
  onSubmissionContentChange,
  onSubmitAnswer,
  onUpdateAnswer,
  onFeedbackKindChange,
  onFeedbackContentChange,
  onPostFeedback,
}: StudentAssignmentWorkspaceProps) {
  if (!assignment) {
    return <StatePanel title="请选择作业" detail="先在左侧选择作业，再提交答案、查看成绩或发起反馈。" />
  }

  const submission = assignment.mySubmission ?? null
  const isGraded = submission?.status === 'graded'
  const canEditSubmission = !isGraded

  return (
    <div className="student-assignment-workspace">
      <div className="assignment-detail">
        <span className="thread-tag">我的作业</span>
        <h4>{assignment.title}</h4>
        <p>{assignment.description}</p>
        <dl className="detail-list">
          <div>
            <dt>作业要求</dt>
            <dd>{assignment.requirement}</dd>
          </div>
          <div>
            <dt>截止时间</dt>
            <dd>{formatDateTimeForDisplay(assignment.dueAt)}</dd>
          </div>
          <div>
            <dt>当前状态</dt>
            <dd>{assignment.status}</dd>
          </div>
        </dl>
      </div>

      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (submission) {
            if (!canEditSubmission) return
            onUpdateAnswer()
            return
          }
          onSubmitAnswer()
        }}
      >
        <div className="assignment-detail">
          <h4>提交与成绩</h4>
          {submission ? (
            <div className="submission-summary">
              <span>{submission.status}</span>
              <strong>{submission.score == null ? '暂无分数' : `${submission.score} 分`}</strong>
              <p>{submission.teacherFeedback ?? '教师暂未填写评语。'}</p>
            </div>
          ) : (
            <p className="muted-paragraph">尚未提交答案。</p>
          )}
        </div>
        <label>
          提交内容
          <textarea
            value={submissionContent}
            onChange={(event) => onSubmissionContentChange(event.target.value)}
            readOnly={!canEditSubmission}
          />
        </label>
        <div className="inline-row">
          <button className="primary-button" type="submit" disabled={!canEditSubmission || isSubmitting || isUpdating}>
            {submission
              ? isGraded
                ? '已批改不可修改'
                : isUpdating
                  ? '修改中...'
                  : '修改答案'
              : isSubmitting
                ? '提交中...'
                : '提交答案'}
          </button>
        </div>
      </form>

      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault()
          onPostFeedback()
        }}
      >
        <div className="assignment-detail">
          <h4>作业问题与反馈</h4>
          {isGraded ? (
            <p className="muted-paragraph">已完成批改，可以围绕本次作业继续沟通。</p>
          ) : (
            <p className="muted-paragraph">批改后可发起作业问题或反馈。</p>
          )}
        </div>
        <div className="form-grid">
          <label>
            类型
            <select
              value={feedbackKind}
              onChange={(event) => onFeedbackKindChange(event.target.value as 'question' | 'feedback')}
              disabled={!isGraded}
            >
              <option value="question">问题</option>
              <option value="feedback">反馈</option>
            </select>
          </label>
        </div>
        <label>
          内容
          <textarea
            value={feedbackContent}
            onChange={(event) => onFeedbackContentChange(event.target.value)}
            disabled={!isGraded}
          />
        </label>
        <button className="ghost-button" type="submit" disabled={!isGraded || isPostingFeedback}>
          {isPostingFeedback ? '发布中...' : '发布问题/反馈'}
        </button>
      </form>

      <div className="thread-stack">
        {feedbacks.length > 0 ? (
          feedbacks.map((feedback) => (
            <article key={feedback.id} className="thread-card">
              <div className="thread-meta">
                <span>{feedback.kind === 'question' ? '学生问题' : '学生反馈'}</span>
                <strong>{feedback.status}</strong>
              </div>
              <p>{feedback.content}</p>
            </article>
          ))
        ) : (
          <StatePanel title="暂无作业互动" detail="批改完成后，可在这里查看本作业的问题、反馈和教师回复。" />
        )}
      </div>
    </div>
  )
}
