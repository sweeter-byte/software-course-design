import { describe, expect, it } from 'vitest'

import { relativeIsoDate } from './test-dates'

async function buildFeedbackApp() {
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
      phone: '13800138030',
      purpose: 'register',
    },
  })

  const verificationPayload = verificationResponse.json()

  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/student',
    payload: {
      phone: '13800138030',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      username: 'feedback_student',
      realName: '反馈学生',
      studentId: '162350130',
      verificationCode: verificationPayload.data.previewCode,
    },
  })

  const studentLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      phone: '13800138030',
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

async function createFeedbackThread() {
  const { app, officerToken, teacherToken, studentToken } = await buildFeedbackApp()

  const courseResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/courses',
    headers: {
      authorization: `Bearer ${officerToken}`,
    },
    payload: {
      courseCode: `SE-${Math.floor(4700 + Math.random() * 200)}`,
      courseName: '反馈修改课程',
      teacherId: 'teacher-demo-001',
      semester: '2026 春',
      description: '反馈修改与回复删除实践。',
      location: '天目湖校区 C309',
      scheduleText: '周一 16:00-17:35',
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
      title: '反馈修改作业',
      description: '用于反馈修改。',
      requirement: '提交并批改后发起反馈。',
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
      content: '已完成反馈修改作业。',
    },
  })
  const submissionId = submissionResponse.json().data.submission.id as string

  await app.inject({
    method: 'POST',
    url: `/api/v1/submissions/${submissionId}/grade`,
    headers: {
      authorization: `Bearer ${teacherToken}`,
    },
    payload: {
      score: 90,
      teacherFeedback: '可以继续补充。',
    },
  })

  const feedbackResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/submissions/${submissionId}/feedbacks`,
    headers: {
      authorization: `Bearer ${studentToken}`,
    },
    payload: {
      kind: 'question',
      content: '原始问题内容。',
    },
  })
  const feedbackId = feedbackResponse.json().data.feedback.id as string

  const responseResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/feedbacks/${feedbackId}/responses`,
    headers: {
      authorization: `Bearer ${teacherToken}`,
    },
    payload: {
      content: '原始回答内容。',
    },
  })
  const responseId = responseResponse.json().data.response.id as string

  return {
    app,
    officerToken,
    studentToken,
    teacherToken,
    courseId,
    assignmentId,
    submissionId,
    feedbackId,
    responseId,
  }
}

