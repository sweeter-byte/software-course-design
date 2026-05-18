import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { AssignmentItem, CourseItem, SubmissionItem } from '../../domain'
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

describe('TeacherTaskWorkspace', () => {
  it('shows the selected graded submission details outside the pending list', () => {
    const html = renderToStaticMarkup(
      <TeacherTaskWorkspace
        course={course}
        assignment={assignment}
        submissions={[gradedSubmission]}
        feedbackThreads={[]}
        courseFeedbacks={[]}
        selectedSubmissionId="submission-1"
        gradeScore="92"
        gradeFeedback="答案完整。"
        responseDraft=""
        isLoadingSubmissions={false}
        isLoadingFeedbackThreads={false}
        isLoadingCourseFeedbacks={false}
        isGrading={false}
        isResponding={false}
        onSelectSubmission={vi.fn()}
        onGradeScoreChange={vi.fn()}
        onGradeFeedbackChange={vi.fn()}
        onSubmitGrade={vi.fn()}
        onResponseDraftChange={vi.fn()}
        onCreateResponse={vi.fn()}
        onSelectFeedbackThread={vi.fn()}
      />,
    )

    expect(html).toContain('当前选中提交')
    expect(html).toContain('这是学生已经批改过的答案。')
    expect(html).toContain('92 分')
    expect(html).toContain('答案完整。')
  })
})
