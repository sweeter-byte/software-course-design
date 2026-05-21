import { describe, expect, it } from 'vitest'

import type { AssignmentItem, SubmissionItem } from '../../domain'
import {
  derivedSubmissionStatusForAssignment,
  deriveAssignmentStatus,
  evaluateStudentSubmissionLock,
} from './assignment-status'

const baseAssignment: Pick<AssignmentItem, 'status' | 'startAt' | 'dueAt'> = {
  status: 'published',
  startAt: '2026-05-01T00:00:00.000Z',
  dueAt: '2026-06-01T00:00:00.000Z',
}

describe('mobile assignment status derivation', () => {
  it('marks not_started when current time is before startAt', () => {
    const now = Date.parse('2026-04-15T00:00:00.000Z')
    expect(deriveAssignmentStatus(baseAssignment, now)).toBe('not_started')
  })

  it('marks in_progress between start and due dates', () => {
    const now = Date.parse('2026-05-15T00:00:00.000Z')
    expect(deriveAssignmentStatus(baseAssignment, now)).toBe('in_progress')
  })

  it('marks closed once the deadline has elapsed', () => {
    const now = Date.parse('2026-06-02T00:00:00.000Z')
    expect(deriveAssignmentStatus(baseAssignment, now)).toBe('closed')
  })

  it('honors the cancelled state even before the deadline', () => {
    const now = Date.parse('2026-05-10T00:00:00.000Z')
    expect(deriveAssignmentStatus({ ...baseAssignment, status: 'cancelled' }, now)).toBe('cancelled')
  })
})

describe('student submission lock rules', () => {
  const submitting = { isSubmitting: false, isUpdating: false }

  it('allows submitting when assignment is in progress and no submission exists yet', () => {
    const now = Date.parse('2026-05-15T00:00:00.000Z')
    const result = evaluateStudentSubmissionLock(baseAssignment, null, submitting, now)
    expect(result).toMatchObject({
      canEdit: true,
      lockReason: null,
      primaryButtonLabel: '提交答案',
    })
  })

  it('blocks modification once the submission is graded', () => {
    const now = Date.parse('2026-05-15T00:00:00.000Z')
    const submission: Pick<SubmissionItem, 'status'> = { status: 'graded' }
    const result = evaluateStudentSubmissionLock(baseAssignment, submission, submitting, now)
    expect(result.canEdit).toBe(false)
    expect(result.lockReason).toBe('提交已批改，不能再修改。')
    expect(result.primaryButtonLabel).toBe('已批改不可修改')
  })

  it('blocks editing past the deadline even when not graded', () => {
    const now = Date.parse('2026-06-02T00:00:00.000Z')
    const submission: Pick<SubmissionItem, 'status'> = { status: 'submitted' }
    const result = evaluateStudentSubmissionLock(baseAssignment, submission, submitting, now)
    expect(result.canEdit).toBe(false)
    expect(result.lockReason).toBe('作业已截止，不能再提交或修改。')
    expect(result.primaryButtonLabel).toBe('已截止不可修改')
  })

  it('blocks submitting when assignment is cancelled', () => {
    const now = Date.parse('2026-05-15T00:00:00.000Z')
    const result = evaluateStudentSubmissionLock(
      { ...baseAssignment, status: 'cancelled' },
      null,
      submitting,
      now,
    )
    expect(result.canEdit).toBe(false)
    expect(result.lockReason).toBe('该作业已取消，不能再提交或修改。')
    expect(result.primaryButtonLabel).toBe('作业已取消')
  })

  it('shows in-flight labels while submitting or updating', () => {
    const now = Date.parse('2026-05-15T00:00:00.000Z')
    expect(
      evaluateStudentSubmissionLock(baseAssignment, null, { isSubmitting: true, isUpdating: false }, now)
        .primaryButtonLabel,
    ).toBe('提交中…')
    expect(
      evaluateStudentSubmissionLock(
        baseAssignment,
        { status: 'submitted' },
        { isSubmitting: false, isUpdating: true },
        now,
      ).primaryButtonLabel,
    ).toBe('修改中…')
  })
})

describe('derivedSubmissionStatusForAssignment', () => {
  const base: AssignmentItem = {
    id: 'a',
    courseId: 'c',
    teacherId: 't',
    title: '作业',
    description: '',
    requirement: '',
    startAt: '2026-05-01T00:00:00.000Z',
    dueAt: '2026-06-01T00:00:00.000Z',
    status: 'published',
  }

  it('uses mySubmission.status when present', () => {
    expect(
      derivedSubmissionStatusForAssignment({
        ...base,
        mySubmission: { id: 's', assignmentId: 'a', studentId: 'u', content: '', status: 'graded' },
      }),
    ).toBe('graded')
  })

  it('falls back to hasSubmitted=true → submitted', () => {
    expect(derivedSubmissionStatusForAssignment({ ...base, hasSubmitted: true })).toBe('submitted')
  })

  it('falls back to draft when no submission info exists', () => {
    expect(derivedSubmissionStatusForAssignment(base)).toBe('draft')
  })
})
