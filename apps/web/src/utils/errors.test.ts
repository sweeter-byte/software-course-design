import { describe, expect, it } from 'vitest'

import { friendlyErrorMessage } from './errors'

describe('friendlyErrorMessage', () => {
  it('explains that assignment feedback requires a graded submission', () => {
    expect(friendlyErrorMessage('feedback_requires_grading')).toBe(
      '该提交尚未批改，批改后才能发起作业问题或反馈。',
    )
  })

  it('keeps service connection failures actionable', () => {
    expect(friendlyErrorMessage('Failed to fetch')).toBe('当前无法连接系统服务，请确认后端服务已启动。')
  })
})
