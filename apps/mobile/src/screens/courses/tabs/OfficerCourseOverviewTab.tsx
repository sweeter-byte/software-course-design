import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'

import { api } from '../../../api'
import { useMobileAuth } from '../../../contexts/MobileAuthContext'
import type { AssignmentItem, CourseFeedbackItem, CourseItem } from '../../../domain'

export function OfficerCourseOverviewTab({ course }: { course: CourseItem }) {
  const { session, apiBaseUrl } = useMobileAuth()

  const assignmentsQuery = useQuery<AssignmentItem[]>({
    queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return payload.items
    },
  })

  const feedbacksQuery = useQuery<CourseFeedbackItem[]>({
    queryKey: ['mobile-course-feedbacks', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listCourseFeedbacks(apiBaseUrl, session.accessToken, course.id)
      return payload.items
    },
  })

  const assignmentsCount = assignmentsQuery.data?.length ?? 0
  const cancelledCount = (assignmentsQuery.data ?? []).filter((item) => item.status === 'cancelled').length
  const feedbacksCount = feedbacksQuery.data?.length ?? 0

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>课程信息</Text>
        <Text style={styles.body}>{course.description || '该课程暂未填写简介。'}</Text>
        <View style={styles.metaRow}>
          <MetaItem label="授课教师" value={course.teacherName ?? course.teacherId} />
          <MetaItem label="学期" value={course.semester || '—'} />
          <MetaItem label="上课时间" value={course.scheduleText || '—'} />
          <MetaItem label="上课地点" value={course.location || '—'} />
          <MetaItem label="人数上限" value={String(course.capacity ?? '—')} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>运行数据</Text>
        {assignmentsQuery.isLoading || feedbacksQuery.isLoading ? (
          <ActivityIndicator color="#005bac" />
        ) : (
          <View style={styles.metricRow}>
            <Metric label="作业总数" value={assignmentsCount} />
            <Metric label="已取消作业" value={cancelledCount} />
            <Metric label="课程整体反馈" value={feedbacksCount} />
          </View>
        )}
      </View>
    </View>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
  body: { color: '#111827', lineHeight: 22 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { minWidth: 110, gap: 2 },
  metaLabel: { color: '#6b7280', fontSize: 12 },
  metaValue: { color: '#111827', fontWeight: '800' },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: {
    minWidth: 100,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#005bac',
    backgroundColor: '#f6f9ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  metricLabel: { color: '#374151', fontSize: 12, fontWeight: '700' },
  metricValue: { color: '#005bac', fontSize: 22, fontWeight: '800' },
})
