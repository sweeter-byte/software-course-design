import { describe, expect, it } from 'vitest'

import {
  getCourseWorkspaceTabs,
  getInitialCourseWorkspaceTab,
} from './course-workspace-model'

describe('mobile course workspace tabs', () => {
  it('mirrors the web course workspace tab semantics per role', () => {
    expect(getCourseWorkspaceTabs('student').map((tab) => tab.value)).toEqual([
      'overview',
      'assignments',
      'feedbacks',
      'course-feedbacks',
    ])

    expect(getCourseWorkspaceTabs('teacher').map((tab) => tab.value)).toEqual([
      'overview',
      'enrollments',
      'assignments',
      'submissions',
      'feedbacks',
      'course-feedbacks',
    ])

    expect(getCourseWorkspaceTabs('officer').map((tab) => tab.value)).toEqual([
      'overview',
      'basic-info',
      'enrollments',
      'assignments',
      'course-feedbacks',
    ])
  })

  it('uses overview as the initial tab for every role', () => {
    expect(getInitialCourseWorkspaceTab('student')).toBe('overview')
    expect(getInitialCourseWorkspaceTab('teacher')).toBe('overview')
    expect(getInitialCourseWorkspaceTab('officer')).toBe('overview')
  })
})
