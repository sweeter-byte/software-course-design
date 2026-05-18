import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type {
  AssignmentItem,
  CourseItem,
  SubmissionItem,
  WorkspaceContext,
} from '../../domain'
import { WorkspaceContextBar } from './WorkspaceContextBar'

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

const otherCourse: CourseItem = {
  ...course,
  id: 'course-2',
  courseCode: 'SE-1002',
  courseName: '软件测试',
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

const submission: SubmissionItem = {
  id: 'submission-1',
  assignmentId: 'assignment-1',
  studentId: 'student-1',
  studentName: '李同学',
  studentNo: '162350001',
  content: '学生答案',
  status: 'graded',
  score: 91,
}

function renderBar(
  overrides: Partial<{
    context: WorkspaceContext
    courses: CourseItem[]
    assignments: AssignmentItem[]
    submissions: SubmissionItem[]
    onCourseChange: (id: string) => void
    onAssignmentChange: (id: string) => void
    onSubmissionChange: (id: string) => void
  }> = {},
) {
  const onCourseChange = overrides.onCourseChange ?? vi.fn()
  const onAssignmentChange = overrides.onAssignmentChange ?? vi.fn()
  const onSubmissionChange = overrides.onSubmissionChange ?? vi.fn()
  render(
    <WorkspaceContextBar
      context={
        overrides.context ?? {
          course: null,
          assignment: null,
          submission: null,
        }
      }
      courses={overrides.courses ?? []}
      assignments={overrides.assignments ?? []}
      submissions={overrides.submissions ?? []}
      onCourseChange={onCourseChange}
      onAssignmentChange={onAssignmentChange}
      onSubmissionChange={onSubmissionChange}
    />,
  )
  return { onCourseChange, onAssignmentChange, onSubmissionChange }
}

describe('WorkspaceContextBar', () => {
  it('shows the current student submission even when no selectable submission list is loaded', () => {
    renderBar({
      context: { course, assignment, submission },
      courses: [course],
      assignments: [assignment],
      submissions: [],
    })

    const submissionSelect = screen.getByRole('combobox', { name: '提交' })
    expect(within(submissionSelect).getByText('李同学 / graded')).toBeInTheDocument()
    expect(submissionSelect).not.toBeDisabled()
    expect(submissionSelect).toHaveValue('submission-1')
  })

  it('disables the submission select when no submission is bound and the list is empty', () => {
    renderBar({
      context: { course, assignment, submission: null },
      courses: [course],
      assignments: [assignment],
      submissions: [],
    })

    const submissionSelect = screen.getByRole('combobox', { name: '提交' })
    expect(submissionSelect).toBeDisabled()
    expect(submissionSelect).toHaveValue('')
  })

  it('disables the assignment select when no course is bound', () => {
    renderBar({
      context: { course: null, assignment: null, submission: null },
      courses: [course],
      assignments: [],
      submissions: [],
    })

    const assignmentSelect = screen.getByRole('combobox', { name: '作业' })
    expect(assignmentSelect).toBeDisabled()
  })

  it('emits course change when a different course is picked', async () => {
    const user = userEvent.setup()
    const { onCourseChange } = renderBar({
      context: { course, assignment: null, submission: null },
      courses: [course, otherCourse],
      assignments: [],
      submissions: [],
    })

    const courseSelect = screen.getByRole('combobox', { name: '课程' })
    await user.selectOptions(courseSelect, 'course-2')

    expect(onCourseChange).toHaveBeenCalledWith('course-2')
  })

  it('emits submission change when a different submission is picked from the list', async () => {
    const user = userEvent.setup()
    const otherSubmission: SubmissionItem = {
      ...submission,
      id: 'submission-2',
      studentId: 'student-2',
      studentName: '王同学',
      studentNo: '162350002',
    }
    const { onSubmissionChange } = renderBar({
      context: { course, assignment, submission },
      courses: [course],
      assignments: [assignment],
      submissions: [submission, otherSubmission],
    })

    const submissionSelect = screen.getByRole('combobox', { name: '提交' })
    await user.selectOptions(submissionSelect, 'submission-2')

    expect(onSubmissionChange).toHaveBeenCalledWith('submission-2')
  })
})
