import type { AssignmentItem, FeedbackItem } from '../../domain'

export type StudentFeedbackRow = {
  assignmentId: string
  assignmentTitle: string
  score: string
  teacherFeedback: string
  thread: FeedbackItem | null
  hasThread: boolean
  hasResponse: boolean
}

function truncate(text: string, max = 80): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

/**
 * Per §2.5 + Web `StudentCourseFeedbacksTab.tsx`:
 *   Aggregate rows by graded assignments. Each graded assignment becomes one
 *   row, even if the student has not raised a thread yet — they should still
 *   be able to navigate into the assignment detail to start one.
 */
export function buildStudentFeedbackRows(
  assignments: AssignmentItem[],
  threads: FeedbackItem[],
): StudentFeedbackRow[] {
  return assignments
    .filter((assignment) => assignment.mySubmission?.status === 'graded')
    .map((assignment) => {
      const submission = assignment.mySubmission
      const thread = threads.find((item) => item.assignmentId === assignment.id) ?? null
      return {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        score: submission?.score == null ? '暂无分数' : `${submission.score} 分`,
        teacherFeedback: submission?.teacherFeedback
          ? truncate(submission.teacherFeedback)
          : '教师暂未填写评语。',
        thread,
        hasThread: thread !== null,
        hasResponse: thread !== null && thread.responses.length > 0,
      }
    })
}

/**
 * §2.5: student may edit/delete their feedback only before any teacher
 * response is recorded on the thread.
 */
export function canStudentEditFeedback(thread: Pick<FeedbackItem, 'responses'>): boolean {
  return thread.responses.length === 0
}

/**
 * §3.3.4 / §5.6: 修改/删除仅限教师自己发布的回复。
 */
export function canTeacherEditResponse(
  response: { teacherId: string },
  teacherId: string,
): boolean {
  return response.teacherId === teacherId
}
