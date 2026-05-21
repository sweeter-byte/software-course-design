import { describe, expect, it } from 'vitest'

import {
  courseStackRoutes,
  getInitialTabForRole,
  getRoleTabs,
  roleLabels,
} from './navigation-model'

describe('mobile navigation model', () => {
  it('keeps role tab order aligned with the web role navigation', () => {
    expect(getRoleTabs('student').map((item) => [item.routeName, item.label])).toEqual([
      ['Dashboard', '工作台'],
      ['Courses', '课程'],
      ['Assignments', '作业'],
      ['Account', '账号'],
    ])

    expect(getRoleTabs('teacher').map((item) => [item.routeName, item.label])).toEqual([
      ['Dashboard', '工作台'],
      ['Courses', '课程'],
      ['Assignments', '作业'],
      ['TeacherTasks', '任务'],
      ['Account', '账号'],
    ])

    expect(getRoleTabs('officer').map((item) => [item.routeName, item.label])).toEqual([
      ['Dashboard', '工作台'],
      ['Courses', '课程'],
      ['OfficerUsers', '用户'],
      ['OfficerFeedbacks', '反馈'],
      ['Account', '账号'],
    ])
  })

  it('uses each role dashboard as the post-login landing tab', () => {
    expect(getInitialTabForRole('student')).toBe('Dashboard')
    expect(getInitialTabForRole('teacher')).toBe('Dashboard')
    expect(getInitialTabForRole('officer')).toBe('Dashboard')
  })

  it('declares the course stack screens needed for deep detail returns', () => {
    expect(courseStackRoutes).toEqual([
      'CourseList',
      'CourseWorkspace',
      'CourseCreate',
      'AssignmentDetail',
      'SubmissionDetail',
      'FeedbackThread',
    ])
  })

  it('exposes stable Chinese role labels for headers and notices', () => {
    expect(roleLabels).toEqual({
      student: '学生',
      teacher: '教师',
      officer: '教务员',
    })
  })
})
