import { StatePanel } from '../../components/ui/StatePanel'
import type { SubmissionItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'

type SubmissionDetailCardProps = {
  submission: SubmissionItem | null
  pendingSubmissionId: string | null
  isLoading: boolean
}

export function SubmissionDetailCard({
  submission,
  pendingSubmissionId,
  isLoading,
}: SubmissionDetailCardProps) {
  if (!pendingSubmissionId) {
    return null
  }

  if (!submission) {
    if (isLoading) {
      return (
        <div className="assignment-detail">
          <h4>当前选中提交</h4>
          <StatePanel
            title="正在加载提交"
            detail="切换课程或作业后，正在拉取对应提交详情。"
          />
        </div>
      )
    }

    return (
      <div className="assignment-detail">
        <h4>当前选中提交</h4>
        <StatePanel
          title="未找到提交"
          detail="该提交可能不在当前课程范围内，请回到反馈列表重新选择。"
        />
      </div>
    )
  }

  return (
    <div className="assignment-detail">
      <h4>当前选中提交</h4>
      <div className="submission-summary">
        <span>
          {submission.studentName ?? submission.studentId}
          {submission.studentNo ? `（${submission.studentNo}）` : ''} / {submission.status}
        </span>
        <strong>{submission.score == null ? '暂无分数' : `${submission.score} 分`}</strong>
        <p>{submission.content}</p>
        <p>{submission.teacherFeedback ?? '教师暂未填写评语。'}</p>
        <small>提交：{formatDateTimeForDisplay(submission.submittedAt)}</small>
        <small>批改：{formatDateTimeForDisplay(submission.gradedAt)}</small>
      </div>
    </div>
  )
}
