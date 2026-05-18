import { StatePanel } from '../../components/ui/StatePanel'
import type { AssignmentItem, CourseFeedbackItem, CourseItem, FeedbackItem, SubmissionItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'

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
  const selectedSubmission = submissions.find((submission) => submission.id === selectedSubmissionId) ?? null
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

        {isLoadingSubmissions ? (
          <StatePanel title="提交正在加载" detail="正在获取当前作业的学生提交。" />
        ) : pendingSubmissions.length > 0 ? (
          <div className="entity-list compact">
            {pendingSubmissions.map((submission) => (
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
        ) : (
          <StatePanel
            title="暂无待批改提交"
            detail={assignment ? '当前作业没有需要批改的提交。' : '选择作业后会显示学生提交。'}
          />
        )}

        {selectedSubmission ? (
          <div className="assignment-detail">
            <h4>当前选中提交</h4>
            <div className="submission-summary">
              <span>
                {selectedSubmission.studentName ?? selectedSubmission.studentId}
                {selectedSubmission.studentNo ? `（${selectedSubmission.studentNo}）` : ''} /{' '}
                {selectedSubmission.status}
              </span>
              <strong>{selectedSubmission.score == null ? '暂无分数' : `${selectedSubmission.score} 分`}</strong>
              <p>{selectedSubmission.content}</p>
              <p>{selectedSubmission.teacherFeedback ?? '教师暂未填写评语。'}</p>
              <small>提交：{formatDateTimeForDisplay(selectedSubmission.submittedAt)}</small>
              <small>批改：{formatDateTimeForDisplay(selectedSubmission.gradedAt)}</small>
            </div>
          </div>
        ) : null}

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
              <input value={gradeScore} onChange={(event) => onGradeScoreChange(event.target.value)} />
            </label>
            <label>
              评语
              <textarea value={gradeFeedback} onChange={(event) => onGradeFeedbackChange(event.target.value)} />
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={!selectedSubmission || isGrading}>
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
          {isLoadingFeedbackThreads ? (
            <StatePanel title="反馈正在加载" detail="正在同步学生作业问题与反馈。" />
          ) : feedbackThreads.length > 0 ? (
            feedbackThreads.map((feedback) => (
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
                  <button className="ghost-button" type="button" onClick={() => onSelectFeedbackThread(feedback)}>
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
                  <input value={responseDraft} onChange={(event) => onResponseDraftChange(event.target.value)} />
                  <button className="ghost-button" type="submit" disabled={isResponding}>
                    回复学生
                  </button>
                </form>
              </article>
            ))
          ) : (
            <StatePanel
              title="暂无待回复反馈"
              detail={course ? '当前课程范围内没有学生作业反馈。' : '选择课程后会显示对应反馈线程。'}
            />
          )}
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
          {isLoadingCourseFeedbacks ? (
            <StatePanel title="课程反馈正在加载" detail="正在同步学生课程反馈。" />
          ) : courseFeedbacks.length > 0 ? (
            courseFeedbacks.map((feedback) => (
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
            ))
          ) : (
            <StatePanel title="暂无课程反馈" detail="学生提交课程反馈后会在这里展示。" />
          )}
        </div>
      </section>
    </div>
  )
}
