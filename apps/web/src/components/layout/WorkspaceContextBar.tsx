import type { AssignmentItem, CourseItem, SubmissionItem, WorkspaceContext } from '../../domain'

type WorkspaceContextBarProps = {
  context: WorkspaceContext
  courses: CourseItem[]
  assignments: AssignmentItem[]
  submissions: SubmissionItem[]
  onCourseChange: (courseId: string) => void
  onAssignmentChange: (assignmentId: string) => void
  onSubmissionChange: (submissionId: string) => void
}

function submissionLabel(submission: SubmissionItem) {
  const studentLabel = submission.studentName ?? submission.studentNo ?? submission.studentId
  return `${studentLabel} / ${submission.status}`
}

export function WorkspaceContextBar({
  context,
  courses,
  assignments,
  submissions,
  onCourseChange,
  onAssignmentChange,
  onSubmissionChange,
}: WorkspaceContextBarProps) {
  return (
    <section className="context-bar" aria-label="当前工作上下文">
      <div>
        <p className="context-kicker">当前工作上下文</p>
        <h3>课程 / 作业 / 提交</h3>
      </div>
      <label>
        课程
        <select value={context.course?.id ?? ''} onChange={(event) => onCourseChange(event.target.value)}>
          <option value="">请选择课程</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.courseName} / {course.courseCode}
            </option>
          ))}
        </select>
      </label>
      <label>
        作业
        <select
          value={context.assignment?.id ?? ''}
          onChange={(event) => onAssignmentChange(event.target.value)}
          disabled={!context.course}
        >
          <option value="">请选择作业</option>
          {assignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        提交
        <select
          value={context.submission?.id ?? ''}
          onChange={(event) => onSubmissionChange(event.target.value)}
          disabled={!context.assignment || submissions.length === 0}
        >
          <option value="">请选择提交</option>
          {submissions.map((submission) => (
            <option key={submission.id} value={submission.id}>
              {submissionLabel(submission)}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
