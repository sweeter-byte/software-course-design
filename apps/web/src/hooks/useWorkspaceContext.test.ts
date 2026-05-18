// @vitest-environment node
import { describe, expect, it } from 'vitest'

import type { AssignmentItem, CourseItem, SubmissionItem } from '../domain'
import { resolveWorkspaceContext } from './useWorkspaceContext'

const course: CourseItem = {
  id: 'course-1',
  courseCode: 'SE-1001',
  courseName: '软件工程',
  description: '课程描述',
  teacherId: 'teacher-1',
  semester: '2026 春',
  location: 'C101',
  scheduleText: '周一',
  capacity: 40,
  status: 'active',
}

const otherCourse: CourseItem = {
  ...course,
  id: 'course-2',
  courseCode: 'SE-1002',
}

const mySubmission: SubmissionItem = {
  id: 'submission-mine',
  assignmentId: 'assignment-1',
  studentId: 'student-1',
  content: '我的提交',
  status: 'graded',
  score: 90,
}

const assignmentWithMySubmission: AssignmentItem = {
  id: 'assignment-1',
  courseId: 'course-1',
  teacherId: 'teacher-1',
  title: '作业一',
  description: '描述',
  requirement: '要求',
  startAt: '2026-05-01T00:00:00.000Z',
  dueAt: '2026-05-20T16:00:00.000Z',
  status: 'published',
  mySubmission,
}

const teacherSubmissionA: SubmissionItem = {
  id: 'submission-A',
  assignmentId: 'assignment-1',
  studentId: 'student-A',
  content: '答案 A',
  status: 'submitted',
}

const teacherSubmissionB: SubmissionItem = {
  id: 'submission-B',
  assignmentId: 'assignment-1',
  studentId: 'student-B',
  content: '答案 B',
  status: 'graded',
  score: 88,
}

describe('resolveWorkspaceContext', () => {
  it('returns nulls when no selections are present', () => {
    const result = resolveWorkspaceContext({
      selection: {
        selectedCourseId: null,
        selectedAssignmentId: null,
        selectedSubmissionId: null,
      },
      visibleCourses: [],
      assignments: [],
      submissions: [],
      currentRole: undefined,
    })

    expect(result.selectedCourse).toBeNull()
    expect(result.selectedAssignment).toBeNull()
    expect(result.selectedSubmission).toBeNull()
    expect(result.context).toEqual({ course: null, assignment: null, submission: null })
  })

  it('falls back to my submission for students even when the submissions list is empty', () => {
    const result = resolveWorkspaceContext({
      selection: {
        selectedCourseId: 'course-1',
        selectedAssignmentId: 'assignment-1',
        selectedSubmissionId: null,
      },
      visibleCourses: [course],
      assignments: [assignmentWithMySubmission],
      submissions: [],
      currentRole: 'student',
    })

    expect(result.selectedSubmission).toEqual(mySubmission)
  })

  it('uses the submissions list (not assignment.mySubmission) for teachers', () => {
    const result = resolveWorkspaceContext({
      selection: {
        selectedCourseId: 'course-1',
        selectedAssignmentId: 'assignment-1',
        selectedSubmissionId: 'submission-B',
      },
      visibleCourses: [course],
      assignments: [assignmentWithMySubmission],
      submissions: [teacherSubmissionA, teacherSubmissionB],
      currentRole: 'teacher',
    })

    expect(result.selectedSubmission).toEqual(teacherSubmissionB)
  })

  it('returns null for teachers when the selected submission is not in the list yet', () => {
    const result = resolveWorkspaceContext({
      selection: {
        selectedCourseId: 'course-1',
        selectedAssignmentId: 'assignment-1',
        selectedSubmissionId: 'submission-missing',
      },
      visibleCourses: [course],
      assignments: [assignmentWithMySubmission],
      submissions: [teacherSubmissionA],
      currentRole: 'teacher',
    })

    expect(result.selectedSubmission).toBeNull()
  })

  it('ignores assignments belonging to other courses if the selection points to that course', () => {
    const result = resolveWorkspaceContext({
      selection: {
        selectedCourseId: 'course-2',
        selectedAssignmentId: 'assignment-1',
        selectedSubmissionId: null,
      },
      visibleCourses: [course, otherCourse],
      assignments: [assignmentWithMySubmission],
      submissions: [],
      currentRole: 'student',
    })

    expect(result.selectedCourse?.id).toBe('course-2')
    expect(result.selectedAssignment?.id).toBe('assignment-1')
  })
})
