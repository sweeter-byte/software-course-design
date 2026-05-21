import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { api } from '../../../api'
import { SegmentedTabs } from '../../../components/ui/SegmentedTabs'
import { useMobileAuth } from '../../../contexts/MobileAuthContext'
import type { CourseItem, SubmissionItem } from '../../../domain'
import type { CourseStackParamList } from '../../../navigation/CourseStack'
import { submissionStatusLabel } from '../../assignments/assignment-status'

type Nav = NativeStackNavigationProp<CourseStackParamList, 'CourseWorkspace'>

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
}

export function TeacherCourseSubmissionsTab({ course }: { course: CourseItem }) {
  const navigation = useNavigation<Nav>()
  const { session, apiBaseUrl } = useMobileAuth()
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('submitted')

  const assignmentsQuery = useQuery({
    queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return payload.items
    },
  })

  const assignments = assignmentsQuery.data ?? []
  const eligibleAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status !== 'cancelled'),
    [assignments],
  )

  useEffect(() => {
    if (!selectedAssignmentId && eligibleAssignments.length > 0) {
      setSelectedAssignmentId(eligibleAssignments[0].id)
    }
    if (
      selectedAssignmentId &&
      eligibleAssignments.every((assignment) => assignment.id !== selectedAssignmentId)
    ) {
      setSelectedAssignmentId(eligibleAssignments[0]?.id ?? '')
    }
  }, [eligibleAssignments, selectedAssignmentId])

  const submissionsQuery = useQuery({
    enabled: Boolean(selectedAssignmentId),
    queryKey: ['mobile-assignment-submissions', apiBaseUrl, session.accessToken, selectedAssignmentId],
    queryFn: async () => {
      const payload = await api.listSubmissions(apiBaseUrl, session.accessToken, selectedAssignmentId)
      return payload.items
    },
  })

  const filtered = useMemo<SubmissionItem[]>(() => {
    const items = submissionsQuery.data ?? []
    if (!statusFilter) return items
    return items.filter((submission) => submission.status === statusFilter)
  }, [submissionsQuery.data, statusFilter])

  if (assignmentsQuery.isLoading) {
    return (
      <View style={styles.statePanel}>
        <ActivityIndicator color="#005bac" />
        <Text style={styles.helper}>作业加载中…</Text>
      </View>
    )
  }

  if (eligibleAssignments.length === 0) {
    return (
      <View style={styles.statePanel}>
        <Text style={styles.helper}>该课程暂无可批改的作业。</Text>
      </View>
    )
  }

  function open(submission: SubmissionItem) {
    navigation.navigate('SubmissionDetail', {
      submissionId: submission.id,
      courseId: course.id,
    })
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>选择作业</Text>
        <SegmentedTabs
          items={eligibleAssignments.map((assignment) => ({
            value: assignment.id,
            label: assignment.title,
          }))}
          value={selectedAssignmentId}
          onChange={setSelectedAssignmentId}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>提交状态</Text>
        <SegmentedTabs
          items={[
            { value: 'submitted', label: '待批改' },
            { value: 'graded', label: '已批改' },
            { value: '', label: '全部' },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </View>

      {submissionsQuery.isLoading ? (
        <View style={styles.statePanel}>
          <ActivityIndicator color="#005bac" />
          <Text style={styles.helper}>提交加载中…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.statePanel}>
          <Text style={styles.helper}>暂无符合条件的提交。</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map((submission) => (
            <Pressable key={submission.id} style={styles.row} onPress={() => open(submission)}>
              <Text style={styles.rowTitle}>
                {submission.studentName ?? submission.studentId}
                {submission.studentNo ? `（${submission.studentNo}）` : ''}
              </Text>
              <Text style={styles.helper}>
                提交：{formatDateTimeBrief(submission.submittedAt)}
                {submission.gradedAt ? `   ·   批改：${formatDateTimeBrief(submission.gradedAt)}` : ''}
              </Text>
              <View style={styles.tagRow}>
                <Text style={styles.tag}>{submissionStatusLabel(submission.status)}</Text>
                {submission.score != null ? (
                  <Text style={styles.scoreTag}>{submission.score} 分</Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 8,
  },
  sectionTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
  helper: { color: '#6b7280', lineHeight: 20 },
  list: { gap: 10 },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 4,
  },
  rowTitle: { color: '#111827', fontWeight: '800' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
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
  scoreTag: {
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
