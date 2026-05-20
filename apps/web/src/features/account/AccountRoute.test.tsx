import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SessionPayload } from '../../api'
import { AuthProvider } from '../../contexts/AuthContext'
import { AccountRoute } from './AccountRoute'

const reactQueryMock = vi.hoisted(() => ({
  currentQuery: {
    data: undefined as { user: Record<string, unknown> } | undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null as unknown,
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => reactQueryMock.currentQuery),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  })),
  useMutation: vi.fn((options: {
    mutationFn: (variables?: unknown) => Promise<unknown>
    onSuccess?: (data: unknown) => void
    onError?: (error: unknown) => void
  }) => ({
    isPending: false,
    mutate: vi.fn(async (variables?: unknown) => {
      try {
        const payload = await options.mutationFn(variables)
        options.onSuccess?.(payload)
      } catch (error) {
        options.onError?.(error)
      }
    }),
  })),
}))

const session: SessionPayload = {
  accessToken: 'test-token',
  user: {
    id: 'user-1',
    role: 'student',
    phone: '13800139000',
    username: 'session_user',
    realName: '会话学生',
    studentNo: '1623001',
  },
}

function renderRoute(fetchImpl: typeof fetch) {
  vi.stubGlobal('fetch', fetchImpl)
  const onSessionInvalidated = vi.fn()
  const onPhoneChanged = vi.fn()
  const onPasswordChanged = vi.fn()
  const onUpdateUser = vi.fn()

  const view = render(
    <AuthProvider apiBaseUrl="http://localhost:4100/api/v1" session={session}>
      <AccountRoute
        onSessionInvalidated={onSessionInvalidated}
        onPhoneChanged={onPhoneChanged}
        onPasswordChanged={onPasswordChanged}
        onUpdateUser={onUpdateUser}
      />
    </AuthProvider>,
  )

  return { ...view, onSessionInvalidated, onPhoneChanged, onPasswordChanged, onUpdateUser }
}

beforeEach(() => {
  reactQueryMock.currentQuery = {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AccountRoute', () => {
  it('loads the current user profile into editable fields', async () => {
    reactQueryMock.currentQuery = {
      data: {
        user: {
          id: 'user-1',
          role: 'student',
          status: 'active',
          phone: '13800139000',
          username: 'profile_user',
          realName: '资料学生',
          email: 'profile@example.com',
          gender: '女',
          college: '计算机科学与技术学院',
          major: '软件工程',
          className: '1623001',
          updatedAt: '2026-05-20T00:00:00.000Z',
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    }

    renderRoute(
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              user: {
                id: 'user-1',
                role: 'student',
                status: 'active',
                phone: '13800139000',
                username: 'profile_user',
                realName: '资料学生',
                email: 'profile@example.com',
                gender: '女',
                college: '计算机科学与技术学院',
                major: '软件工程',
                className: '1623001',
                updatedAt: '2026-05-20T00:00:00.000Z',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ) as typeof fetch,
    )

    expect(await screen.findByDisplayValue('profile@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('计算机科学与技术学院')).toBeInTheDocument()
    expect(screen.getByDisplayValue('软件工程')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1623001')).toBeInTheDocument()
  })

  it('submits profile edits and updates session-visible names', async () => {
    reactQueryMock.currentQuery = {
      data: {
        user: {
          username: 'profile_user',
          realName: '资料学生',
          email: 'profile@example.com',
          gender: '女',
          college: '计算机科学与技术学院',
          major: '软件工程',
          className: '1623001',
          updatedAt: '2026-05-20T00:00:00.000Z',
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    }
    const fetchMock = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method ?? 'GET'

      if (url.endsWith('/users/me') && method === 'PATCH') {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              user: {
                username: 'profile_saved',
                realName: '保存学生',
                email: 'saved@example.com',
                gender: '男',
                college: '信息学院',
                major: '计算机科学与技术',
                className: '1623003',
                updatedAt: '2026-05-20T00:00:01.000Z',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              username: 'profile_user',
              realName: '资料学生',
              email: 'profile@example.com',
              gender: '女',
              college: '计算机科学与技术学院',
              major: '软件工程',
              className: '1623001',
              updatedAt: '2026-05-20T00:00:00.000Z',
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    const user = userEvent.setup()
    const { onUpdateUser } = renderRoute(fetchMock as typeof fetch)

    const emailInput = await screen.findByDisplayValue('profile@example.com')
    await user.clear(emailInput)
    await user.type(emailInput, 'saved@example.com')
    await user.click(screen.getByRole('button', { name: '保存资料' }))

    await waitFor(() => {
      expect(onUpdateUser).toHaveBeenCalledWith({
        username: 'profile_saved',
        realName: '保存学生',
      })
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4100/api/v1/users/me',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('saved@example.com'),
      }),
    )
  })

  it('does not overwrite edits when the profile query finishes after typing starts', async () => {
    reactQueryMock.currentQuery = {
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      error: null,
    }
    const fetchMock = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method ?? 'GET'

      if (url.endsWith('/users/me') && method === 'PATCH') {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              user: {
                username: 'session_user',
                realName: '会话学生',
                email: 'typed@example.com',
                gender: '女',
                college: null,
                major: null,
                className: null,
                updatedAt: '2026-05-20T00:00:01.000Z',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    const user = userEvent.setup()
    const { rerender } = renderRoute(fetchMock as typeof fetch)

    await user.type(screen.getByLabelText('邮箱'), 'typed@example.com')
    reactQueryMock.currentQuery = {
      data: {
        user: {
          username: 'session_user',
          realName: '会话学生',
          email: null,
          gender: null,
          college: null,
          major: null,
          className: null,
          updatedAt: '2026-05-20T00:00:00.000Z',
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    }

    rerender(
      <AuthProvider apiBaseUrl="http://localhost:4100/api/v1" session={session}>
        <AccountRoute
          onSessionInvalidated={vi.fn()}
          onPhoneChanged={vi.fn()}
          onPasswordChanged={vi.fn()}
          onUpdateUser={vi.fn()}
        />
      </AuthProvider>,
    )

    expect(screen.getByLabelText('邮箱')).toHaveValue('typed@example.com')
    await user.selectOptions(screen.getByLabelText('性别'), '女')
    await user.click(screen.getByRole('button', { name: '保存资料' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:4100/api/v1/users/me',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('typed@example.com'),
        }),
      )
    })
  })

  it('invalidates the current session after changing phone successfully', async () => {
    const fetchMock = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method ?? 'GET'

      if (url.endsWith('/auth/phone/change') && method === 'POST') {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              user: {
                id: 'user-1',
                phone: '13800139999',
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              username: 'session_user',
              realName: '会话学生',
              updatedAt: '2026-05-20T00:00:00.000Z',
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    })
    const user = userEvent.setup()
    const { onPhoneChanged, onUpdateUser } = renderRoute(fetchMock as typeof fetch)

    await user.clear(screen.getByLabelText('新手机号'))
    await user.type(screen.getByLabelText('旧手机号验证码'), '123456')
    await user.type(screen.getByLabelText('新手机号'), '13800139999')
    await user.type(screen.getByLabelText('新手机号验证码'), '654321')
    await user.click(screen.getByRole('button', { name: '修改手机号' }))

    await waitFor(() => {
      expect(onPhoneChanged).toHaveBeenCalledTimes(1)
    })
    expect(onUpdateUser).not.toHaveBeenCalledWith({ phone: '13800139999' })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4100/api/v1/auth/phone/change',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('13800139999'),
      }),
    )
  })
})
