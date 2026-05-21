import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api } from './api'

describe('mobile api client', () => {
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

  it('builds course filters and feedback thread filters from optional values', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () =>
      new Response(JSON.stringify({ data: { items: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.listCourses('http://localhost:4100/api/v1', 'token', {
      keyword: '软件工程',
      teacherId: 'teacher-1',
      semester: '2026 春',
      status: 'active',
    })
    await api.listFeedbackThreads('http://localhost:4100/api/v1', 'token', {
      courseId: 'course-1',
      assignmentId: 'assignment-1',
      status: 'open',
      limit: 20,
      offset: 0,
    })

    const firstUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))
    expect(firstUrl.pathname).toBe('/api/v1/courses')
    expect(firstUrl.searchParams.get('keyword')).toBe('软件工程')
    expect(firstUrl.searchParams.get('teacherId')).toBe('teacher-1')
    expect(firstUrl.searchParams.get('semester')).toBe('2026 春')
    expect(firstUrl.searchParams.get('status')).toBe('active')

    const secondUrl = new URL(String(fetchMock.mock.calls[1]?.[0]))
    expect(secondUrl.pathname).toBe('/api/v1/feedbacks/threads')
    expect(secondUrl.searchParams.get('courseId')).toBe('course-1')
    expect(secondUrl.searchParams.get('assignmentId')).toBe('assignment-1')
    expect(secondUrl.searchParams.get('status')).toBe('open')
    expect(secondUrl.searchParams.get('limit')).toBe('20')
    expect(secondUrl.searchParams.get('offset')).toBe('0')
  })

  it('surfaces backend error code and validation details on ApiError', async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () =>
      new Response(
        JSON.stringify({
          success: false,
          message: 'validation_failed',
          error: {
            code: 'VALIDATION_ERROR',
            details: [
              { path: ['phone'], message: '手机号格式不正确' },
              { path: ['password'], message: '至少 8 位', code: 'too_small' },
            ],
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    try {
      await api.login('http://localhost:4100/api/v1', '13800000000', 'pwd')
      throw new Error('expected ApiError')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      const apiError = error as ApiError
      expect(apiError.message).toBe('validation_failed')
      expect(apiError.statusCode).toBe(400)
      expect(apiError.code).toBe('VALIDATION_ERROR')
      expect(apiError.details).toEqual([
        { path: ['phone'], message: '手机号格式不正确' },
        { path: ['password'], message: '至少 8 位', code: 'too_small' },
      ])
    }
  })
})
