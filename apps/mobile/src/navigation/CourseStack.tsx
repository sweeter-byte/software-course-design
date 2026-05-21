import type { ReactElement } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

export type CourseStackParamList = {
  CourseList: undefined
  CourseWorkspace: { courseId: string }
  CourseCreate: undefined
  AssignmentDetail: { assignmentId: string; courseId: string }
  SubmissionDetail: { submissionId: string; courseId: string }
  FeedbackThread: { feedbackId: string; courseId?: string }
}

type CourseStackProps = {
  renderCourseList: () => ReactElement
  renderCourseWorkspace: () => ReactElement
  renderCourseCreate: () => ReactElement
  renderAssignmentDetail: () => ReactElement
  renderSubmissionDetail: () => ReactElement
  renderFeedbackThread: () => ReactElement
}

const Stack = createNativeStackNavigator<CourseStackParamList>()

export function CourseStack({
  renderCourseList,
  renderCourseWorkspace,
  renderCourseCreate,
  renderAssignmentDetail,
  renderSubmissionDetail,
  renderFeedbackThread,
}: CourseStackProps) {
  return (
    <Stack.Navigator initialRouteName="CourseList" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CourseList">{() => renderCourseList()}</Stack.Screen>
      <Stack.Screen name="CourseWorkspace">{() => renderCourseWorkspace()}</Stack.Screen>
      <Stack.Screen name="CourseCreate">{() => renderCourseCreate()}</Stack.Screen>
      <Stack.Screen name="AssignmentDetail">{() => renderAssignmentDetail()}</Stack.Screen>
      <Stack.Screen name="SubmissionDetail">{() => renderSubmissionDetail()}</Stack.Screen>
      <Stack.Screen name="FeedbackThread">{() => renderFeedbackThread()}</Stack.Screen>
    </Stack.Navigator>
  )
}
