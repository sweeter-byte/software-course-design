import { describe, expect, it } from 'vitest'

function createCloudBaseVerificationStub() {
  const requests: Array<{
    url: string
    authorization: string | undefined
    body: Record<string, unknown>
  }> = []
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const pathname = new URL(url).pathname
    const headers = new Headers(init?.headers)
    const body = init?.body ? JSON.parse(String(init.body)) : {}

    requests.push({
      url: pathname,
      authorization: headers.get('authorization') ?? undefined,
      body,
    })

    if (pathname === '/auth/v1/verification') {
      return new Response(
        JSON.stringify({
          verification_id: 'cloudbase-verification-1',
          expires_in: 600,
          is_user: false,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    if (pathname === '/auth/v1/verification/verify') {
      return new Response(
        JSON.stringify({
          verification_token: 'cloudbase-token-1',
          expires_in: 600,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    return new Response(
      JSON.stringify({
        error: 'not_found',
        error_description: 'not found',
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  return {
    baseUrl: 'https://course-env.api.tcloudbasegateway.com',
    requests,
    restore: () => {
      globalThis.fetch = originalFetch
    },
  }
}

function createCloudBaseInvalidCodeStub() {
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const pathname = new URL(url).pathname

    if (pathname === '/auth/v1/verification') {
      return new Response(
        JSON.stringify({
          verification_id: 'cloudbase-verification-1',
          expires_in: 600,
          is_user: false,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    return new Response(
      JSON.stringify({
        error: 'invalid_argument',
        error_description: 'verification code does not match the id',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  return {
    baseUrl: 'https://course-env.api.tcloudbasegateway.com',
    restore: () => {
      globalThis.fetch = originalFetch
    },
  }
}

function createCloudBaseVerificationNetworkFailureStub() {
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const pathname = new URL(url).pathname

    if (pathname === '/auth/v1/verification') {
      return new Response(
        JSON.stringify({
          verification_id: 'cloudbase-verification-network-failure',
          expires_in: 600,
          is_user: false,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    throw new TypeError('fetch failed')
  }

  return {
    baseUrl: 'https://course-env.api.tcloudbasegateway.com',
    restore: () => {
      globalThis.fetch = originalFetch
    },
  }
}

describe('auth verification', () => {
  it('issues a development preview verification code for student registration', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp({
      databasePath: ':memory:',
      env: 'test',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verification-code',
      payload: {
        phone: '13800138000',
        purpose: 'register',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'verification_code_sent',
      data: {
        phone: '13800138000',
        purpose: 'register',
        previewCode: expect.any(String),
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('registers a student after a valid verification code is issued', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp({
      databasePath: ':memory:',
      env: 'test',
    })

    const verificationResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verification-code',
      payload: {
        phone: '13800138001',
        purpose: 'register',
      },
    })

    const verificationPayload = verificationResponse.json()

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register/student',
      payload: {
        phone: '13800138001',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        username: 'aurora_student',
        realName: '测试学生',
        studentId: '162350107',
        verificationCode: verificationPayload.data.previewCode,
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'student_registered',
      data: {
        user: {
          role: 'student',
          phone: '13800138001',
          studentNo: '162350107',
          username: 'aurora_student',
        },
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('uses CloudBase verification ids to validate registration codes', async () => {
    const cloudBase = createCloudBaseVerificationStub()

    try {
      const { buildApp } = await import('../src/app')
      const app = await buildApp({
        databasePath: ':memory:',
        env: 'test',
        verificationProvider: 'cloudbase',
        cloudBaseApiBaseUrl: cloudBase.baseUrl,
        cloudBaseApiToken: 'test-cloudbase-api-token',
      })

      const verificationResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verification-code',
        payload: {
          phone: '13800138088',
          purpose: 'register',
        },
      })

      expect(verificationResponse.statusCode).toBe(201)
      expect(verificationResponse.json().data).toMatchObject({
        phone: '13800138088',
        purpose: 'register',
      })
      expect(verificationResponse.json().data).not.toHaveProperty('previewCode')

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register/student',
        payload: {
          phone: '13800138088',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          username: 'cloudbase_student',
          realName: '云开发学生',
          studentId: '162350188',
          verificationCode: '654321',
        },
      })

      expect(response.statusCode).toBe(201)
      expect(response.json()).toMatchObject({
        success: true,
        message: 'student_registered',
        data: {
          user: {
            role: 'student',
            phone: '13800138088',
            studentNo: '162350188',
            username: 'cloudbase_student',
          },
        },
      })

      expect(cloudBase.requests).toEqual([
        {
          url: '/auth/v1/verification',
          authorization: 'Bearer test-cloudbase-api-token',
          body: {
            phone_number: '+86 13800138088',
            target: 'ANY',
          },
        },
        {
          url: '/auth/v1/verification/verify',
          authorization: 'Bearer test-cloudbase-api-token',
          body: {
            verification_id: 'cloudbase-verification-1',
            verification_code: '654321',
          },
        },
      ])

      await app.close()
    } finally {
      cloudBase.restore()
    }
  })

  it('maps CloudBase invalid verification errors to existing verification code errors', async () => {
    const cloudBase = createCloudBaseInvalidCodeStub()

    try {
      const { buildApp } = await import('../src/app')
      const app = await buildApp({
        databasePath: ':memory:',
        env: 'test',
        verificationProvider: 'cloudbase',
        cloudBaseApiBaseUrl: cloudBase.baseUrl,
        cloudBaseApiToken: 'test-cloudbase-api-token',
      })

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verification-code',
        payload: {
          phone: '13800138089',
          purpose: 'register',
        },
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register/student',
        payload: {
          phone: '13800138089',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          username: 'cloudbase_invalid_code',
          realName: '云开发错误码',
          studentId: '162350189',
          verificationCode: '000000',
        },
      })

      expect(response.statusCode).toBe(400)
      expect(response.json()).toMatchObject({
        success: false,
        message: 'verification_code_invalid',
        error: {
          code: 'VERIFICATION_CODE_INVALID',
        },
      })

      await app.close()
    } finally {
      cloudBase.restore()
    }
  })

  it('maps CloudBase verification network failures to a verification service error', async () => {
    const cloudBase = createCloudBaseVerificationNetworkFailureStub()

    try {
      const { buildApp } = await import('../src/app')
      const app = await buildApp({
        databasePath: ':memory:',
        env: 'test',
        verificationProvider: 'cloudbase',
        cloudBaseApiBaseUrl: cloudBase.baseUrl,
        cloudBaseApiToken: 'test-cloudbase-api-token',
      })

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verification-code',
        payload: {
          phone: '13800138090',
          purpose: 'register',
        },
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register/student',
        payload: {
          phone: '13800138090',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          username: 'cloudbase_network_failure',
          realName: '云开发网络错误',
          studentId: '162350190',
          verificationCode: '654321',
        },
      })

      expect(response.statusCode).toBe(502)
      expect(response.json()).toMatchObject({
        success: false,
        message: 'cloudbase_verification_unavailable',
        error: {
          code: 'CLOUDBASE_VERIFICATION_UNAVAILABLE',
        },
      })

      await app.close()
    } finally {
      cloudBase.restore()
    }
  })

  it('logs a registered student in with phone and password', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp({
      databasePath: ':memory:',
      env: 'test',
    })

    const verificationResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verification-code',
      payload: {
        phone: '13800138002',
        purpose: 'register',
      },
    })

    const verificationPayload = verificationResponse.json()

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register/student',
      payload: {
        phone: '13800138002',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        username: 'nebula_student',
        realName: '登录学生',
        studentId: '162350108',
        verificationCode: verificationPayload.data.previewCode,
      },
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        phone: '13800138002',
        password: 'Password123!',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'login_success',
      data: {
        accessToken: expect.any(String),
        user: {
          role: 'student',
          phone: '13800138002',
          username: 'nebula_student',
        },
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('logs seeded officer accounts in for management flows', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp({
      databasePath: ':memory:',
      env: 'test',
      seedDemoData: true,
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        phone: '13700137000',
        password: 'Officer123!',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'login_success',
      data: {
        user: {
          role: 'officer',
          phone: '13700137000',
        },
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })
})
