import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { api } from '../../../api'
import { useMobileAuth } from '../../../contexts/MobileAuthContext'
import type { AssignmentItem, CourseItem } from '../../../domain'
import type { CourseStackParamList } from '../../../navigation/CourseStack'
import {
  assignmentStatusLabel,
  derivedSubmissionStatusForAssignment,
} from '../../assignments/assignment-status'

type Nav = NativeStackNavigationProp<CourseStackParamList, 'CourseWorkspace'>

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
}

export function StudentCourseAssignmentsTab({ course }: { course: CourseItem }) {
  const navigation = useNavigation<Nav>()
  const { session, apiBaseUrl } = useMobileAuth()
  const [nowMs] = useState(() => Date.now())

  const assignmentsQuery = useQuery({
    queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return payload.items
    },
  })

  const sortedAssignments = useMemo(
    () =>
      [...(assignmentsQuery.data ?? [])].sort((a, b) => (a.dueAt < b.dueAt ? 1 : -1)),
    [assignmentsQuery.data],
  )

  function open(assignment: AssignmentItem) {
    navigation.navigate('AssignmentDetail', { assignmentId: assignment.id, courseId: course.id })
  }

  if (assignmentsQuery.isLoading) {
    return (
      <View style={styles.statePanel}>
        <ActivityIndicator color="#005bac" />
        <Text style={styles.helper}>作业加载中…</Text>
      </View>
    )
  }

  if (sortedAssignments.length === 0) {
    return (
      <View style={styles.statePanel}>
        <Text style={styles.helper}>该课程暂未发布作业。</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {sortedAssignments.map((assignment) => {
        const submissionStatus = derivedSubmissionStatusForAssignment(assignment)
        return (
          <Pressable key={assignment.id} style={styles.row} onPress={() => open(assignment)}>
            <Text style={styles.rowTitle}>{assignment.title}</Text>
            <Text style={styles.helper}>截止 {formatDateTimeBrief(assignment.dueAt)}</Text>
            <View style={styles.tagRow}>
              <Text style={styles.tag}>{assignmentStatusLabel(assignment, nowMs)}</Text>
              <Text style={styles.tagGreen}>
                {submissionStatus === 'graded'
                  ? '已批改'
                  : submissionStatus === 'submitted'
                    ? '已提交'
                    : '未提交'}
              </Text>
              {assignment.mySubmission?.score != null ? (
                <Text style={styles.tagAmber}>{assignment.mySubmission.score} 分</Text>
              ) : null}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 4,
  },
  rowTitle: { color: '#111827', fontWeight: '800' },
  helper: { color: '#6b7280', lineHeight: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: {
    color: '#004080',
    backgroundColor: '#eaf3ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  tagGreen: {
    color: '#116c35',
    backgroundColor: '#dcf2e3',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  tagAmber: {
    color: '#7c2d12',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '800',
    fontSize: 12,
    overflow: 'hidden',
  },
  statePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
})
