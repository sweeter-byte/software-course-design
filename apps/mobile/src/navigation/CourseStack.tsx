import type { ReactElement } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

export type CourseStackParamList = {
  CourseList: undefined
  CourseWorkspace: { courseId: string }
  AssignmentDetail: { assignmentId: string }
  SubmissionDetail: { submissionId: string }
  FeedbackThread: { feedbackId: string }
}

type CourseStackProps = {
  renderCourseList: () => ReactElement
  renderCourseWorkspace: () => ReactElement
  renderAssignmentDetail: () => ReactElement
  renderSubmissionDetail: () => ReactElement
  renderFeedbackThread: () => ReactElement
}

const Stack = createNativeStackNavigator<CourseStackParamList>()

export function CourseStack({
  renderCourseList,
  renderCourseWorkspace,
  renderAssignmentDetail,
  renderSubmissionDetail,
  renderFeedbackThread,
}: CourseStackProps) {
  return (
    <Stack.Navigator initialRouteName="CourseList" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CourseList">{() => renderCourseList()}</Stack.Screen>
      <Stack.Screen name="CourseWorkspace">{() => renderCourseWorkspace()}</Stack.Screen>
      <Stack.Screen name="AssignmentDetail">{() => renderAssignmentDetail()}</Stack.Screen>
      <Stack.Screen name="SubmissionDetail">{() => renderSubmissionDetail()}</Stack.Screen>
      <Stack.Screen name="FeedbackThread">{() => renderFeedbackThread()}</Stack.Screen>
    </Stack.Navigator>
  )
}
