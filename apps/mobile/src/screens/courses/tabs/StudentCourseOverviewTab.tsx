import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'

import { api } from '../../../api'
import { useMobileAuth } from '../../../contexts/MobileAuthContext'
import type { AssignmentItem, CourseItem } from '../../../domain'

const MAX_RECENT_ASSIGNMENTS = 5

export function StudentCourseOverviewTab({ course }: { course: CourseItem }) {
  const { session, apiBaseUrl } = useMobileAuth()

  const assignmentsQuery = useQuery({
    queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return payload.items
    },
  })

  const recent: AssignmentItem[] = (assignmentsQuery.data ?? [])
    .slice()
    .sort((a, b) => (a.dueAt < b.dueAt ? 1 : -1))
    .slice(0, MAX_RECENT_ASSIGNMENTS)

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>课程简介</Text>
        <Text style={styles.body}>{course.description || '该课程暂未填写简介。'}</Text>
        <View style={styles.metaRow}>
          <MetaItem label="开课日期" value={course.startDate ?? '—'} />
          <MetaItem label="结课日期" value={course.endDate ?? '—'} />
          <MetaItem label="人数上限" value={String(course.capacity ?? '—')} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>最近作业</Text>
        <Text style={styles.helper}>按截止时间倒序展示最近发布的作业。</Text>
        {assignmentsQuery.isLoading ? (
          <ActivityIndicator color="#005bac" />
        ) : recent.length === 0 ? (
          <Text style={styles.helper}>该课程尚未发布作业。</Text>
        ) : (
          <View style={styles.assignmentList}>
            {recent.map((assignment) => (
              <View key={assignment.id} style={styles.assignmentItem}>
                <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                <Text style={styles.helper}>截止 {formatDateTimeBrief(assignment.dueAt)}</Text>
              </View>
            ))}
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

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
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
  body: { color: '#111827', lineHeight: 22 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { minWidth: 96, gap: 2 },
  metaLabel: { color: '#6b7280', fontSize: 12 },
  metaValue: { color: '#111827', fontWeight: '800' },
  assignmentList: { gap: 8 },
  assignmentItem: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#eef1f6',
    padding: 10,
    gap: 2,
  },
  assignmentTitle: { color: '#111827', fontWeight: '700' },
})
