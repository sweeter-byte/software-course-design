import { describe, expect, it } from 'vitest'

async function buildOfficerApp() {
  const { buildApp } = await import('../src/app')
  const app = await buildApp({
    databasePath: ':memory:',
    env: 'test',
    seedDemoData: true,
  })

  const loginResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      phone: '13700137000',
      password: 'Officer123!',
    },
  })

  return {
    app,
    officerToken: loginResponse.json().data.accessToken as string,
  }
}

async function registerStudent(app: Awaited<ReturnType<typeof buildOfficerApp>>['app']) {
  const verificationResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verification-code',
    payload: {
      phone: '13800138010',
      purpose: 'register',
    },
  })

  const verificationPayload = verificationResponse.json()

  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/student',
    payload: {
      phone: '13800138010',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      username: 'course_joiner',
      realName: '选课学生',
      studentId: '162350110',
      verificationCode: verificationPayload.data.previewCode,
    },
  })

  const loginResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      phone: '13800138010',
      password: 'Password123!',
    },
  })

  return loginResponse.json().data.accessToken as string
}

describe('course enrollments', () => {
  it('allows a student to join a created course', async () => {
    const { app, officerToken } = await buildOfficerApp()
    const studentToken = await registerStudent(app)

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
      payload: {
        courseCode: 'SE-4201',
        courseName: '教学互动平台开发',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '课程互动平台端到端开发实践。',
        location: '天目湖校区 D105',
        scheduleText: '周二 14:00-15:35',
        capacity: 60,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })

    const courseId = courseResponse.json().data.course.id as string

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/enroll`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'course_enrolled',
      data: {
        enrollment: {
          courseId,
          status: 'enrolled',
        },
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })
})
