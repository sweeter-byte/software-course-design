import type {
  AssignmentItem,
  CourseFeedbackItem,
  CourseItem,
  FeedbackItem,
  SubmissionItem,
} from '../../domain'
import { CourseFeedbackOverview } from './CourseFeedbackOverview'
import { FeedbackThreadList } from './FeedbackThreadList'
import { PendingSubmissionList } from './PendingSubmissionList'
import { SubmissionDetailCard } from './SubmissionDetailCard'

type TeacherTaskWorkspaceProps = {
  course: CourseItem | null
  assignment: AssignmentItem | null
  submissions: SubmissionItem[]
  feedbackThreads: FeedbackItem[]
  courseFeedbacks: CourseFeedbackItem[]
  selectedSubmissionId: string | null
  gradeScore: string
  gradeFeedback: string
  responseDraft: string
  isLoadingSubmissions: boolean
  isLoadingFeedbackThreads: boolean
  isLoadingCourseFeedbacks: boolean
  isGrading: boolean
  isResponding: boolean
  onSelectSubmission: (submission: SubmissionItem) => void
  onGradeScoreChange: (value: string) => void
  onGradeFeedbackChange: (value: string) => void
  onSubmitGrade: () => void
  onResponseDraftChange: (value: string) => void
  onCreateResponse: (feedbackId: string) => void
  onSelectFeedbackThread: (feedback: FeedbackItem) => void
}

export function TeacherTaskWorkspace({
  course,
  assignment,
  submissions,
  feedbackThreads,
  courseFeedbacks,
  selectedSubmissionId,
  gradeScore,
  gradeFeedback,
  responseDraft,
  isLoadingSubmissions,
  isLoadingFeedbackThreads,
  isLoadingCourseFeedbacks,
  isGrading,
  isResponding,
  onSelectSubmission,
  onGradeScoreChange,
  onGradeFeedbackChange,
  onSubmitGrade,
  onResponseDraftChange,
  onCreateResponse,
  onSelectFeedbackThread,
}: TeacherTaskWorkspaceProps) {
  const selectedSubmission =
    submissions.find((submission) => submission.id === selectedSubmissionId) ?? null
  const pendingSubmissions = submissions.filter((submission) => submission.status !== 'graded')
  const openThreads = feedbackThreads.filter((feedback) => feedback.status === 'open')

  return (
    <div className="teacher-task-workspace">
      <div className="task-intro">
        <div>
          <span className="thread-tag">教师任务工作台</span>
          <h4>{course ? course.courseName : '请选择课程'}</h4>
          <p>{assignment ? assignment.title : '选择课程和作业后，可在同一处完成批改与回复。'}</p>
        </div>
        <div className="task-summary-grid">
          <div>
            <span>待批改提交</span>
            <strong>{pendingSubmissions.length}</strong>
          </div>
          <div>
            <span>待回复反馈</span>
            <strong>{openThreads.length}</strong>
          </div>
          <div>
            <span>学生课程反馈</span>
            <strong>{courseFeedbacks.length}</strong>
          </div>
        </div>
      </div>

      <section className="task-panel">
        <div className="task-panel-head">
          <div>
            <h4>待批改提交</h4>
            <p>{assignment ? '点击学生提交后直接填写分数和评语。' : '请先选择作业。'}</p>
          </div>
          <span>{assignment?.status ?? '未选择作业'}</span>
        </div>

        <PendingSubmissionList
          assignment={assignment}
          submissions={pendingSubmissions}
          selectedSubmissionId={selectedSubmissionId}
          isLoading={isLoadingSubmissions}
          onSelectSubmission={onSelectSubmission}
        />

        <SubmissionDetailCard
          submission={selectedSubmission}
          pendingSubmissionId={selectedSubmissionId}
          isLoading={isLoadingSubmissions}
        />

        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmitGrade()
          }}
        >
          <div className="form-grid">
            <label>
              分数
              <input
                aria-label="提交分数"
                value={gradeScore}
                onChange={(event) => onGradeScoreChange(event.target.value)}
              />
            </label>
            <label>
              评语
              <textarea
                aria-label="批改评语"
                value={gradeFeedback}
                onChange={(event) => onGradeFeedbackChange(event.target.value)}
              />
            </label>
          </div>
          <button
            className="primary-button"
            type="submit"
            disabled={!selectedSubmission || isGrading}
          >
            {isGrading ? '写回中...' : '提交批改结果'}
          </button>
        </form>
      </section>

      <section className="task-panel">
        <div className="task-panel-head">
          <div>
            <h4>待回复反馈</h4>
            <p>直接查看学生作业问题、提交状态和已有教师回复。</p>
          </div>
          <span>{openThreads.length} 条</span>
        </div>

        <div className="thread-stack">
          <FeedbackThreadList
            course={course}
            feedbackThreads={feedbackThreads}
            responseDraft={responseDraft}
            isLoading={isLoadingFeedbackThreads}
            isResponding={isResponding}
            onResponseDraftChange={onResponseDraftChange}
            onCreateResponse={onCreateResponse}
            onSelectFeedbackThread={onSelectFeedbackThread}
          />
        </div>
      </section>

      <section className="task-panel">
        <div className="task-panel-head">
          <div>
            <h4>学生课程反馈</h4>
            <p>课程维度反馈用于发现教学内容、方法和学习收获问题。</p>
          </div>
          <span>{courseFeedbacks.length} 条</span>
        </div>

        <div className="thread-stack">
          <CourseFeedbackOverview
            courseFeedbacks={courseFeedbacks}
            isLoading={isLoadingCourseFeedbacks}
          />
        </div>
      </section>
    </div>
  )
}
