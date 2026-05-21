export type TeacherCoursePickerTarget = 'filter' | 'publish'

export function selectTeacherCourseForTarget<TDraft extends { courseId: string }>(
  target: TeacherCoursePickerTarget,
  courseId: string,
  state: {
    courseFilter: string
    draft: TDraft
  },
): {
  courseFilter: string
  draft: TDraft
} {
  if (target === 'filter') {
    return {
      courseFilter: courseId,
      draft: state.draft,
    }
  }

  return {
    courseFilter: state.courseFilter,
    draft: {
      ...state.draft,
      courseId,
    },
  }
}
