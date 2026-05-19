import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-query', () => {
  const loadingQuery = {
    data: undefined,
    isLoading: true,
    isFetching: true,
    isError: false,
    isPending: true,
    isSuccess: false,
    error: null,
    refetch: vi.fn(),
  }
  const idleMutation = {
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    isIdle: true,
    reset: vi.fn(),
    data: undefined,
    error: null,
  }
  return {
    QueryClient: vi.fn(),
    QueryClientProvider: ({ children }: { children: ReactNode }) => children,
    useQuery: () => loadingQuery,
    useMutation: () => idleMutation,
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
      removeQueries: vi.fn(),
      resetQueries: vi.fn(),
      setQueryData: vi.fn(),
    }),
  }
})

import App from './App'

const studentSession = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  user: {
    id: 'student-test-001',
    role: 'student' as const,
    phone: '13900000000',
    username: 'student_demo',
    realName: '演示学生',
  },
}

const teacherSession = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  user: {
    id: 'teacher-test-001',
    role: 'teacher' as const,
    phone: '13900139000',
    username: 'teacher_demo',
    realName: '演示教师',
  },
}

function renderAppAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

describe('App routing', () => {
  it('renders only the account section on /student/account', async () => {
    window.localStorage.setItem('cms_session', JSON.stringify(studentSession))

    renderAppAt('/student/account')

    // Account SectionCard heading appears once the lazy chunk resolves.
    await screen.findByRole('heading', { name: '账号维护', level: 3 })

    // Other workspace SectionCard headings must NOT mount on this view.
    expect(screen.queryByRole('heading', { name: '课程列表' })).toBeNull()
    expect(screen.queryByRole('heading', { name: '当前进度' })).toBeNull()
    expect(screen.queryByRole('heading', { name: '互动交流' })).toBeNull()
    expect(screen.queryByRole('heading', { name: '作业安排' })).toBeNull()
    expect(screen.queryByRole('heading', { name: '课程反馈' })).toBeNull()
  })

  it('redirects /teacher/interaction back to the teacher dashboard', async () => {
    window.localStorage.setItem('cms_session', JSON.stringify(teacherSession))

    renderAppAt('/teacher/interaction')

    // Teacher dashboard shows the course list SectionCard; interaction is no
    // longer in the teacher navigation, so the route should fall back.
    await screen.findByRole('heading', { name: '课程列表' })

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '互动交流' })).toBeNull()
    })
    expect(screen.queryByRole('heading', { name: '账号维护' })).toBeNull()
  })
})
