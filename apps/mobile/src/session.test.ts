import { describe, expect, it, vi } from 'vitest'

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}))

import {
  clearStoredSession,
  loadStoredSession,
  persistSession,
  refreshStoredSession,
} from './session'
import type { SessionPayload } from './api'

const session: SessionPayload = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: {
    id: 'student-1',
    role: 'student',
    phone: '13800000000',
    username: 'student',
    realName: '学生一',
    studentNo: '20260001',
  },
}

function createStorage(initialValue: string | null = null) {
  let value = initialValue

  return {
    getItemAsync: vi.fn(async () => value),
    setItemAsync: vi.fn(async (_key: string, nextValue: string) => {
      value = nextValue
    }),
    deleteItemAsync: vi.fn(async () => {
      value = null
    }),
  }
}

describe('mobile session persistence', () => {
  it('persists and loads a valid session payload', async () => {
    const storage = createStorage()

    await persistSession(storage, session)
    await expect(loadStoredSession(storage)).resolves.toEqual(session)
  })

  it('deletes malformed stored session data and falls back to memory state', async () => {
    const storage = createStorage(JSON.stringify({ accessToken: 'token', user: { role: 'student' } }))

    await expect(loadStoredSession(storage)).resolves.toBeNull()
    expect(storage.deleteItemAsync).toHaveBeenCalledWith('cms_session')
  })

  it('clears the persisted session during logout flows', async () => {
    const storage = createStorage(JSON.stringify(session))

    await clearStoredSession(storage)

    expect(storage.deleteItemAsync).toHaveBeenCalledWith('cms_session')
    await expect(loadStoredSession(storage)).resolves.toBeNull()
  })

  it('refreshes stored user data before restoring a session', async () => {
    const storage = createStorage(JSON.stringify(session))
    const loadCurrentUser = vi.fn(async () => ({
      user: {
        ...session.user,
        username: 'new-name',
        realName: '学生一（已更新）',
      },
    }))

    await expect(refreshStoredSession(storage, loadCurrentUser)).resolves.toEqual({
      ...session,
      user: {
        ...session.user,
        username: 'new-name',
        realName: '学生一（已更新）',
      },
    })
    expect(loadCurrentUser).toHaveBeenCalledWith('access-token')
    await expect(loadStoredSession(storage)).resolves.toMatchObject({
      user: { username: 'new-name', realName: '学生一（已更新）' },
    })
  })

  it('clears stored credentials when session refresh is rejected', async () => {
    const storage = createStorage(JSON.stringify(session))
    const loadCurrentUser = vi.fn(async () => {
      throw new Error('account_disabled')
    })

    await expect(refreshStoredSession(storage, loadCurrentUser)).resolves.toBeNull()

    expect(storage.deleteItemAsync).toHaveBeenCalledWith('cms_session')
    await expect(loadStoredSession(storage)).resolves.toBeNull()
  })
})
