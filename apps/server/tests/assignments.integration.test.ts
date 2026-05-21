import { describe, expect, it } from 'vitest'

import { relativeIsoDate } from './test-dates'

async function buildManagementApp() {
  const { buildApp } = await import('./_helpers/test-app')
  const app = await buildApp({
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

  const teacherLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      phone: '13900139000',
      password: 'Teacher123!',
    },
  })

  return {
    app,
    officerToken: officerLogin.json().data.accessToken as string,
    teacherToken: teacherLogin.json().data.accessToken as string,
  }
}

async function registerAssignmentStudent(app: Awaited<ReturnType<typeof buildManagementApp>>['app']) {
  const verificationResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verification-code',
    payload: {
      phone: '13800138041',
      purpose: 'register',
    },
  })

  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/student',
    payload: {
      phone: '13800138041',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      username: 'assignment_cancel_student',
      realName: '取消作业学生',
      studentId: '162350141',
      verificationCode: verificationResponse.json().data.previewCode,
    },
  })

  const studentLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      phone: '13800138041',
      password: 'Password123!',
    },
  })

  return studentLogin.json().data.accessToken as string
}

describe('assignment publishing', () => {
  it('allows a teacher to publish an assignment to their own course', async () => {
    const { app, officerToken, teacherToken } = await buildManagementApp()

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
      payload: {
        courseCode: 'SE-4301',
        courseName: '课程交互工程',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '课程交互工程实战。',
        location: '明故宫校区 B202',
        scheduleText: '周一 10:00-11:35',
        capacity: 90,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })

    const courseId = courseResponse.json().data.course.id as string

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/assignments`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        title: '第一次课程设计作业',
        description: '完成课程互动管理系统需求抽取。',
        requirement: '提交需求摘要、角色表和核心流程图。',
        startAt: relativeIsoDate(-7, 8),
        dueAt: relativeIsoDate(30),
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'assignment_created',
      data: {
        assignment: {
          title: '第一次课程设计作业',
          courseId,
          teacherId: 'teacher-demo-001',
          status: 'published',
        },
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('lists course assignments for authenticated course participants', async () => {
    const { app, officerToken, teacherToken } = await buildManagementApp()

    const verificationResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verification-code',
      payload: {
        phone: '13800138040',
        purpose: 'register',
      },
    })

    const verificationPayload = verificationResponse.json()

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register/student',
      payload: {
        phone: '13800138040',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        username: 'assignment_viewer',
        realName: '查看学生',
        studentId: '162350140',
        verificationCode: verificationPayload.data.previewCode,
      },
    })

    const studentLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        phone: '13800138040',
        password: 'Password123!',
      },
    })

    const studentToken = studentLogin.json().data.accessToken as string

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
      payload: {
        courseCode: 'SE-4302',
        courseName: '互动工程作业管理',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '互动工程作业管理实践。',
        location: '明故宫校区 B205',
        scheduleText: '周三 14:00-15:35',
        capacity: 90,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })

    const courseId = courseResponse.json().data.course.id as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/enroll`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    const assignmentResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/assignments`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        title: '课堂互动用例作业',
        description: '完成课堂互动相关用例图。',
        requirement: '提交参与者、用例和活动图。',
        startAt: relativeIsoDate(-7, 8),
        dueAt: relativeIsoDate(30),
      },
    })
    const assignmentId = assignmentResponse.json().data.assignment.id as string

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/${courseId}/assignments`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'ok',
      data: {
        items: [
          expect.objectContaining({
            title: '课堂互动用例作业',
            courseId,
            teacherId: 'teacher-demo-001',
            status: 'published',
            hasSubmitted: false,
            submissionId: null,
          }),
        ],
      },
      meta: {
        requestId: expect.any(String),
      },
    })

    const submissionResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${assignmentId}/submissions`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        content: '已提交课堂互动用例作业。',
      },
    })
    const submissionId = submissionResponse.json().data.submission.id as string

    const submittedListResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/courses/${courseId}/assignments`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    expect(submittedListResponse.statusCode).toBe(200)
    expect(submittedListResponse.json()).toMatchObject({
      data: {
        items: [
          expect.objectContaining({
            id: assignmentId,
            hasSubmitted: true,
            submissionId,
            mySubmission: expect.objectContaining({
              id: submissionId,
              assignmentId,
              content: '已提交课堂互动用例作业。',
              status: 'submitted',
              score: null,
              teacherFeedback: null,
            }),
          }),
        ],
      },
    })
  })

  it('allows the course teacher to update an assignment before cancellation', async () => {
    const { app, officerToken, teacherToken } = await buildManagementApp()

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
      payload: {
        courseCode: 'SE-4303',
        courseName: '作业修改课程',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '作业修改实践。',
        location: '明故宫校区 B207',
        scheduleText: '周四 14:00-15:35',
        capacity: 90,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })
    const courseId = courseResponse.json().data.course.id as string

    const assignmentResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/assignments`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        title: '待修改作业',
        description: '修改前描述。',
        requirement: '修改前要求。',
        startAt: relativeIsoDate(-7, 8),
        dueAt: relativeIsoDate(30),
      },
    })
    const assignmentId = assignmentResponse.json().data.assignment.id as string
    const updatedDueAt = relativeIsoDate(45)

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/assignments/${assignmentId}`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        title: '已修改作业',
        description: '修改后描述。',
        requirement: '修改后要求。',
        dueAt: updatedDueAt,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'assignment_updated',
      data: {
        assignment: {
          id: assignmentId,
          title: '已修改作业',
          description: '修改后描述。',
          requirement: '修改后要求。',
          dueAt: updatedDueAt,
          status: 'published',
        },
      },
    })
  })

  it('rejects assignment updates after the deadline or after a student submission exists', async () => {
    const { app, officerToken, teacherToken } = await buildManagementApp()
    const studentToken = await registerAssignmentStudent(app)

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
      payload: {
        courseCode: 'SE-4306',
        courseName: '作业修改限制课程',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '作业修改限制实践。',
        location: '明故宫校区 B211',
        scheduleText: '周二 14:00-15:35',
        capacity: 90,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })
    const courseId = courseResponse.json().data.course.id as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/enroll`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    const submittedAssignmentResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/assignments`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        title: '已有提交作业',
        description: '提交后禁止修改。',
        requirement: '提交一段说明。',
        startAt: relativeIsoDate(-7, 8),
        dueAt: relativeIsoDate(30),
      },
    })
    const submittedAssignmentId = submittedAssignmentResponse.json().data.assignment.id as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${submittedAssignmentId}/submissions`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        content: '学生已经提交答案。',
      },
    })

    const submittedUpdateResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/assignments/${submittedAssignmentId}`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        title: '不应允许修改',
      },
    })

    expect(submittedUpdateResponse.statusCode).toBe(409)
    expect(submittedUpdateResponse.json()).toMatchObject({
      success: false,
      message: 'assignment_already_submitted',
    })

    const expiredAssignmentResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/assignments`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        title: '已截止作业',
        description: '截止后禁止修改。',
        requirement: '提交一段说明。',
        startAt: relativeIsoDate(-30, 8),
        dueAt: relativeIsoDate(-1),
      },
    })
    const expiredAssignmentId = expiredAssignmentResponse.json().data.assignment.id as string

    const expiredUpdateResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/assignments/${expiredAssignmentId}`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        title: '不应允许修改',
      },
    })

    expect(expiredUpdateResponse.statusCode).toBe(409)
    expect(expiredUpdateResponse.json()).toMatchObject({
      success: false,
      message: 'assignment_deadline_passed',
    })
  })

  it('allows the course teacher to cancel an assignment with a reason and clear submissions', async () => {
    const { app, officerToken, teacherToken } = await buildManagementApp()
    const studentToken = await registerAssignmentStudent(app)

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
      payload: {
        courseCode: 'SE-4304',
        courseName: '作业取消课程',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '作业取消实践。',
        location: '明故宫校区 B209',
        scheduleText: '周五 14:00-15:35',
        capacity: 90,
        startDate: '2026-03-01',
        endDate: '2026-07-01',
      },
    })
    const courseId = courseResponse.json().data.course.id as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/enroll`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    const assignmentResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/assignments`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        title: '待取消作业',
        description: '取消前描述。',
        requirement: '提交说明。',
        startAt: relativeIsoDate(-7, 8),
        dueAt: relativeIsoDate(30),
      },
    })
    const assignmentId = assignmentResponse.json().data.assignment.id as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${assignmentId}/submissions`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        content: '取消前已提交的答案。',
      },
    })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${assignmentId}/cancel`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        reason: '教学计划调整，取消本次作业。',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'assignment_cancelled',
      data: {
        assignment: {
          id: assignmentId,
          status: 'cancelled',
          cancelReason: '教学计划调整，取消本次作业。',
        },
      },
    })

    const submissionsResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/assignments/${assignmentId}/submissions`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
    })

    expect(submissionsResponse.statusCode).toBe(200)
    expect(submissionsResponse.json().data.items).toEqual([])
  })
})
