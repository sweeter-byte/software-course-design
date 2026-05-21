import { describe, expect, it } from 'vitest'

import type { AdminUserItem, CourseFeedbackItem } from '../../domain'
import {
  evaluateUserToggle,
  filterAdminUsers,
  filterGlobalCourseFeedbacks,
} from './officer-admin-model'

const baseUser: AdminUserItem = {
  id: 'user-1',
  role: 'student',
  status: 'active',
  phone: '13800000001',
  username: 'wang',
  realName: '王同学',
  studentNo: '20260001',
}

describe('officer admin user filters', () => {
  it('matches keyword across name / username / phone / studentNo / teacherNo (case insensitive)', () => {
    const users: AdminUserItem[] = [
      baseUser,
      { ...baseUser, id: 'u2', realName: '李教师', username: 'li', phone: '13900000002', studentNo: null, teacherNo: 'T-202' },
      { ...baseUser, id: 'u3', realName: '陈三', username: 'chen3', phone: '13700000003', studentNo: '20260002' },
    ]

    expect(filterAdminUsers(users, { keyword: 'WANG', status: '' }).map((u) => u.id)).toEqual(['user-1'])
    expect(filterAdminUsers(users, { keyword: '20260002', status: '' }).map((u) => u.id)).toEqual(['u3'])
    expect(filterAdminUsers(users, { keyword: 't-202', status: '' }).map((u) => u.id)).toEqual(['u2'])
    expect(filterAdminUsers(users, { keyword: '139', status: '' }).map((u) => u.id)).toEqual(['u2'])
  })

  it('filters by status', () => {
    const users: AdminUserItem[] = [
      baseUser,
      { ...baseUser, id: 'u2', status: 'disabled' },
      { ...baseUser, id: 'u3', status: 'cancelled' },
    ]
    expect(filterAdminUsers(users, { keyword: '', status: 'disabled' }).map((u) => u.id)).toEqual(['u2'])
    expect(filterAdminUsers(users, { keyword: '', status: 'cancelled' }).map((u) => u.id)).toEqual(['u3'])
  })
})

describe('user toggle rules', () => {
  it('blocks self toggle', () => {
    const state = evaluateUserToggle(baseUser, 'user-1')
    expect(state.canAct).toBe(false)
    expect(state.blockReason).toBe('不能对自己执行启停')
  })

  it('blocks cancelled accounts', () => {
    const state = evaluateUserToggle({ ...baseUser, id: 'u2', status: 'cancelled' }, 'admin-1')
    expect(state.canAct).toBe(false)
    expect(state.blockReason).toBe('注销账号不支持启停')
  })

  it('disables an active account next, with destructive confirm copy', () => {
    const state = evaluateUserToggle({ ...baseUser, id: 'u2' }, 'admin-1')
    expect(state.canAct).toBe(true)
    expect(state.nextDisabled).toBe(true)
    expect(state.actionLabel).toBe('禁用')
    expect(state.confirmMessage).toContain('禁用')
  })

  it('recovers a disabled account next, with restorative confirm copy', () => {
    const state = evaluateUserToggle({ ...baseUser, id: 'u2', status: 'disabled' }, 'admin-1')
    expect(state.canAct).toBe(true)
    expect(state.nextDisabled).toBe(false)
    expect(state.actionLabel).toBe('恢复')
    expect(state.confirmMessage).toContain('恢复')
  })
})

describe('global course feedback dimension filter', () => {
  const base: CourseFeedbackItem = {
    id: 'cf1',
    courseId: 'c1',
    courseName: '软件工程',
    studentId: 's1',
    teacherId: 't1',
    dimension: 'teaching',
    content: '老师讲课节奏好。',
    status: 'open',
  }

  it('returns all items when no filter is set', () => {
    expect(filterGlobalCourseFeedbacks([base], '').map((item) => item.id)).toEqual(['cf1'])
  })

  it('filters by dimension value', () => {
    const items: CourseFeedbackItem[] = [
      base,
      { ...base, id: 'cf2', dimension: 'gain' },
      { ...base, id: 'cf3', dimension: 'content' },
    ]
    expect(filterGlobalCourseFeedbacks(items, 'gain').map((item) => item.id)).toEqual(['cf2'])
  })
})
