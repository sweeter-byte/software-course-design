import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { AssignmentItem, CourseItem, SubmissionItem, WorkspaceContext } from '../../domain'
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

describe('WorkspaceContextBar', () => {
  it('shows the current student submission even when no selectable submission list is loaded', () => {
    const context: WorkspaceContext = {
      course,
      assignment,
      submission,
    }

    const html = renderToStaticMarkup(
      <WorkspaceContextBar
        context={context}
        courses={[course]}
        assignments={[assignment]}
        submissions={[]}
        onCourseChange={vi.fn()}
        onAssignmentChange={vi.fn()}
        onSubmissionChange={vi.fn()}
      />,
    )

    expect(html).toContain('李同学 / graded')
  })
})
