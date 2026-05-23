import { CommonActions, type NavigationProp } from '@react-navigation/native'

import type { CourseStackParamList } from './CourseStack'
import type { RoleTabParamList } from './RoleTabs'

type CourseRoute =
  | { name: 'CourseList' }
  | { name: 'CourseWorkspace'; params: { courseId: string } }
  | {
      name: 'AssignmentDetail'
      params: { assignmentId: string; courseId: string }
    }
  | {
      name: 'SubmissionDetail'
      params: { submissionId: string; courseId: string }
    }
  | {
      name: 'FeedbackThread'
      params: { feedbackId: string; courseId?: string }
    }

/**
 * Reset the Courses tab's stack so the back button walks back through a
 * sensible history instead of dropping the user on whatever tab they came
 * from. Used by Dashboard and TeacherTasks when they deep-link into a
 * feedback / submission / assignment screen — without this, pressing back
 * from FeedbackThread would jump back to the originating tab (often the
 * dashboard "工作台"), which surprised acceptance testers.
 */
export function resetCourseStackTo(
  navigation: NavigationProp<RoleTabParamList>,
  routes: CourseRoute[],
) {
  if (routes.length === 0) return
  navigation.dispatch(
    CommonActions.navigate({
      name: 'Courses',
      params: {
        state: {
          index: routes.length - 1,
          routes: routes as Array<{
            name: keyof CourseStackParamList
            params?: Record<string, unknown>
          }>,
        },
      },
    }),
  )
}
