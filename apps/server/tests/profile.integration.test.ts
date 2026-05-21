import { describe, expect, it } from 'vitest'

async function buildProfileApp() {
  const { buildApp } = await import('./_helpers/test-app')
  const app = await buildApp({
    env: 'test',
    seedDemoData: true,
  })

  return app
}

async function registerAndLoginStudent(app: Awaited<ReturnType<typeof buildProfileApp>>, suffix: string) {
  const phone = `13800139${suffix}`
  const verificationResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verification-code',
    payload: {
      phone,
      purpose: 'register',
    },
  })

  const verificationCode = verificationResponse.json().data.previewCode as string

  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/student',
    payload: {
      phone,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      username: `profile_student_${suffix}`,
      realName: '资料学生',
      studentId: `162359${suffix}`,
      verificationCode,
    },
  })

  const loginResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      phone,
      password: 'Password123!',
    },
  })

  return {
    phone,
    accessToken: loginResponse.json().data.accessToken as string,
  }
}

describe('profile and account management', () => {
  it('stores optional student profile fields during registration', async () => {
    const app = await buildProfileApp()
    const phone = '13800139808'

    const verificationResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verification-code',
      payload: {
        phone,
        purpose: 'register',
      },
    })

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register/student',
      payload: {
        phone,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        username: 'profile_student_with_basic_info',
        realName: '资料完整学生',
        studentId: '162359008',
        verificationCode: verificationResponse.json().data.previewCode,
        email: 'student.basic@example.com',
        gender: '女',
        college: '计算机科学与技术学院',
        major: '软件工程',
        className: '1623002',
      },
    })

    expect(registerResponse.statusCode).toBe(201)

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        phone,
        password: 'Password123!',
      },
    })

    const profileResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${loginResponse.json().data.accessToken}`,
      },
    })

    expect(profileResponse.statusCode).toBe(200)
    expect(profileResponse.json()).toMatchObject({
      success: true,
      data: {
        user: {
          username: 'profile_student_with_basic_info',
          realName: '资料完整学生',
          email: 'student.basic@example.com',
          gender: '女',
          college: '计算机科学与技术学院',
          major: '软件工程',
          className: '1623002',
        },
      },
    })
  })

  it('returns and updates the current user profile', async () => {
    const app = await buildProfileApp()
    const { accessToken } = await registerAndLoginStudent(app, '001')

    const readResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })

    expect(readResponse.statusCode).toBe(200)
    expect(readResponse.json()).toMatchObject({
      success: true,
      data: {
        user: {
          role: 'student',
          username: 'profile_student_001',
          realName: '资料学生',
        },
      },
    })

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        username: 'profile_updated',
        realName: '更新学生',
        email: 'updated@example.com',
        gender: '男',
        college: '计算机科学与技术学院',
        major: '软件工程',
        className: '1623001',
      },
    })

    expect(updateResponse.statusCode).toBe(200)
    expect(updateResponse.json()).toMatchObject({
      success: true,
      message: 'profile_updated',
      data: {
        user: {
          username: 'profile_updated',
          realName: '更新学生',
          email: 'updated@example.com',
          college: '计算机科学与技术学院',
          major: '软件工程',
          className: '1623001',
        },
      },
    })
  })

  it('rejects unsupported gender values in profile updates', async () => {
    const app = await buildProfileApp()
    const { accessToken } = await registerAndLoginStudent(app, '009')

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        gender: '其他',
      },
    })

    expect(updateResponse.statusCode).toBe(400)
  })

  it('changes password when the old password is valid', async () => {
    const app = await buildProfileApp()
    const { phone, accessToken } = await registerAndLoginStudent(app, '002')

    const changeResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password/change',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        oldPassword: 'Password123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      },
    })

    expect(changeResponse.statusCode).toBe(200)
    expect(changeResponse.json()).toMatchObject({
      success: true,
      message: 'password_changed',
    })

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        phone,
        password: 'NewPassword123!',
      },
    })

    expect(loginResponse.statusCode).toBe(200)
    expect(loginResponse.json()).toMatchObject({
      success: true,
      message: 'login_success',
    })
  })

  it('resets password with a reset password verification code', async () => {
    const app = await buildProfileApp()
    const { phone } = await registerAndLoginStudent(app, '003')

    const verificationResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verification-code',
      payload: {
        phone,
        purpose: 'reset_password',
      },
    })

    const resetResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password/forgot',
      payload: {
        phone,
        verificationCode: verificationResponse.json().data.previewCode,
        newPassword: 'ResetPassword123!',
        confirmPassword: 'ResetPassword123!',
      },
    })

    expect(resetResponse.statusCode).toBe(200)
    expect(resetResponse.json()).toMatchObject({
      success: true,
      message: 'password_reset',
    })

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        phone,
        password: 'ResetPassword123!',
      },
    })

    expect(loginResponse.statusCode).toBe(200)
  })

  it('changes phone only after both old and new phone verification codes pass', async () => {
    const app = await buildProfileApp()
    const { phone, accessToken } = await registerAndLoginStudent(app, '006')
    const newPhone = '13800139806'

    const oldPhoneVerificationResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verification-code',
      payload: {
        phone,
        purpose: 'change_phone',
      },
    })
    const newPhoneVerificationResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verification-code',
      payload: {
        phone: newPhone,
        purpose: 'change_phone',
      },
    })

    const changePhoneResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/phone/change',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        oldPhone: phone,
        oldVerificationCode: oldPhoneVerificationResponse.json().data.previewCode,
        newPhone,
        newVerificationCode: newPhoneVerificationResponse.json().data.previewCode,
      },
    })

    expect(changePhoneResponse.statusCode).toBe(200)
    expect(changePhoneResponse.json()).toMatchObject({
      success: true,
      message: 'phone_changed',
      data: {
        user: {
          phone: newPhone,
        },
      },
    })

    const oldPhoneLoginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        phone,
        password: 'Password123!',
      },
    })
    expect(oldPhoneLoginResponse.statusCode).toBe(401)

    const newPhoneLoginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        phone: newPhone,
        password: 'Password123!',
      },
    })
    expect(newPhoneLoginResponse.statusCode).toBe(200)
  })

  it('cancels the current account and blocks future login', async () => {
    const app = await buildProfileApp()
    const { phone, accessToken } = await registerAndLoginStudent(app, '004')

    const cancelResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/cancel-account',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })

    expect(cancelResponse.statusCode).toBe(200)
    expect(cancelResponse.json()).toMatchObject({
      success: true,
      message: 'account_cancelled',
      data: {
        user: {
          status: 'cancelled',
        },
      },
    })

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        phone,
        password: 'Password123!',
      },
    })

    expect(loginResponse.statusCode).toBe(401)
    expect(loginResponse.json()).toMatchObject({
      success: false,
      message: 'invalid_credentials',
    })
  })

  it('allows a cancelled student to register again with the same phone and student number', async () => {
    const app = await buildProfileApp()
    const { phone, accessToken } = await registerAndLoginStudent(app, '007')

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/cancel-account',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })

    const verificationResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verification-code',
      payload: {
        phone,
        purpose: 'register',
      },
    })

    const registerAgainResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register/student',
      payload: {
        phone,
        password: 'ReRegister123!',
        confirmPassword: 'ReRegister123!',
        username: 'profile_student_reregistered',
        realName: '重新注册学生',
        studentId: '162359007',
        verificationCode: verificationResponse.json().data.previewCode,
      },
    })

    expect(registerAgainResponse.statusCode).toBe(201)
    expect(registerAgainResponse.json()).toMatchObject({
      success: true,
      message: 'student_registered',
      data: {
        user: {
          role: 'student',
          phone,
          studentNo: '162359007',
          username: 'profile_student_reregistered',
        },
      },
    })

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        phone,
        password: 'ReRegister123!',
      },
    })

    expect(loginResponse.statusCode).toBe(200)
  })

  it('logs out the current session', async () => {
    const app = await buildProfileApp()
    const { accessToken } = await registerAndLoginStudent(app, '005')

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'logout_success',
    })
  })
})
