export type MobileQueryKey = readonly unknown[]

type QueryInvalidator = {
  invalidateQueries: (filters: { queryKey: MobileQueryKey }) => unknown
}

export function invalidateQueryKeys(
  queryClient: QueryInvalidator,
  keys: ReadonlyArray<MobileQueryKey>,
) {
  keys.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey })
  })
}

export function getSubmissionGradeInvalidationKeys(
  apiBaseUrl: string,
  token: string,
  courseId: string,
  submissionId: string,
): MobileQueryKey[] {
  return [
    ['mobile-submission-detail', apiBaseUrl, token, submissionId],
    ['mobile-assignment-submissions'],
    ['mobile-teacher-submissions'],
    ['mobile-course-assignments', apiBaseUrl, token, courseId],
    ['mobile-teacher-feedback-threads'],
    ['mobile-dashboard'],
  ]
}

export function getFeedbackThreadInvalidationKeys(): MobileQueryKey[] {
  return [
    ['mobile-feedback-threads'],
    ['mobile-teacher-feedback-threads'],
    ['mobile-course-feedback-threads'],
    ['mobile-dashboard'],
  ]
}

export function getCourseEnrollmentInvalidationKeys(): MobileQueryKey[] {
  return [
    ['mobile-course-list'],
    ['mobile-course-detail'],
    ['mobile-student-courses'],
    ['mobile-courses'],
    ['mobile-dashboard'],
  ]
}

export function getCourseFeedbackInvalidationKeys(
  apiBaseUrl: string,
  token: string,
  courseId: string,
): MobileQueryKey[] {
  return [
    ['mobile-course-feedbacks', apiBaseUrl, token, courseId],
    ['mobile-global-course-feedbacks'],
    ['mobile-dashboard'],
  ]
}
