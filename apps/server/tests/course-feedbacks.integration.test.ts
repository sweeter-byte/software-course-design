import { describe, expect, it } from 'vitest'

async function buildCourseFeedbackApp() {
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

  const verificationResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verification-code',
    payload: {
      phone: '13800138110',
      purpose: 'register',
    },
  })

  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register/student',
    payload: {
      phone: '13800138110',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      username: 'course_feedback_student',
      realName: '课程反馈学生',
      studentId: '162351110',
      verificationCode: verificationResponse.json().data.previewCode,
    },
  })

  const studentLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      phone: '13800138110',
      password: 'Password123!',
    },
  })

  const officerToken = officerLogin.json().data.accessToken as string
  const courseResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/courses',
    headers: {
      authorization: `Bearer ${officerToken}`,
    },
    payload: {
      courseCode: 'CF-4501',
      courseName: '课程反馈实践',
      teacherId: 'teacher-demo-001',
      semester: '2026 秋',
      description: '用于课程反馈验收。',
      location: '将军路校区 D101',
      scheduleText: '周四 3-4 节',
      capacity: 80,
      startDate: '2026-09-01',
      endDate: '2027-01-15',
    },
  })
  const courseId = courseResponse.json().data.course.id as string
  const studentToken = studentLogin.json().data.accessToken as string

  await app.inject({
    method: 'POST',
    url: `/api/v1/courses/${courseId}/enroll`,
    headers: {
      authorization: `Bearer ${studentToken}`,
    },
  })

  return {
    app,
    courseId,
    officerToken,
    teacherToken: teacherLogin.json().data.accessToken as string,
    studentToken,
  }
}

describe('course feedbacks', () => {
  it('lets an enrolled student add, update, view, and delete course feedback', async () => {
    const { app, courseId, studentToken } = await buildCourseFeedbackApp()

    const createResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/course-feedbacks`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        dimension: 'teaching',
        content: '教师讲解清晰，希望增加案例。',
      },
    })

    expect(createResponse.statusCode).toBe(201)
    expect(createResponse.json()).toMatchObject({
      success: true,
      message: 'course_feedback_created',
      data: {
        feedback: {
          courseId,
          dimension: 'teaching',
          content: '教师讲解清晰，希望增加案例。',
          status: 'open',
        },
      },
    })

    const feedbackId = createResponse.json().data.feedback.id as string

    const updateResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/course-feedbacks/${feedbackId}`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        dimension: 'gain',
        content: '学习收获明显，建议继续保留课堂练习。',
      },
    })

    expect(updateResponse.statusCode).toBe(200)
    expect(updateResponse.json()).toMatchObject({
      success: true,
      message: 'course_feedback_updated',
      data: {
        feedback: {
          id: feedbackId,
          dimension: 'gain',
          content: '学习收获明显，建议继续保留课堂练习。',
        },
      },
    })

    const listResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/course-feedbacks?courseId=${courseId}`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    expect(listResponse.statusCode).toBe(200)
    expect(listResponse.json().data.items).toEqual([
      expect.objectContaining({
        id: feedbackId,
        courseId,
        dimension: 'gain',
      }),
    ])

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/v1/course-feedbacks/${feedbackId}`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    expect(deleteResponse.statusCode).toBe(200)
    expect(deleteResponse.json()).toMatchObject({
      success: true,
      message: 'course_feedback_deleted',
    })

    const afterDeleteResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/course-feedbacks?courseId=${courseId}`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
    })

    expect(afterDeleteResponse.json().data.items).toEqual([])
  })

  it('lets the course teacher and officer view course feedback', async () => {
    const { app, courseId, studentToken, teacherToken, officerToken } = await buildCourseFeedbackApp()

    const createResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/courses/${courseId}/course-feedbacks`,
      headers: {
        authorization: `Bearer ${studentToken}`,
      },
      payload: {
        dimension: 'method',
        content: '教学方法适合项目实践。',
      },
    })
    const feedbackId = createResponse.json().data.feedback.id as string

    const teacherListResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/course-feedbacks?courseId=${courseId}`,
      headers: {
        authorization: `Bearer ${teacherToken}`,
      },
    })

    expect(teacherListResponse.statusCode).toBe(200)
    expect(teacherListResponse.json().data.items).toEqual([
      expect.objectContaining({
        id: feedbackId,
        courseId,
        dimension: 'method',
        studentName: '课程反馈学生',
        studentNo: '162351110',
      }),
    ])

    const officerListResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/course-feedbacks',
      headers: {
        authorization: `Bearer ${officerToken}`,
      },
    })

    expect(officerListResponse.statusCode).toBe(200)
    expect(officerListResponse.json().data.items).toEqual([
      expect.objectContaining({
        id: feedbackId,
        courseId,
        studentName: '课程反馈学生',
        studentNo: '162351110',
      }),
    ])
  })
})
