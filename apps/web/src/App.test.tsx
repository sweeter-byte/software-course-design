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
    useQueries: () => [],
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
  window.sessionStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('App routing', () => {
  it('renders the account section on /student/account', async () => {
    // Session lives in sessionStorage now so multiple tabs in the same
    // browser can hold different identities; see runtime-state.ts.
    window.sessionStorage.setItem('cms_session', JSON.stringify(studentSession))

    renderAppAt('/student/account')

    // AccountRoute's header heading.
    await screen.findByRole('heading', { name: '账号维护', level: 3 })

    // The student course list and dashboard summary should not mount here.
    expect(screen.queryByRole('heading', { name: '我的课程', level: 3 })).toBeNull()
    expect(screen.queryByRole('heading', { name: '工作台', level: 2 })).toBeNull()
  })

  it('redirects unknown teacher paths to the teacher dashboard', async () => {
    window.sessionStorage.setItem('cms_session', JSON.stringify(teacherSession))

    renderAppAt('/teacher/interaction')

    // /teacher/interaction is no longer a known route, so the catch-all
    // redirects it to /teacher/dashboard which renders DashboardRoute.
    await waitFor(() => {
      expect(screen.queryByText('当前账号')).not.toBeNull()
    })

    // Legacy 互动交流 heading must not appear.
    expect(screen.queryByRole('heading', { name: '互动交流' })).toBeNull()
  })
})
