import { describe, expect, it } from 'vitest'

import type { AssignmentItem, FeedbackItem, SubmissionItem } from '../../domain'
import {
  buildDashboardActions,
  buildDashboardMetrics,
  buildDashboardTasks,
  buildTeacherTaskQueues,
} from './dashboard-model'

const baseAssignment: AssignmentItem = {
  id: 'assignment-1',
  courseId: 'course-1',
  teacherId: 'teacher-1',
  title: '实验报告',
  description: '完成实验报告',
  requirement: '按模板提交',
  startAt: '2026-05-01T00:00:00.000Z',
  dueAt: '2026-05-30T00:00:00.000Z',
  status: 'published',
}

const baseSubmission: SubmissionItem = {
  id: 'submission-1',
  assignmentId: 'assignment-1',
  studentId: 'student-1',
  studentName: '王同学',
  content: '实验报告内容',
  status: 'submitted',
  submittedAt: '2026-05-20T10:00:00.000Z',
}

const baseFeedback: FeedbackItem = {
  id: 'feedback-1',
  courseId: 'course-1',
  assignmentId: 'assignment-1',
  submissionId: 'submission-1',
  studentId: 'student-1',
  studentName: '王同学',
  courseName: '软件工程',
  assignmentTitle: '实验报告',
  kind: 'question',
  content: '老师，评分标准是什么？',
  status: 'open',
  createdAt: '2026-05-20T12:00:00.000Z',
  responses: [],
}

describe('mobile dashboard model', () => {
  it('maps dashboard summary keys to the same Chinese labels used by the web dashboard', () => {
    expect(
      buildDashboardMetrics('student', {
        enrolledCourses: 2,
        pendingAssignments: 3,
        gradedSubmissions: 4,
        openFeedbacks: 1,
        courseFeedbacks: 5,
      }),
    ).toEqual([
      { key: 'enrolledCourses', label: '已加入课程', value: 2 },
      { key: 'pendingAssignments', label: '待提交作业', value: 3 },
      { key: 'gradedSubmissions', label: '已批改提交', value: 4 },
      { key: 'openFeedbacks', label: '作业互动反馈数', value: 1 },
      { key: 'courseFeedbacks', label: '课程反馈数', value: 5 },
    ])

    expect(
      buildDashboardMetrics('teacher', {
        totalCourses: 6,
        publishedAssignments: 7,
        pendingGrades: 8,
        openFeedbacks: 9,
        courseFeedbacks: 10,
      }).map((item) => item.label),
    ).toEqual(['当前课程数', '已发布作业', '待批改提交', '作业互动反馈数', '课程反馈数'])
  })

  it('builds role-specific task prompts and quick actions for the first dashboard screen', () => {
    expect(
      buildDashboardTasks('officer', {
        totalCourses: 12,
        totalTeachers: 4,
        totalStudents: 90,
        openFeedbacks: 3,
        courseFeedbacks: 8,
      }).map((task) => [task.label, task.value, task.target]),
    ).toEqual([
      ['课程运营巡检', 12, 'Courses'],
      ['用户账号巡检', 94, 'OfficerUsers'],
      ['课程反馈查看', 8, 'OfficerFeedbacks'],
    ])

    expect(buildDashboardActions('teacher').map((action) => [action.label, action.target])).toEqual([
      ['授课课程', 'Courses'],
      ['作业管理', 'Assignments'],
      ['教学任务', 'TeacherTasks'],
    ])
  })

  it('filters teacher queues to submitted work and unanswered feedback, newest first', () => {
    const queues = buildTeacherTaskQueues({
      assignments: [
        { assignment: baseAssignment, courseId: 'course-1', courseName: '软件工程' },
        {
          assignment: { ...baseAssignment, id: 'assignment-2', title: '结课论文' },
          courseId: 'course-2',
          courseName: '移动开发',
        },
      ],
      submissionsByAssignment: {
        'assignment-1': [
          baseSubmission,
          {
            ...baseSubmission,
            id: 'submission-graded',
            status: 'graded',
            submittedAt: '2026-05-21T08:00:00.000Z',
          },
        ],
        'assignment-2': [
          {
            ...baseSubmission,
            id: 'submission-new',
            assignmentId: 'assignment-2',
            studentName: '李同学',
            submittedAt: '2026-05-21T09:00:00.000Z',
          },
        ],
      },
      feedbackThreads: [
        baseFeedback,
        {
          ...baseFeedback,
          id: 'feedback-answered',
          responses: [
            {
              id: 'response-1',
              feedbackId: 'feedback-answered',
              teacherId: 'teacher-1',
              content: '已回复',
            },
          ],
        },
      ],
    })

    expect(queues.pendingSubmissions.map((item) => item.submission.id)).toEqual([
      'submission-new',
      'submission-1',
    ])
    expect(queues.pendingFeedbacks.map((item) => item.id)).toEqual(['feedback-1'])
  })
})
