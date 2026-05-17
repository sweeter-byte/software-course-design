import { describe, expect, it } from 'vitest'

describe('dashboard summaries', () => {
  it('returns an officer dashboard summary with core counters', async () => {
    const { buildApp } = await import('../src/app')
    const app = await buildApp({
      databasePath: ':memory:',
      env: 'test',
      seedDemoData: true,
    })

    const officerLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        phone: '13700137000',
        password: 'Officer123!',
      },
    })

    const accessToken = officerLogin.json().data.accessToken as string

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        courseCode: 'SE-4601',
        courseName: '教学看板总览',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '教学看板总览示例课程。',
        location: '明故宫校区 A301',
        scheduleText: '周一 14:00-15:35',
        capacity: 60,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })
    const courseId = courseResponse.json().data.course.id as string

    const codeResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verification-code',
      payload: {
        phone: '13800138210',
        purpose: 'register',
      },
    })
    const verificationCode = codeResponse.json().data.previewCode as string

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register/student',
      payload: {
        phone: '13800138210',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        username: 'dashboard_student',
        realName: '看板学生',
        studentId: '162350210',
        verificationCode,
      },
    })

    const studentLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        phone: '13800138210',
        password: 'Password123!',
      },
    })
    const studentToken = studentLogin.json().data.accessToken as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/enroll`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/course-feedbacks`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        dimension: 'teaching',
        content: '希望课程案例继续增加。',
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/officer',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'ok',
      data: {
        summary: {
          totalCourses: 1,
          totalTeachers: 1,
          totalStudents: 1,
          openFeedbacks: 0,
          courseFeedbacks: 1,
        },
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })
})
