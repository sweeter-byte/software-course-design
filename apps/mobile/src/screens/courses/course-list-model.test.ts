import { describe, expect, it } from 'vitest'

import type { CourseItem } from '../../domain'
import {
  applyClientCourseFilters,
  buildServerCourseFilters,
  EMPTY_COURSE_LIST_DRAFT,
} from './course-list-model'

const baseCourse: CourseItem = {
  id: 'course-1',
  courseCode: 'SE-5001',
  courseName: '软件工程',
  description: '描述',
  teacherId: 'teacher-1',
  semester: '2026 春',
  location: '将军路 B302',
  scheduleText: '周四 10:00',
  capacity: 50,
  status: 'active',
}

describe('mobile course list filters', () => {
  it('forwards keyword/semester/status to the server for student requests', () => {
    expect(
      buildServerCourseFilters('student', {
        keyword: '软件',
        semester: '2026 春',
        status: 'active',
        teacherId: 'teacher-1',
      }),
    ).toEqual({
      keyword: '软件',
      semester: '2026 春',
      status: 'active',
    })
  })

  it('adds teacherId for officer filters when set', () => {
    expect(
      buildServerCourseFilters('officer', {
        ...EMPTY_COURSE_LIST_DRAFT,
        keyword: 'eng',
        teacherId: 'teacher-2',
      }),
    ).toEqual({ keyword: 'eng', teacherId: 'teacher-2' })
  })

  it('omits server filters entirely for teacher and filters own-courses on the client', () => {
    expect(buildServerCourseFilters('teacher', { ...EMPTY_COURSE_LIST_DRAFT, status: 'active' })).toEqual({})

    const courses: CourseItem[] = [
      baseCourse,
      { ...baseCourse, id: 'course-2', courseCode: 'SE-5002', courseName: '移动开发', teacherId: 'teacher-2' },
      { ...baseCourse, id: 'course-3', courseCode: 'SE-5003', courseName: '软件测试', status: 'completed' },
    ]

    expect(
      applyClientCourseFilters(
        'teacher',
        { ...EMPTY_COURSE_LIST_DRAFT, keyword: '软件', status: 'active' },
        'teacher-1',
        courses,
      ).map((course) => course.id),
    ).toEqual(['course-1'])
  })

  it('lets non-teacher results pass through unchanged at the client filter step', () => {
    expect(
      applyClientCourseFilters('officer', EMPTY_COURSE_LIST_DRAFT, null, [baseCourse]).map((course) => course.id),
    ).toEqual(['course-1'])
  })
})
