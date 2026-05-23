import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { AssignmentItem } from '../../domain'
import { StudentAssignmentWorkspace } from './StudentAssignmentWorkspace'

// Anchor dates relative to today so the test fixture does not silently rot
// when the wall clock crosses the hard-coded due date (which is what flipped
// these two tests to "已截止不可修改" / "已截止不可提交").
const FUTURE_START_ISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
const FUTURE_DUE_ISO = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

const baseAssignment: AssignmentItem = {
  id: 'assignment-1',
  courseId: 'course-1',
  teacherId: 'teacher-1',
  title: '课程作业一',
  description: '完成课程练习。',
  requirement: '提交完整答案。',
  startAt: FUTURE_START_ISO,
  dueAt: FUTURE_DUE_ISO,
  status: 'published',
}

const gradedAssignment: AssignmentItem = {
  ...baseAssignment,
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

const submittedAssignment: AssignmentItem = {
  ...baseAssignment,
  mySubmission: {
    id: 'submission-1',
    assignmentId: 'assignment-1',
    studentId: 'student-1',
    content: '学生答案',
    status: 'submitted',
    submittedAt: '2026-05-10T10:00:00.000Z',
  },
}

function renderWorkspace(
  overrides: Partial<Parameters<typeof StudentAssignmentWorkspace>[0]> = {},
) {
  const onSubmissionContentChange = vi.fn()
  const onSubmitAnswer = vi.fn()
  const onUpdateAnswer = vi.fn()
  const onFeedbackKindChange = vi.fn()
  const onFeedbackContentChange = vi.fn()
  const onPostFeedback = vi.fn()

  render(
    <StudentAssignmentWorkspace
      assignment={baseAssignment}
      feedbacks={[]}
      submissionContent=""
      feedbackKind="question"
      feedbackContent=""
      isSubmitting={false}
      isUpdating={false}
      isPostingFeedback={false}
      onSubmissionContentChange={onSubmissionContentChange}
      onSubmitAnswer={onSubmitAnswer}
      onUpdateAnswer={onUpdateAnswer}
      onFeedbackKindChange={onFeedbackKindChange}
      onFeedbackContentChange={onFeedbackContentChange}
      onPostFeedback={onPostFeedback}
      {...overrides}
    />,
  )

  return {
    onSubmissionContentChange,
    onSubmitAnswer,
    onUpdateAnswer,
    onFeedbackKindChange,
    onFeedbackContentChange,
    onPostFeedback,
  }
}

describe('StudentAssignmentWorkspace', () => {
  it('keeps graded submissions read-only and blocks answer updates', () => {
    renderWorkspace({
      assignment: gradedAssignment,
      submissionContent: '学生最终答案',
    })

    const submitButton = screen.getByRole('button', { name: '已批改不可修改' })
    expect(submitButton).toBeDisabled()
    expect(screen.getByLabelText('提交内容')).toHaveAttribute('readonly')
  })

  it('shows update button for ungraded submissions and emits onUpdateAnswer', async () => {
    const user = userEvent.setup()
    const { onUpdateAnswer, onSubmitAnswer } = renderWorkspace({
      assignment: submittedAssignment,
      submissionContent: '学生答案',
    })

    const button = screen.getByRole('button', { name: '修改答案' })
    expect(button).not.toBeDisabled()
    await user.click(button)
    expect(onUpdateAnswer).toHaveBeenCalledTimes(1)
    expect(onSubmitAnswer).not.toHaveBeenCalled()
  })

  it('shows submit button for new submissions and emits onSubmitAnswer', async () => {
    const user = userEvent.setup()
    const { onSubmitAnswer, onUpdateAnswer } = renderWorkspace({
      assignment: baseAssignment,
      submissionContent: '答案草稿',
    })

    const button = screen.getByRole('button', { name: '提交答案' })
    expect(button).not.toBeDisabled()
    await user.click(button)
    expect(onSubmitAnswer).toHaveBeenCalledTimes(1)
    expect(onUpdateAnswer).not.toHaveBeenCalled()
  })

  it('disables the feedback form before grading is completed', () => {
    renderWorkspace({
      assignment: submittedAssignment,
    })

    const feedbackKindSelect = screen.getByLabelText('类型')
    const feedbackContent = screen.getByLabelText('内容')
    const postButton = screen.getByRole('button', { name: '发布问题/反馈' })

    expect(feedbackKindSelect).toBeDisabled()
    expect(feedbackContent).toBeDisabled()
    expect(postButton).toBeDisabled()
  })

  it('enables the feedback form once the submission is graded', () => {
    renderWorkspace({
      assignment: gradedAssignment,
    })

    const feedbackKindSelect = screen.getByLabelText('类型')
    const feedbackContent = screen.getByLabelText('内容')
    const postButton = screen.getByRole('button', { name: '发布问题/反馈' })

    expect(feedbackKindSelect).not.toBeDisabled()
    expect(feedbackContent).not.toBeDisabled()
    expect(postButton).not.toBeDisabled()
  })
})
