import { describe, expect, it } from 'vitest'

async function loginOfficer() {
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

  const loginPayload = loginResponse.json()

  return {
    app,
    accessToken: loginPayload.data.accessToken as string,
  }
}

describe('course management', () => {
  it('allows an officer to create a course for a teacher', async () => {
    const { app, accessToken } = await loginOfficer()

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        courseCode: 'SE-4101',
        courseName: '软件工程实践',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '面向课程作业、讨论与反馈的实践课。',
        location: '明故宫校区 C301',
        scheduleText: '周三 08:00-09:35',
        capacity: 120,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'course_created',
      data: {
        course: {
          courseCode: 'SE-4101',
          courseName: '软件工程实践',
          teacherId: 'teacher-demo-001',
          semester: '2026 春',
        },
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('lists created courses with keyword filtering for authenticated users', async () => {
    const { app, accessToken } = await loginOfficer()

    await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        courseCode: 'SE-4102',
        courseName: '课程互动系统设计',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '面向课程互动管理系统的架构与设计实践。',
        location: '将军路校区 A208',
        scheduleText: '周五 10:00-11:35',
        capacity: 80,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/courses?keyword=互动',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'ok',
      data: {
        items: [
          expect.objectContaining({
            courseCode: 'SE-4102',
            courseName: '课程互动系统设计',
            teacherId: 'teacher-demo-001',
          }),
        ],
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('returns a course detail by id for authenticated users', async () => {
    const { app, accessToken } = await loginOfficer()

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        courseCode: 'SE-4103',
        courseName: '课程详情查看',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '用于详情查看的课程。',
        location: '明故宫校区 C302',
        scheduleText: '周一 14:00-15:35',
        capacity: 50,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })

    const courseId = courseResponse.json().data.course.id as string

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/${courseId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        course: {
          id: courseId,
          courseCode: 'SE-4103',
          courseName: '课程详情查看',
          teacherId: 'teacher-demo-001',
          location: '明故宫校区 C302',
        },
      },
    })
  })

  it('filters courses by teacher, semester, location, and status', async () => {
    const { app, accessToken } = await loginOfficer()

    await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        courseCode: 'SE-4104',
        courseName: '多条件查询课程',
        teacherId: 'teacher-demo-001',
        semester: '2026 秋',
        description: '用于多条件查询。',
        location: '将军路校区 B101',
        scheduleText: '周二 08:00-09:35',
        capacity: 70,
        startDate: '2026-09-01',
        endDate: '2027-01-10',
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/courses?teacherId=teacher-demo-001&semester=2026%20%E7%A7%8B&location=%E5%B0%86%E5%86%9B%E8%B7%AF&status=not_started',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.items).toEqual([
      expect.objectContaining({
        courseCode: 'SE-4104',
        courseName: '多条件查询课程',
        semester: '2026 秋',
        location: '将军路校区 B101',
        status: 'not_started',
      }),
    ])
  })

  it('allows an officer to update an existing course', async () => {
    const { app, accessToken } = await loginOfficer()

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        courseCode: 'SE-4105',
        courseName: '待修改课程',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '修改前描述。',
        location: '明故宫校区 C303',
        scheduleText: '周三 08:00-09:35',
        capacity: 60,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })

    const courseId = courseResponse.json().data.course.id as string

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/courses/${courseId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        courseName: '已修改课程',
        description: '修改后描述。',
        location: '将军路校区 B201',
        scheduleText: '周四 10:00-11:35',
        capacity: 88,
        status: 'active',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'course_updated',
      data: {
        course: {
          id: courseId,
          courseCode: 'SE-4105',
          courseName: '已修改课程',
          description: '修改后描述。',
          location: '将军路校区 B201',
          scheduleText: '周四 10:00-11:35',
          capacity: 88,
          status: 'active',
        },
      },
    })
  })

  it('allows an officer to delete a course', async () => {
    const { app, accessToken } = await loginOfficer()

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        courseCode: 'SE-4106',
        courseName: '待删除课程',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '用于删除。',
        location: '明故宫校区 C304',
        scheduleText: '周五 08:00-09:35',
        capacity: 40,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })

    const courseId = courseResponse.json().data.course.id as string

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/courses/${courseId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'course_deleted',
      data: {
        course: {
          id: courseId,
        },
      },
    })

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/${courseId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })

    expect(detailResponse.statusCode).toBe(404)
  })
})
