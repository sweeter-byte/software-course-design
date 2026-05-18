import { describe, expect, it } from 'vitest'

import { friendlyErrorMessage } from './errors'

describe('friendlyErrorMessage', () => {
  it('explains that assignment feedback requires a graded submission', () => {
    expect(friendlyErrorMessage('feedback_requires_grading')).toBe(
      '该提交尚未批改，批改后才能发起作业问题或反馈。',
    )
  })

  it('explains submission lifecycle business errors', () => {
    expect(friendlyErrorMessage('submission_already_graded')).toBe('该提交已批改，不能再修改答案。')
    expect(friendlyErrorMessage('assignment_already_submitted')).toBe('该作业已经提交，不能重复提交。')
    expect(friendlyErrorMessage('assignment_deadline_passed')).toBe(
      '作业截止时间已过，不能继续提交或修改。',
    )
    expect(friendlyErrorMessage('course_enrollment_required')).toBe('请先加入课程，再进行相关操作。')
  })

  it('keeps service connection failures actionable', () => {
    expect(friendlyErrorMessage('Failed to fetch')).toBe('当前无法连接系统服务，请确认后端服务已启动。')
  })
})
