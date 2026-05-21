import { describe, expect, it } from 'vitest'

async function buildUserAdminApp() {
  const { buildApp } = await import('./_helpers/test-app')
  return buildApp({
    env: 'test',
    seedDemoData: true,
  })
}

async function loginOfficer(app: Awaited<ReturnType<typeof buildUserAdminApp>>) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      phone: '13700137000',
      password: 'Officer123!',
    },
  })

  expect(response.statusCode).toBe(200)
  return {
    accessToken: response.json().data.accessToken as string,
    userId: response.json().data.user.id as string,
  }
}

async function loginTeacher(app: Awaited<ReturnType<typeof buildUserAdminApp>>) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      phone: '13900139000',
      password: 'Teacher123!',
    },
  })

  expect(response.statusCode).toBe(200)
  return {
    accessToken: response.json().data.accessToken as string,
    userId: response.json().data.user.id as string,
  }
}

async function registerStudent(
  app: Awaited<ReturnType<typeof buildUserAdminApp>>,
  suffix: string,
) {
  const phone = `13811138${suffix}`
  const verificationResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verification-code',
    payload: { phone, purpose: 'register' },
  })

  const verificationCode = verificationResponse.json().data.previewCode as string

  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/student',
    payload: {
      phone,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      username: `useradmin_student_${suffix}`,
      realName: '用户管理学生',
      studentId: `162400${suffix}`,
      verificationCode,
    },
  })

  return { phone, password: 'Password123!' }
}

describe('officer user administration', () => {
  it('lists all users for the officer and respects the role filter', async () => {
    const app = await buildUserAdminApp()
    const { accessToken } = await loginOfficer(app)
    await registerStudent(app, '001')

    const allResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(allResponse.statusCode).toBe(200)
    const users = allResponse.json().data.users as { role: string }[]
    const roles = users.map((user) => user.role).sort()
    expect(roles).toEqual(['officer', 'student', 'teacher'])

    const studentsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/users?role=student',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(studentsResponse.statusCode).toBe(200)
    const students = studentsResponse.json().data.users as { role: string }[]
    expect(students).toHaveLength(1)
    expect(students[0]?.role).toBe('student')
  })

  it('rejects non-officers from listing users', async () => {
    const app = await buildUserAdminApp()
    const { accessToken } = await loginTeacher(app)

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(response.statusCode).toBe(403)
    expect(response.json().error.code).toBe('FORBIDDEN')
  })

  it('disables an account and blocks subsequent login with ACCOUNT_DISABLED', async () => {
    const app = await buildUserAdminApp()
    const { accessToken } = await loginOfficer(app)
    const { phone, password } = await registerStudent(app, '002')

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/users?role=student',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    const studentId = (list.json().data.users as { id: string }[])[0]!.id

    const disableResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${studentId}/status`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { disabled: true },
    })

    expect(disableResponse.statusCode).toBe(200)
    expect(disableResponse.json()).toMatchObject({
      success: true,
      message: 'user_disabled',
      data: { user: { id: studentId, status: 'disabled' } },
    })

    const blockedLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { phone, password },
    })

    expect(blockedLogin.statusCode).toBe(403)
    expect(blockedLogin.json().error.code).toBe('ACCOUNT_DISABLED')

    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { phone, password: 'WrongPassword123!' },
    })

    expect(wrongPassword.statusCode).toBe(401)
    expect(wrongPassword.json().error.code).toBe('INVALID_CREDENTIALS')

    const enableResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${studentId}/status`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { disabled: false },
    })

    expect(enableResponse.statusCode).toBe(200)
    expect(enableResponse.json()).toMatchObject({
      success: true,
      message: 'user_enabled',
      data: { user: { id: studentId, status: 'active' } },
    })

    const reopenedLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { phone, password },
    })

    expect(reopenedLogin.statusCode).toBe(200)
  })

  it('refuses to let an officer disable themselves', async () => {
    const app = await buildUserAdminApp()
    const { accessToken, userId } = await loginOfficer(app)

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${userId}/status`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { disabled: true },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('CANNOT_MODIFY_SELF')
  })
})
