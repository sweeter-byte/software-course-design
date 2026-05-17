import { describe, expect, it } from 'vitest'

import type { SessionPayload } from './api'
import { readInitialRuntimeState } from './runtime-state'

function createStorage(seed: Record<string, string>) {
  const store = new Map(Object.entries(seed))

  return {
    getItem(key: string) {
      return store.get(key) ?? null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
  }
}

describe('readInitialRuntimeState', () => {
  it('falls back when the stored api base url is not a string', () => {
    const storage = createStorage({
      cms_api_base: JSON.stringify({ invalid: true }),
    })

    const state = readInitialRuntimeState(storage, 'http://localhost:4100/api/v1')

    expect(state.apiBaseUrl).toBe('http://localhost:4100/api/v1')
    expect(state.session).toBeNull()
    expect(state.recoveredInvalidSession).toBe(false)
  })

  it('drops malformed stored session objects instead of trusting them', () => {
    const storage = createStorage({
      cms_session: JSON.stringify({ bogus: true }),
    })

    const state = readInitialRuntimeState(storage, 'http://localhost:4100/api/v1')

    expect(state.session).toBeNull()
    expect(state.recoveredInvalidSession).toBe(true)
    expect(storage.getItem('cms_session')).toBeNull()
  })

  it('keeps a valid stored session', () => {
    const session: SessionPayload = {
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        id: 'student-1',
        role: 'student',
        phone: '13800138000',
        username: 'demo',
        realName: 'Demo User',
        studentNo: '2026001',
      },
    }

    const storage = createStorage({
      cms_session: JSON.stringify(session),
      cms_api_base: JSON.stringify('http://localhost:4300/api/v1'),
    })

    const state = readInitialRuntimeState(storage, 'http://localhost:4100/api/v1')

    expect(state.apiBaseUrl).toBe('http://localhost:4300/api/v1')
    expect(state.session).toEqual(session)
    expect(state.recoveredInvalidSession).toBe(false)
  })
})
