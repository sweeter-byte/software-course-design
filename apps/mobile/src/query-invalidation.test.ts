import { describe, expect, it, vi } from 'vitest'

import {
  getCourseEnrollmentInvalidationKeys,
  getFeedbackThreadInvalidationKeys,
  getSubmissionGradeInvalidationKeys,
  invalidateQueryKeys,
} from './query-invalidation'

describe('mobile query invalidation model', () => {
  it('invalidates teacher task queues after grading a submission', () => {
    expect(getSubmissionGradeInvalidationKeys('http://api', 'token', 'course-1', 'submission-1')).toEqual([
      ['mobile-submission-detail', 'http://api', 'token', 'submission-1'],
      ['mobile-assignment-submissions'],
      ['mobile-teacher-submissions'],
      ['mobile-course-assignments', 'http://api', 'token', 'course-1'],
      ['mobile-teacher-feedback-threads'],
      ['mobile-dashboard'],
    ])
  })

  it('invalidates all feedback consumers after thread mutations', () => {
    expect(getFeedbackThreadInvalidationKeys()).toEqual([
      ['mobile-feedback-threads'],
      ['mobile-teacher-feedback-threads'],
      ['mobile-course-feedback-threads'],
      ['mobile-dashboard'],
    ])
  })

  it('invalidates enrolled course consumers after joining a course', () => {
    expect(getCourseEnrollmentInvalidationKeys()).toEqual([
      ['mobile-course-list'],
      ['mobile-course-detail'],
      ['mobile-student-courses'],
      ['mobile-courses'],
      ['mobile-dashboard'],
    ])
  })

  it('passes query keys to react query invalidation without rewriting them', () => {
    const queryClient = { invalidateQueries: vi.fn() }

    invalidateQueryKeys(queryClient, [['a'], ['b', 'c']])

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['a'] })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['b', 'c'] })
  })
})
