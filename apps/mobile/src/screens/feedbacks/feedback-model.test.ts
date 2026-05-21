import { describe, expect, it } from 'vitest'

import type { AssignmentItem, FeedbackItem } from '../../domain'
import {
  buildStudentFeedbackRows,
  canStudentEditFeedback,
  canTeacherEditResponse,
} from './feedback-model'

const baseAssignment: AssignmentItem = {
  id: 'a1',
  courseId: 'c1',
  teacherId: 't1',
  title: '实验报告',
  description: '',
  requirement: '',
  startAt: '2026-05-01T00:00:00.000Z',
  dueAt: '2026-06-01T00:00:00.000Z',
  status: 'published',
}

describe('student feedback aggregation', () => {
  it('only surfaces assignments whose own submission is graded', () => {
    const assignments: AssignmentItem[] = [
      {
        ...baseAssignment,
        id: 'a-graded',
        mySubmission: {
          id: 's1',
          assignmentId: 'a-graded',
          studentId: 'student-1',
          content: 'x',
          status: 'graded',
          score: 92,
          teacherFeedback: '思路清晰',
        },
      },
      {
        ...baseAssignment,
        id: 'a-submitted',
        mySubmission: {
          id: 's2',
          assignmentId: 'a-submitted',
          studentId: 'student-1',
          content: 'x',
          status: 'submitted',
        },
      },
      { ...baseAssignment, id: 'a-none' },
    ]

    const rows = buildStudentFeedbackRows(assignments, [])

    expect(rows.map((row) => row.assignmentId)).toEqual(['a-graded'])
    expect(rows[0]).toMatchObject({
      score: '92 分',
      teacherFeedback: '思路清晰',
      hasThread: false,
      hasResponse: false,
    })
  })

  it('joins matching feedback threads and detects answered status', () => {
    const assignments: AssignmentItem[] = [
      {
        ...baseAssignment,
        id: 'a-answered',
        mySubmission: {
          id: 's1',
          assignmentId: 'a-answered',
          studentId: 'student-1',
          content: 'x',
          status: 'graded',
          score: 80,
        },
      },
      {
        ...baseAssignment,
        id: 'a-unanswered',
        mySubmission: {
          id: 's2',
          assignmentId: 'a-unanswered',
          studentId: 'student-1',
          content: 'x',
          status: 'graded',
        },
      },
    ]

    const threads: FeedbackItem[] = [
      {
        id: 'f1',
        assignmentId: 'a-answered',
        submissionId: 's1',
        studentId: 'student-1',
        kind: 'question',
        content: '请问评分标准是什么？',
        status: 'open',
        responses: [
          { id: 'r1', feedbackId: 'f1', teacherId: 't1', content: '请看作业说明附件。' },
        ],
      },
      {
        id: 'f2',
        assignmentId: 'a-unanswered',
        submissionId: 's2',
        studentId: 'student-1',
        kind: 'feedback',
        content: '希望加更多案例。',
        status: 'open',
        responses: [],
      },
    ]

    const rows = buildStudentFeedbackRows(assignments, threads)

    const answered = rows.find((row) => row.assignmentId === 'a-answered')
    const unanswered = rows.find((row) => row.assignmentId === 'a-unanswered')

    expect(answered?.hasThread).toBe(true)
    expect(answered?.hasResponse).toBe(true)
    expect(unanswered?.hasThread).toBe(true)
    expect(unanswered?.hasResponse).toBe(false)
  })

  it('truncates overlong teacher feedback to keep the row tidy', () => {
    const long = 'A'.repeat(120)
    const rows = buildStudentFeedbackRows(
      [
        {
          ...baseAssignment,
          mySubmission: {
            id: 's1',
            assignmentId: baseAssignment.id,
            studentId: 'student-1',
            content: 'x',
            status: 'graded',
            score: 90,
            teacherFeedback: long,
          },
        },
      ],
      [],
    )
    expect(rows[0].teacherFeedback.length).toBe(81)
    expect(rows[0].teacherFeedback.endsWith('…')).toBe(true)
  })
})

describe('feedback lock rules', () => {
  it('lets a student edit/delete their thread only when no teacher response yet', () => {
    expect(canStudentEditFeedback({ responses: [] })).toBe(true)
    expect(
      canStudentEditFeedback({
        responses: [{ id: 'r1', feedbackId: 'f1', teacherId: 't1', content: '回复' }],
      }),
    ).toBe(false)
  })

  it('only lets the response owner modify it', () => {
    expect(canTeacherEditResponse({ teacherId: 't1' }, 't1')).toBe(true)
    expect(canTeacherEditResponse({ teacherId: 't1' }, 't2')).toBe(false)
  })
})
