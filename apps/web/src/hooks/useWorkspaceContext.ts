import { useCallback, useState } from 'react'

import type {
  AssignmentItem,
  CourseItem,
  SubmissionItem,
  UserRole,
  WorkspaceContext,
} from '../domain'

export interface WorkspaceContextSelection {
  selectedCourseId: string | null
  selectedAssignmentId: string | null
  selectedSubmissionId: string | null
}

export interface WorkspaceContextActions {
  setSelectedCourseId: (courseId: string | null) => void
  setSelectedAssignmentId: (assignmentId: string | null) => void
  setSelectedSubmissionId: (submissionId: string | null) => void
  resetAll: () => void
  resetBelowCourse: () => void
  resetBelowAssignment: () => void
}

export type WorkspaceContextController = WorkspaceContextSelection & WorkspaceContextActions

/**
 * Owns the (courseId, assignmentId, submissionId) selection tuple together
 * with the cascading reset helpers. The derived context object is computed
 * by `resolveWorkspaceContext` once query results are available.
 */
export function useWorkspaceSelection(): WorkspaceContextController {
  const [selectedCourseId, setSelectedCourseIdState] = useState<string | null>(null)
  const [selectedAssignmentId, setSelectedAssignmentIdState] = useState<string | null>(null)
  const [selectedSubmissionId, setSelectedSubmissionIdState] = useState<string | null>(null)

  const resetAll = useCallback(() => {
    setSelectedCourseIdState(null)
    setSelectedAssignmentIdState(null)
    setSelectedSubmissionIdState(null)
  }, [])

  const resetBelowCourse = useCallback(() => {
    setSelectedAssignmentIdState(null)
    setSelectedSubmissionIdState(null)
  }, [])

  const resetBelowAssignment = useCallback(() => {
    setSelectedSubmissionIdState(null)
  }, [])

  return {
    selectedCourseId,
    selectedAssignmentId,
    selectedSubmissionId,
    setSelectedCourseId: setSelectedCourseIdState,
    setSelectedAssignmentId: setSelectedAssignmentIdState,
    setSelectedSubmissionId: setSelectedSubmissionIdState,
    resetAll,
    resetBelowCourse,
    resetBelowAssignment,
  }
}

export interface ResolveWorkspaceContextParams {
  selection: WorkspaceContextSelection
  visibleCourses: CourseItem[]
  assignments: AssignmentItem[]
  submissions: SubmissionItem[]
  currentRole: UserRole | undefined
}

export interface ResolvedWorkspaceContext {
  selectedCourse: CourseItem | null
  selectedAssignment: AssignmentItem | null
  selectedSubmission: SubmissionItem | null
  context: WorkspaceContext
}

export function resolveWorkspaceContext({
  selection,
  visibleCourses,
  assignments,
  submissions,
  currentRole,
}: ResolveWorkspaceContextParams): ResolvedWorkspaceContext {
  const selectedCourse =
    visibleCourses.find((course) => course.id === selection.selectedCourseId) ?? null
  const selectedAssignment =
    assignments.find((assignment) => assignment.id === selection.selectedAssignmentId) ?? null

  let selectedSubmission: SubmissionItem | null
  if (currentRole === 'teacher') {
    selectedSubmission =
      submissions.find((submission) => submission.id === selection.selectedSubmissionId) ?? null
  } else {
    selectedSubmission =
      selectedAssignment?.mySubmission ??
      submissions.find((submission) => submission.id === selection.selectedSubmissionId) ??
      null
  }

  return {
    selectedCourse,
    selectedAssignment,
    selectedSubmission,
    context: {
      course: selectedCourse,
      assignment: selectedAssignment,
      submission: selectedSubmission,
    },
  }
}