describe('feedback threads', () => {
  it('allows a student to post a question after grading is completed', async () => {
    const { app, officerToken, teacherToken, studentToken } = await buildFeedbackApp()

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
      payload: {
        courseCode: 'SE-4501',
        courseName: '交互系统课程项目',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '交互系统项目实践。',
        location: '天目湖校区 C206',
        scheduleText: '周二 10:00-11:35',
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
        title: '交互流程作业',
        description: '完成交互流程建模。',
        requirement: '提交页面流和异常状态说明。',
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
        content: '已完成交互流程图与页面跳转说明。',
      },
    })

    const submissionId = submissionResponse.json().data.submission.id as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/submissions/${submissionId}/grade`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        score: 90,
        teacherFeedback: '结构清晰，异常流说明可以更细。',
      },
    })

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/submissions/${submissionId}/feedbacks`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        kind: 'question',
        content: '老师，异常流里登录超时是否需要单独画状态转换？',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'feedback_created',
      data: {
        feedback: {
          submissionId,
          assignmentId,
          kind: 'question',
          status: 'open',
        },
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('allows the course teacher to respond to a student feedback thread', async () => {
    const { app, officerToken, teacherToken, studentToken } = await buildFeedbackApp()

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
      payload: {
        courseCode: 'SE-4502',
        courseName: '互动原型评审',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '互动原型评审与迭代。',
        location: '天目湖校区 C208',
        scheduleText: '周四 10:00-11:35',
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
        title: '原型迭代作业',
        description: '完成原型图迭代与反馈整理。',
        requirement: '提交新旧版本对比及说明。',
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
        content: '已完成原型图迭代版本与说明。',
      },
    })

    const submissionId = submissionResponse.json().data.submission.id as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/submissions/${submissionId}/grade`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        score: 93,
        teacherFeedback: '对比清晰，可以补充设计取舍说明。',
      },
    })

    const feedbackResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/submissions/${submissionId}/feedbacks`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        kind: 'feedback',
        content: '这次作业节奏有点紧，希望下次多给一天缓冲。',
      },
    })

    const feedbackId = feedbackResponse.json().data.feedback.id as string

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/feedbacks/${feedbackId}/responses`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        content: '收到，下次会把发布时间再提前，并补上节奏提醒。',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'response_created',
      data: {
        response: {
          feedbackId,
          teacherId: 'teacher-demo-001',
          content: '收到，下次会把发布时间再提前，并补上节奏提醒。',
        },
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('lists feedback threads with teacher responses for course participants', async () => {
    const { app, officerToken, teacherToken, studentToken } = await buildFeedbackApp()

    const courseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/courses',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
      payload: {
        courseCode: 'SE-4503',
        courseName: '互动线程展示',
        teacherId: 'teacher-demo-001',
        semester: '2026 春',
        description: '互动线程展示实践。',
        location: '天目湖校区 C210',
        scheduleText: '周五 10:00-11:35',
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
        title: '互动线程展示作业',
        description: '构建反馈与回复展示页面。',
        requirement: '展示问题和教师回复。',
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
        content: '已完成线程展示页面。',
      },
    })

    const submissionId = submissionResponse.json().data.submission.id as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/submissions/${submissionId}/grade`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        score: 92,
        teacherFeedback: '布局清晰，可以强化状态区分。',
      },
    })

    const feedbackResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/submissions/${submissionId}/feedbacks`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        kind: 'question',
        content: '老师，回复气泡是否需要区分角色颜色？',
      },
    })

    const feedbackId = feedbackResponse.json().data.feedback.id as string

    await app.inject({
      method: 'POST',
      url: `/api/v1/feedbacks/${feedbackId}/responses`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        content: '需要，建议学生与教师使用不同底色与标题标签。',
      },
    })

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/feedbacks?submissionId=${submissionId}`,
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
            id: feedbackId,
            submissionId,
            assignmentId,
            kind: 'question',
            responses: [
              expect.objectContaining({
                teacherId: 'teacher-demo-001',
                content: '需要，建议学生与教师使用不同底色与标题标签。',
              }),
            ],
          }),
        ],
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('lists feedback thread overview for the course teacher with course, assignment, student, and response context', async () => {
    const { app, teacherToken, courseId, assignmentId, feedbackId, submissionId } =
      await createFeedbackThread()

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/feedbacks/threads?courseId=${courseId}&assignmentId=${assignmentId}&status=open`,
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
            id: feedbackId,
            courseId,
            courseName: '反馈修改课程',
            courseCode: expect.stringMatching(/^SE-/),
            assignmentId,
            assignmentTitle: '反馈修改作业',
            submissionId,
            submissionStatus: 'graded',
            studentId: expect.any(String),
            studentName: '反馈学生',
            studentNo: '162350130',
            kind: 'question',
            content: '原始问题内容。',
            status: 'open',
            responses: [
              expect.objectContaining({
                teacherId: 'teacher-demo-001',
                teacherName: '陈海燕',
                content: '原始回答内容。',
              }),
            ],
          }),
        ],
      },
      meta: {
        requestId: expect.any(String),
      },
    })
  })

  it('limits feedback thread overview to the current actor scope', async () => {
    const { app, teacherToken, studentToken, officerToken, courseId, feedbackId } =
      await createFeedbackThread()
    const otherTeacherToken = app.jwt.sign({
      sub: 'teacher-not-owner',
      role: 'teacher',
      phone: '13900999000',
    })

    const teacherResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/feedbacks/threads?courseId=${courseId}`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
    })
    const otherTeacherResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/feedbacks/threads?courseId=${courseId}`,
      headers: {
        authorization: `Bearer ${otherTeacherToken}`,
      },
    })
    const studentResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/feedbacks/threads',
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })
    const officerResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/feedbacks/threads?courseId=${courseId}`,
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
    })

    expect(teacherResponse.statusCode).toBe(200)
    expect(teacherResponse.json().data.items).toEqual([
      expect.objectContaining({ id: feedbackId }),
    ])
    expect(otherTeacherResponse.statusCode).toBe(200)
    expect(otherTeacherResponse.json().data.items).toEqual([])
    expect(studentResponse.statusCode).toBe(200)
    expect(studentResponse.json().data.items).toEqual([
      expect.objectContaining({ id: feedbackId }),
    ])
    expect(officerResponse.statusCode).toBe(200)
    expect(officerResponse.json().data.items).toEqual([
      expect.objectContaining({ id: feedbackId }),
    ])
  })

  it('allows a student to update their own feedback', async () => {
    const { app, studentToken, feedbackId } = await createFeedbackThread()

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/feedbacks/${feedbackId}`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        kind: 'feedback',
        content: '修改后的反馈内容。',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'feedback_updated',
      data: {
        feedback: {
          id: feedbackId,
          kind: 'feedback',
          content: '修改后的反馈内容。',
        },
      },
    })
  })

  it('allows a student to delete their own feedback and hides it from the thread', async () => {
    const { app, studentToken, submissionId, feedbackId } = await createFeedbackThread()

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/v1/feedbacks/${feedbackId}`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    expect(deleteResponse.statusCode).toBe(200)
    expect(deleteResponse.json()).toMatchObject({
      success: true,
      message: 'feedback_deleted',
      data: {
        feedback: {
          id: feedbackId,
          status: 'deleted',
        },
      },
    })

    const listResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/feedbacks?submissionId=${submissionId}`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.json().data.items).toEqual([])
  })

  it('allows a teacher to update their own response', async () => {
    const { app, teacherToken, responseId } = await createFeedbackThread()

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/responses/${responseId}`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
      payload: {
        content: '修改后的回答内容。',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      success: true,
      message: 'response_updated',
      data: {
        response: {
          id: responseId,
          content: '修改后的回答内容。',
        },
      },
    })
  })

  it('allows a teacher to delete their own response', async () => {
    const { app, teacherToken, studentToken, submissionId, responseId } = await createFeedbackThread()

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/v1/responses/${responseId}`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
    })

    expect(deleteResponse.statusCode).toBe(200)
    expect(deleteResponse.json()).toMatchObject({
      success: true,
      message: 'response_deleted',
      data: {
        response: {
          id: responseId,
        },
      },
    })

    const listResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/feedbacks?submissionId=${submissionId}`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.json().data.items[0].responses).toEqual([])
  })
})
