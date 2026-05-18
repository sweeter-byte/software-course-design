import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from './api'

describe('api client request headers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not send a json content type for requests without a body', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () =>
      new Response(JSON.stringify({ data: { enrollment: { id: 'enrollment-1' } } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.enrollCourse('http://localhost:4100/api/v1', 'token', 'course-1')

    const init = fetchMock.mock.calls[0]?.[1]
    expect(init).toBeDefined()
    expect(init?.body).toBeUndefined()
    expect(init?.headers).not.toHaveProperty('Content-Type')
  })

  it('builds the feedback thread overview query from optional filters', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () =>
      new Response(JSON.stringify({ data: { items: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.listFeedbackThreads('http://localhost:4100/api/v1', 'token', {
      courseId: 'course-1',
      assignmentId: 'assignment-1',
      status: 'open',
    })

    const [input, init] = fetchMock.mock.calls[0] ?? []
    const url = new URL(String(input))
    expect(url.pathname).toBe('/api/v1/feedbacks/threads')
    expect(url.searchParams.get('courseId')).toBe('course-1')
    expect(url.searchParams.get('assignmentId')).toBe('assignment-1')
    expect(url.searchParams.get('status')).toBe('open')
    expect(init?.headers).toHaveProperty('Authorization', 'Bearer token')
  })
})
