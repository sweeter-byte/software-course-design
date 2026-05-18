import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { AssignmentItem } from '../../domain'
import { StudentAssignmentWorkspace } from './StudentAssignmentWorkspace'

const gradedAssignment: AssignmentItem = {
  id: 'assignment-1',
  courseId: 'course-1',
  teacherId: 'teacher-1',
  title: '课程作业一',
  description: '完成课程练习。',
  requirement: '提交完整答案。',
  startAt: '2026-05-01T00:00:00.000Z',
  dueAt: '2026-05-20T16:00:00.000Z',
  status: 'published',
  mySubmission: {
    id: 'submission-1',
    assignmentId: 'assignment-1',
    studentId: 'student-1',
    content: '学生最终答案',
    status: 'graded',
    score: 92,
    teacherFeedback: '答案完整。',
    submittedAt: '2026-05-10T10:00:00.000Z',
    gradedAt: '2026-05-11T10:00:00.000Z',
  },
}

describe('StudentAssignmentWorkspace', () => {
  it('keeps graded submissions read-only and blocks answer updates', () => {
    const html = renderToStaticMarkup(
      <StudentAssignmentWorkspace
        assignment={gradedAssignment}
        feedbacks={[]}
        submissionContent="学生最终答案"
        feedbackKind="question"
        feedbackContent=""
        isSubmitting={false}
        isUpdating={false}
        isPostingFeedback={false}
        onSubmissionContentChange={vi.fn()}
        onSubmitAnswer={vi.fn()}
        onUpdateAnswer={vi.fn()}
        onFeedbackKindChange={vi.fn()}
        onFeedbackContentChange={vi.fn()}
        onPostFeedback={vi.fn()}
      />,
    )

    expect(html).toContain('已批改不可修改')
    expect(html.toLowerCase()).toContain('readonly=""')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>已批改不可修改<\/button>/)
  })
})
