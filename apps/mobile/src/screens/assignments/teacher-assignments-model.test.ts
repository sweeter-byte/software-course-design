import { describe, expect, it } from 'vitest'

import { selectTeacherCourseForTarget } from './teacher-assignments-model'

describe('teacher assignments mobile model', () => {
  it('uses the shared course picker for filtering without changing the publish draft', () => {
    const state = {
      courseFilter: '',
      draft: { courseId: 'course-for-publish', title: '作业' },
    }

    expect(selectTeacherCourseForTarget('filter', 'course-filter', state)).toEqual({
      courseFilter: 'course-filter',
      draft: state.draft,
    })
  })

  it('uses the shared course picker for publish target without changing the list filter', () => {
    const state = {
      courseFilter: 'current-filter',
      draft: { courseId: '', title: '作业' },
    }

    expect(selectTeacherCourseForTarget('publish', 'course-publish', state)).toEqual({
      courseFilter: 'current-filter',
      draft: { courseId: 'course-publish', title: '作业' },
    })
  })
})
