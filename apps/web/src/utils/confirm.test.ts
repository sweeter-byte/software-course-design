import { afterEach, describe, expect, it, vi } from 'vitest'

import { confirmDestructive } from './confirm'

describe('confirmDestructive', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when the user confirms', () => {
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    expect(confirmDestructive('确认删除？')).toBe(true)
    expect(spy).toHaveBeenCalledWith('确认删除？')
  })

  it('returns false when the user cancels', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    expect(confirmDestructive('确认删除？')).toBe(false)
  })

  it('passes the message through verbatim', () => {
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    confirmDestructive('确认取消当前作业并清除相关提交记录吗？')
    expect(spy).toHaveBeenCalledWith('确认取消当前作业并清除相关提交记录吗？')
  })
})
