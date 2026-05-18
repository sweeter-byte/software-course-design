import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type {
  AssignmentItem,
  CourseFeedbackItem,
  CourseItem,
  FeedbackItem,
  SubmissionItem,
} from '../../domain'
import { TeacherTaskWorkspace } from './TeacherTaskWorkspace'

const course: CourseItem = {
  id: 'course-1',
  courseCode: 'SE-1001',
  courseName: '软件工程',
  description: '课程描述',
  teacherId: 'teacher-1',
  semester: '2026 春',
  location: 'C101',
  scheduleText: '周一',
  capacity: 40,
  status: 'active',
}

const assignment: AssignmentItem = {
  id: 'assignment-1',
  courseId: 'course-1',
  teacherId: 'teacher-1',
  title: '作业一',
  description: '描述',
  requirement: '要求',
  startAt: '2026-05-01T00:00:00.000Z',
  dueAt: '2026-05-20T16:00:00.000Z',
  status: 'published',
}

const pendingSubmission: SubmissionItem = {
  id: 'submission-pending',
  assignmentId: 'assignment-1',
  studentId: 'student-2',
  studentName: '张同学',
  studentNo: '162350002',
  content: '尚未批改的提交内容。',
  status: 'submitted',
  submittedAt: '2026-05-10T10:00:00.000Z',
}

const gradedSubmission: SubmissionItem = {
  id: 'submission-1',
  assignmentId: 'assignment-1',
  studentId: 'student-1',
  studentName: '李同学',
  studentNo: '162350001',
  content: '这是学生已经批改过的答案。',
  status: 'graded',
  score: 92,
  teacherFeedback: '答案完整。',
  submittedAt: '2026-05-10T10:00:00.000Z',
  gradedAt: '2026-05-11T10:00:00.000Z',
}

const feedbackThread: FeedbackItem = {
  id: 'feedback-1',
  courseId: 'course-other',
  assignmentId: 'assignment-other',
  submissionId: 'submission-other',
  studentId: 'student-other',
  studentName: '王同学',
  studentNo: '162350003',
  courseName: '别的课程',
  assignmentTitle: '别的作业',
  submissionStatus: 'graded',
  kind: 'question',
  content: '请问这道题应该怎么思考？',
  status: 'open',
  responses: [],
}

const courseFeedback: CourseFeedbackItem = {
  id: 'course-feedback-1',
  courseId: 'course-1',
  courseName: '软件工程',
  studentId: 'student-3',
  studentName: '陈同学',
  studentNo: '162350004',
  teacherId: 'teacher-1',
  dimension: 'teaching',
  content: '课程节奏合理。',
  status: 'open',
}

function renderWorkspace(
  overrides: Partial<Parameters<typeof TeacherTaskWorkspace>[0]> = {},
) {
  const onSelectSubmission = vi.fn()
  const onGradeScoreChange = vi.fn()
  const onGradeFeedbackChange = vi.fn()
  const onSubmitGrade = vi.fn()
  const onResponseDraftChange = vi.fn()
  const onCreateResponse = vi.fn()
  const onSelectFeedbackThread = vi.fn()

  render(
    <TeacherTaskWorkspace
      course={course}
      assignment={assignment}
      submissions={[]}
      feedbackThreads={[]}
      courseFeedbacks={[]}
      selectedSubmissionId={null}
      gradeScore=""
      gradeFeedback=""
      responseDraft=""
      isLoadingSubmissions={false}
      isLoadingFeedbackThreads={false}
      isLoadingCourseFeedbacks={false}
      isGrading={false}
      isResponding={false}
      onSelectSubmission={onSelectSubmission}
      onGradeScoreChange={onGradeScoreChange}
      onGradeFeedbackChange={onGradeFeedbackChange}
      onSubmitGrade={onSubmitGrade}
      onResponseDraftChange={onResponseDraftChange}
      onCreateResponse={onCreateResponse}
      onSelectFeedbackThread={onSelectFeedbackThread}
      {...overrides}
    />,
  )

  return {
    onSelectSubmission,
    onGradeScoreChange,
    onGradeFeedbackChange,
    onSubmitGrade,
    onResponseDraftChange,
    onCreateResponse,
    onSelectFeedbackThread,
  }
}

describe('TeacherTaskWorkspace', () => {
  it('shows the selected graded submission details outside the pending list', () => {
    renderWorkspace({
      submissions: [gradedSubmission],
      selectedSubmissionId: 'submission-1',
      gradeScore: '92',
      gradeFeedback: '答案完整。',
    })

    const detail = screen.getByRole('heading', { name: '当前选中提交' }).parentElement
    expect(detail).not.toBeNull()
    expect(within(detail as HTMLElement).getByText('这是学生已经批改过的答案。')).toBeInTheDocument()
    expect(within(detail as HTMLElement).getByText('92 分')).toBeInTheDocument()
    expect(within(detail as HTMLElement).getByText('答案完整。')).toBeInTheDocument()
  })

  it('renders a loading placeholder when the chosen submission is not in the current list yet', () => {
    renderWorkspace({
      submissions: [],
      selectedSubmissionId: 'submission-missing',
      isLoadingSubmissions: true,
    })

    expect(screen.getByText('正在加载提交')).toBeInTheDocument()
    expect(
      screen.getByText('切换课程或作业后，正在拉取对应提交详情。'),
    ).toBeInTheDocument()
  })

  it('shows a missing-submission placeholder when loading has finished but the submission is absent', () => {
    renderWorkspace({
      submissions: [],
      selectedSubmissionId: 'submission-missing',
      isLoadingSubmissions: false,
    })

    expect(screen.getByText('未找到提交')).toBeInTheDocument()
  })

  it('emits onSelectSubmission when a pending submission card is clicked', async () => {
    const user = userEvent.setup()
    const { onSelectSubmission } = renderWorkspace({
      submissions: [pendingSubmission],
    })

    const card = screen.getByRole('button', { name: /张同学/ })
    await user.click(card)

    expect(onSelectSubmission).toHaveBeenCalledWith(pendingSubmission)
  })

  it('emits onSelectFeedbackThread with the feedback when "查看对应提交" is clicked', async () => {
    const user = userEvent.setup()
    const { onSelectFeedbackThread } = renderWorkspace({
      feedbackThreads: [feedbackThread],
    })

    const viewButton = screen.getByRole('button', { name: '查看对应提交' })
    await user.click(viewButton)

    expect(onSelectFeedbackThread).toHaveBeenCalledWith(feedbackThread)
  })

  it('emits onCreateResponse with the feedback id when the response form is submitted', async () => {
    const user = userEvent.setup()
    const { onCreateResponse, onResponseDraftChange } = renderWorkspace({
      feedbackThreads: [feedbackThread],
      responseDraft: '已收到，稍后给出建议。',
    })

    const responseInput = screen.getByLabelText(/回复 王同学 的反馈/)
    await user.click(responseInput)
    await user.type(responseInput, 'X')

    expect(onResponseDraftChange).toHaveBeenCalled()

    const replyButton = screen.getByRole('button', { name: '回复学生' })
    await user.click(replyButton)

    expect(onCreateResponse).toHaveBeenCalledWith('feedback-1')
  })

  it('shows course feedback overview entries with student name and student number', () => {
    renderWorkspace({
      courseFeedbacks: [courseFeedback],
    })

    expect(screen.getByText('课程节奏合理。')).toBeInTheDocument()
    expect(screen.getByText(/陈同学/)).toBeInTheDocument()
    expect(screen.getByText(/162350004/)).toBeInTheDocument()
  })
})
