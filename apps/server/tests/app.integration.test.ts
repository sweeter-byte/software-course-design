import { describe, expect, it } from 'vitest'

describe('server health endpoint', () => {
  it('returns a helpful landing page from /', async () => {
    const imported = await import('../src/app').catch(() => null)

    expect(imported).not.toBeNull()

    const app = await imported!.buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/',
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')
    expect(response.body).toContain('这是后端 API 服务')
    expect(response.body).toContain('/health')
  })

  it('returns service metadata from /health', async () => {
    const imported = await import('../src/app').catch(() => null)

    expect(imported).not.toBeNull()

    const app = await imported!.buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'ok',
      data: {
        status: 'healthy',
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })
})
