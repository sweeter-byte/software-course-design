import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useMediaQuery } from './useMediaQuery'

type Listener = (event: MediaQueryListEvent) => void

function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<Listener>()
  const mql = {
    matches: initialMatches,
    media: '',
    onchange: null,
    addEventListener: vi.fn((_: 'change', listener: Listener) => {
      listeners.add(listener)
    }),
    removeEventListener: vi.fn((_: 'change', listener: Listener) => {
      listeners.delete(listener)
    }),
    addListener: vi.fn((listener: Listener) => {
      listeners.add(listener)
    }),
    removeListener: vi.fn((listener: Listener) => {
      listeners.delete(listener)
    }),
    dispatchEvent: vi.fn(),
  } as MediaQueryList & { matches: boolean }

  const matchMedia = vi.fn(() => mql)
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  })

  return {
    mql,
    matchMedia,
    emit(matches: boolean) {
      mql.matches = matches
      listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent))
    },
  }
}

const originalMatchMedia = window.matchMedia

afterEach(() => {
  if (originalMatchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    })
  }
})

describe('useMediaQuery', () => {
  it('returns the initial match from window.matchMedia', () => {
    installMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(max-width: 840px)'))
    expect(result.current).toBe(true)
  })

  it('updates when the media query changes', () => {
    const env = installMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(max-width: 840px)'))
    expect(result.current).toBe(false)

    act(() => {
      env.emit(true)
    })
    expect(result.current).toBe(true)

    act(() => {
      env.emit(false)
    })
    expect(result.current).toBe(false)
  })

  it('unsubscribes on unmount', () => {
    const env = installMatchMedia(false)
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 840px)'))
    expect(env.mql.addEventListener).toHaveBeenCalledTimes(1)
    unmount()
    expect(env.mql.removeEventListener).toHaveBeenCalledTimes(1)
  })
})
