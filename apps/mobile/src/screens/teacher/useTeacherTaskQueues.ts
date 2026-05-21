import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'

import { api } from '../../api'
import { useMobileAuth } from '../../contexts/MobileAuthContext'
import type { AssignmentItem, CourseItem, FeedbackItem, SubmissionItem } from '../../domain'
import {
  buildTeacherTaskQueues,
  type TeacherAssignmentContext,
  type TeacherTaskQueues,
} from '../dashboard/dashboard-model'

/**
 * Aggregate the data a teacher needs for both the dashboard "继续处理"
 * preview and the dedicated 教学任务 tab: pending submissions across own
 * courses + unanswered feedback threads.
 */
export function useTeacherTaskQueues(): {
  queues: TeacherTaskQueues
  isLoading: boolean
} {
  const { session, apiBaseUrl } = useMobileAuth()
  const enabled = session.user.role === 'teacher'

  const coursesQuery = useQuery({
    enabled,
    queryKey: ['mobile-courses', apiBaseUrl, session.accessToken],
    queryFn: async () => {
      const payload = await api.listCourses(apiBaseUrl, session.accessToken, '')
      return payload.items as CourseItem[]
    },
  })

  const ownCourses = useMemo(
    () => (coursesQuery.data ?? []).filter((course) => course.teacherId === session.user.id),
    [coursesQuery.data, session.user.id],
  )

  const assignmentQueries = useQueries({
    queries: enabled
      ? ownCourses.map((course) => ({
          queryKey: ['mobile-teacher-assignments', apiBaseUrl, session.accessToken, course.id],
          queryFn: async () => {
            const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
            return { items: payload.items as AssignmentItem[], course }
          },
        }))
      : [],
  })

  const assignmentContexts = useMemo<TeacherAssignmentContext[]>(
    () =>
      assignmentQueries.flatMap((query) => {
        if (!query.data) return []
        return query.data.items.map((assignment) => ({
          assignment,
          courseId: query.data.course.id,
          courseName: query.data.course.courseName,
        }))
      }),
    [assignmentQueries],
  )

  const submittableAssignments = useMemo(
    () => assignmentContexts.filter(({ assignment }) => assignment.status !== 'cancelled'),
    [assignmentContexts],
  )

  const submissionQueries = useQueries({
    queries: enabled
      ? submittableAssignments.map(({ assignment }) => ({
          queryKey: ['mobile-teacher-submissions', apiBaseUrl, session.accessToken, assignment.id],
          queryFn: async () => {
            const payload = await api.listSubmissions(
              apiBaseUrl,
              session.accessToken,
              assignment.id,
            )
            return { items: payload.items as SubmissionItem[], assignmentId: assignment.id }
          },
        }))
      : [],
  })

  const feedbackThreadsQuery = useQuery({
    enabled,
    queryKey: ['mobile-teacher-feedback-threads', apiBaseUrl, session.accessToken],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {})
      return payload.items as FeedbackItem[]
    },
  })

  const submissionsByAssignment = useMemo(() => {
    const map: Record<string, SubmissionItem[]> = {}
    submissionQueries.forEach((query) => {
      if (query.data) {
        map[query.data.assignmentId] = query.data.items
      }
    })
    return map
  }, [submissionQueries])

  const queues = useMemo(
    () =>
      buildTeacherTaskQueues({
        assignments: assignmentContexts,
        submissionsByAssignment,
        feedbackThreads: feedbackThreadsQuery.data ?? [],
      }),
    [assignmentContexts, submissionsByAssignment, feedbackThreadsQuery.data],
  )

  const isLoading =
    enabled &&
    (coursesQuery.isLoading ||
      assignmentQueries.some((query) => query.isLoading) ||
      submissionQueries.some((query) => query.isLoading) ||
      feedbackThreadsQuery.isLoading)

  return { queues, isLoading }
}
