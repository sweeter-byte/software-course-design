import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNotifications } from './useNotifications'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useNotifications', () => {
  it('starts with an empty queue', () => {
    const { result } = renderHook(() => useNotifications())
    expect(result.current.notifications).toEqual([])
  })

  it('pushes a notification when notify is called', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notify({ type: 'success', content: '已保存。' })
    })

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0]).toMatchObject({
      type: 'success',
      content: '已保存。',
    })
    expect(typeof result.current.notifications[0].id).toBe('number')
  })

  it('stacks multiple notifications with distinct ids', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notify({ type: 'info', content: '第一条' })
      result.current.notify({ type: 'error', content: '第二条' })
    })

    expect(result.current.notifications).toHaveLength(2)
    const [first, second] = result.current.notifications
    expect(first.content).toBe('第一条')
    expect(second.content).toBe('第二条')
    expect(first.id).not.toBe(second.id)
  })

  it('removes a notification when dismiss is called', () => {
    const { result } = renderHook(() => useNotifications())
    let id = 0

    act(() => {
      id = result.current.notify({ type: 'info', content: '会被关闭' })
    })

    act(() => {
      result.current.dismiss(id)
    })

    expect(result.current.notifications).toEqual([])
  })

  it('auto-dismisses notifications after the default ttl', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notify({ type: 'success', content: '自动消失' })
    })
    expect(result.current.notifications).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(result.current.notifications).toEqual([])
  })

  it('uses a longer ttl for errors than for info/success', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notify({ type: 'error', content: '错误持续更久' })
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.notifications).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.notifications).toEqual([])
  })

  it('keeps the notification when ttl is null', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.notify({ type: 'info', content: '常驻通知', ttl: null })
    })

    act(() => {
      vi.advanceTimersByTime(60000)
    })

    expect(result.current.notifications).toHaveLength(1)
  })

  it('clears pending timer when dismissed manually', () => {
    const { result } = renderHook(() => useNotifications())
    let id = 0

    act(() => {
      id = result.current.notify({ type: 'success', content: '提前关闭' })
    })

    act(() => {
      result.current.dismiss(id)
    })

    act(() => {
      result.current.notify({ type: 'info', content: '新一条' })
    })

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(result.current.notifications).toHaveLength(1)
    expect(result.current.notifications[0].content).toBe('新一条')
  })
})
