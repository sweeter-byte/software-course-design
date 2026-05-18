import { describe, expect, it } from 'vitest'

import { relativeIsoDate } from './test-dates'

async function buildLearningApp() {
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

  const teacherLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      phone: '13900139000',
      password: 'Teacher123!',
    },
  })

  const verificationResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verification-code',
    payload: {
      phone: '13800138020',
      purpose: 'register',
    },
  })

  const verificationPayload = verificationResponse.json()

  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/student',
    payload: {
      phone: '13800138020',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      username: 'submission_student',
      realName: '提交学生',
      studentId: '162350120',
      verificationCode: verificationPayload.data.previewCode,
    },
  })

  const studentLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      phone: '13800138020',
      password: 'Password123!',
    },
  })

  return {
    app,
    officerToken: officerLogin.json().data.accessToken as string,
    teacherToken: teacherLogin.json().data.accessToken as string,
    studentToken: studentLogin.json().data.accessToken as string,
  }
}

async function createSubmittedAssignment() {
  const { app, officerToken, teacherToken, studentToken } = await buildLearningApp()

  const courseResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/courses',
    headers: {
      authorization: `Bearer ${officerToken}`,
    },
    payload: {
      courseCode: `SE-${Math.floor(4600 + Math.random() * 300)}`,
      courseName: '提交详情课程',
      teacherId: 'teacher-demo-001',
      semester: '2026 春',
      description: '提交详情与修改实践。',
      location: '将军路校区 A309',
      scheduleText: '周三 16:00-17:35',
      capacity: 100,
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
      title: '提交详情作业',
      description: '用于查询与修改答案。',
      requirement: '提交一段答案。',
      startAt: relativeIsoDate(-7, 8),
      dueAt: relativeIsoDate(30),
    },
  })
  const assignmentId = assignmentResponse.json().data.assignment.id as string

  const submissionResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/assignments/${assignmentId}/submissions`,
    headers: {
      authorization: `Bearer ${studentToken}`,
    },
    payload: {
      content: '初始答案。',
    },
  })
  const submissionId = submissionResponse.json().data.submission.id as string

  return {
    app,
    teacherToken,
    studentToken,
    assignmentId,
    submissionId,
  }
}

describe('assignment submissions', () => {
  it('allows an enrolled student to submit an answer before the deadline', async () => {
    const { app, officerToken, teacherToken, studentToken } = await buildLearningApp()

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
      payload: {
        courseCode: 'SE-4401',
        courseName: '系统分析与设计实践',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '系统分析与设计课程项目实践。',
        location: '将军路校区 A105',
        scheduleText: '周四 08:00-09:35',
        capacity: 100,
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
        title: '需求建模作业',
        description: '完成课程互动系统的业务建模。',
        requirement: '提交业务流程、类图与需求追踪矩阵。',
        startAt: relativeIsoDate(-7, 8),
        dueAt: relativeIsoDate(30),
      },
    })

    const assignmentId = assignmentResponse.json().data.assignment.id as string

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${assignmentId}/submissions`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        content: '已完成需求摘要、角色矩阵和领域模型。',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'submission_created',
      data: {
        submission: {
          assignmentId,
          status: 'submitted',
          content: '已完成需求摘要、角色矩阵和领域模型。',
        },
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('allows the course teacher to grade a submitted answer', async () => {
    const { app, officerToken, teacherToken, studentToken } = await buildLearningApp()

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
      payload: {
        courseCode: 'SE-4402',
        courseName: '课程互动设计分析',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '课程互动设计分析实践。',
        location: '将军路校区 A205',
        scheduleText: '周五 08:00-09:35',
        capacity: 100,
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
        title: '系统原型作业',
        description: '完成系统原型设计。',
        requirement: '提交 Web 原型图和移动端页面流。',
        startAt: relativeIsoDate(-7, 8),
        dueAt: relativeIsoDate(30),
      },
    })

    const assignmentId = assignmentResponse.json().data.assignment.id as string

    const submissionResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${assignmentId}/submissions`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        content: '已完成 Web 与移动端原型设计。',
      },
    })

    const submissionId = submissionResponse.json().data.submission.id as string

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/submissions/${submissionId}/grade`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        score: 95,
        teacherFeedback: '结构完整，流程清晰，继续完善异常场景。',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'submission_graded',
      data: {
        submission: {
          id: submissionId,
          status: 'graded',
          score: 95,
          teacherFeedback: '结构完整，流程清晰，继续完善异常场景。',
        },
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('lists assignment submissions for the course teacher', async () => {
    const { app, officerToken, teacherToken, studentToken } = await buildLearningApp()

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
      payload: {
        courseCode: 'SE-4403',
        courseName: '提交清单查看',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '提交清单查看实践。',
        location: '将军路校区 A208',
        scheduleText: '周五 14:00-15:35',
        capacity: 100,
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
        title: '提交清单作业',
        description: '用于查看提交清单。',
        requirement: '提交作业并等待教师查看。',
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
        content: '这是提交清单里的答案。',
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/assignments/${assignmentId}/submissions`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'ok',
      data: {
        items: [
          expect.objectContaining({
            assignmentId,
            status: 'submitted',
            content: '这是提交清单里的答案。',
            studentName: '提交学生',
            studentNo: '162350120',
          }),
        ],
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('returns student names and student numbers for each submission in the listing', async () => {
    const { app, officerToken, teacherToken, studentToken } = await buildLearningApp()

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
      payload: {
        courseCode: 'SE-4404',
        courseName: '多学生提交清单',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '验证多学生提交时教师能看到姓名/学号。',
        location: '将军路校区 A210',
        scheduleText: '周一 14:00-15:35',
        capacity: 100,
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

    const secondPhone = '13800138021'
    const secondVerification = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verification-code',
      payload: {
        phone: secondPhone,
        purpose: 'register',
      },
    })

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register/student',
      payload: {
        phone: secondPhone,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        username: 'submission_student_2',
        realName: '另一位提交学生',
        studentId: '162350121',
        verificationCode: secondVerification.json().data.previewCode,
      },
    })

    const secondLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        phone: secondPhone,
        password: 'Password123!',
      },
    })
    const secondToken = secondLogin.json().data.accessToken as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/enroll`,
      headers: {
        authorization: `Bearer ${secondToken}`,
      },
    })

    const assignmentResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/assignments`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        title: '多学生提交作业',
        description: '验证清单姓名/学号。',
        requirement: '提交一段答案。',
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
        content: '提交学生的答案。',
      },
    })
    await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${assignmentId}/submissions`,
      headers: {
        authorization: `Bearer ${secondToken}`,
      },
      payload: {
        content: '另一位提交学生的答案。',
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/assignments/${assignmentId}/submissions`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
    const items = response.json().data.items as Array<{
      studentName: string | null
      studentNo: string | null
      content: string
    }>
    expect(items).toHaveLength(2)

    const byName = new Map(items.map((item) => [item.studentName, item]))
    expect(byName.get('提交学生')).toMatchObject({
      studentNo: '162350120',
      content: '提交学生的答案。',
    })
    expect(byName.get('另一位提交学生')).toMatchObject({
      studentNo: '162350121',
      content: '另一位提交学生的答案。',
    })
    for (const item of items) {
      expect(item.studentName).not.toBeNull()
      expect(item.studentNo).not.toBeNull()
    }
  })

  it('allows a student to view their own submission and grading result', async () => {
    const { app, teacherToken, studentToken, submissionId } = await createSubmittedAssignment()

    await app.inject({
      method: 'POST',
      url: `/api/v1/submissions/${submissionId}/grade`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        score: 88,
        teacherFeedback: '答案完整，可以继续完善论证。',
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/submissions/${submissionId}`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        submission: {
          id: submissionId,
          content: '初始答案。',
          status: 'graded',
          score: 88,
          teacherFeedback: '答案完整，可以继续完善论证。',
          studentName: '提交学生',
          studentNo: '162350120',
        },
      },
    })
  })

  it('allows a student to modify an ungraded answer before the deadline', async () => {
    const { app, studentToken, submissionId } = await createSubmittedAssignment()

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/submissions/${submissionId}`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        content: '修改后的答案。',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'submission_updated',
      data: {
        submission: {
          id: submissionId,
          content: '修改后的答案。',
          status: 'submitted',
        },
      },
    })
  })

  it('rejects modifying or overwriting a graded answer', async () => {
    const { app, teacherToken, studentToken, assignmentId, submissionId } = await createSubmittedAssignment()

    await app.inject({
      method: 'POST',
      url: `/api/v1/submissions/${submissionId}/grade`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        score: 91,
        teacherFeedback: '已批改。',
      },
    })

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/submissions/${submissionId}`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        content: '试图修改已批改答案。',
      },
    })

    expect(patchResponse.statusCode).toBe(409)
    expect(patchResponse.json()).toMatchObject({
      success: false,
      message: 'submission_already_graded',
    })

    const postResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/assignments/${assignmentId}/submissions`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        content: '试图重新提交覆盖已批改答案。',
      },
    })

    expect(postResponse.statusCode).toBe(409)
    expect(postResponse.json()).toMatchObject({
      success: false,
      message: 'submission_already_graded',
    })
  })
})
