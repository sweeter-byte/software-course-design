import { describe, expect, it } from 'vitest'

async function buildOfficerApp() {
  const { buildApp } = await import('./_helpers/test-app')
  const app = await buildApp({
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

  it('marks enrolled flag on listing and detail for students', async () => {
    const { app, officerToken } = await buildOfficerApp()
    const studentToken = await registerStudent(app)

    const enrolledCourse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: { authorization: `Bearer ${officerToken}` },
      payload: {
        courseCode: 'SE-7001',
        courseName: '已加入课程',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '学生已加入。',
        location: '主楼 101',
        scheduleText: '周三 09:00-10:35',
        capacity: 60,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })
    const enrolledCourseId = enrolledCourse.json().data.course.id as string

    const otherCourse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: { authorization: `Bearer ${officerToken}` },
      payload: {
        courseCode: 'SE-7002',
        courseName: '未加入课程',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '学生未加入。',
        location: '主楼 102',
        scheduleText: '周四 09:00-10:35',
        capacity: 60,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })
    const otherCourseId = otherCourse.json().data.course.id as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${enrolledCourseId}/enroll`,
      headers: { authorization: `Bearer ${studentToken}` },
    })

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/courses',
      headers: { authorization: `Bearer ${studentToken}` },
    })

    expect(listResponse.statusCode).toBe(200)
    const items = listResponse.json().data.items as Array<{ id: string; enrolled: boolean }>
    const enrolledItem = items.find((item) => item.id === enrolledCourseId)
    const otherItem = items.find((item) => item.id === otherCourseId)
    expect(enrolledItem?.enrolled).toBe(true)
    expect(otherItem?.enrolled).toBe(false)

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/${enrolledCourseId}`,
      headers: { authorization: `Bearer ${studentToken}` },
    })

    expect(detailResponse.statusCode).toBe(200)
    expect(detailResponse.json().data.course.enrolled).toBe(true)
  })

  it('filters to only enrolled courses when enrolledOnly=true', async () => {
    const { app, officerToken } = await buildOfficerApp()
    const studentToken = await registerStudent(app)

    const enrolled = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: { authorization: `Bearer ${officerToken}` },
      payload: {
        courseCode: 'SE-7101',
        courseName: '已加入',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '加入后筛选。',
        location: '主楼 201',
        scheduleText: '周五 09:00-10:35',
        capacity: 60,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })
    const enrolledId = enrolled.json().data.course.id as string

    await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: { authorization: `Bearer ${officerToken}` },
      payload: {
        courseCode: 'SE-7102',
        courseName: '未加入',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '不应出现在结果中。',
        location: '主楼 202',
        scheduleText: '周一 09:00-10:35',
        capacity: 60,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })

    await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${enrolledId}/enroll`,
      headers: { authorization: `Bearer ${studentToken}` },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/courses?enrolledOnly=true',
      headers: { authorization: `Bearer ${studentToken}` },
    })

    expect(response.statusCode).toBe(200)
    const items = response.json().data.items as Array<{ id: string; enrolled: boolean }>
    expect(items.length).toBe(1)
    expect(items[0]?.id).toBe(enrolledId)
    expect(items[0]?.enrolled).toBe(true)
  })

  it('omits enrolled flag for non-student callers', async () => {
    const { app, officerToken } = await buildOfficerApp()

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: { authorization: `Bearer ${officerToken}` },
      payload: {
        courseCode: 'SE-7201',
        courseName: '教务员视角课程',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '教务员视角无 enrolled 字段。',
        location: '主楼 301',
        scheduleText: '周日 09:00-10:35',
        capacity: 60,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })
    const courseId = created.json().data.course.id as string

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/courses',
      headers: { authorization: `Bearer ${officerToken}` },
    })
    const found = (listResponse.json().data.items as Array<Record<string, unknown>>).find(
      (item) => item.id === courseId,
    )
    expect(found).toBeDefined()
    expect(found && 'enrolled' in found).toBe(false)
  })
})
