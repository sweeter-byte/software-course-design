import { StatePanel } from '../../components/ui/StatePanel'
import type { AssignmentItem, SubmissionItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'

type PendingSubmissionListProps = {
  assignment: AssignmentItem | null
  submissions: SubmissionItem[]
  selectedSubmissionId: string | null
  isLoading: boolean
  onSelectSubmission: (submission: SubmissionItem) => void
}

export function PendingSubmissionList({
  assignment,
  submissions,
  selectedSubmissionId,
  isLoading,
  onSelectSubmission,
}: PendingSubmissionListProps) {
  if (isLoading) {
    return <StatePanel title="提交正在加载" detail="正在获取当前作业的学生提交。" />
  }

  if (submissions.length === 0) {
    return (
      <StatePanel
        title="暂无待批改提交"
        detail={assignment ? '当前作业没有需要批改的提交。' : '选择作业后会显示学生提交。'}
      />
    )
  }

  return (
    <div className="entity-list compact">
      {submissions.map((submission) => (
        <button
          key={submission.id}
          className={selectedSubmissionId === submission.id ? 'entity-card active' : 'entity-card'}
          type="button"
          onClick={() => onSelectSubmission(submission)}
        >
          <div>
            <strong>{submission.studentName ?? submission.studentId}</strong>
            <span>{submission.status}</span>
          </div>
          <p>{submission.content}</p>
          <small>提交：{formatDateTimeForDisplay(submission.submittedAt)}</small>
        </button>
      ))}
    </div>
  )
}
