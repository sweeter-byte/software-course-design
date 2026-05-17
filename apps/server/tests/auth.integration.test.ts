import { describe, expect, it } from 'vitest'

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
