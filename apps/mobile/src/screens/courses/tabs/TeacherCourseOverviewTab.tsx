import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'

import { api } from '../../../api'
import { useMobileAuth } from '../../../contexts/MobileAuthContext'
import type { AssignmentItem, CourseItem, FeedbackItem } from '../../../domain'

const MAX_RECENT_ASSIGNMENTS = 5

export function TeacherCourseOverviewTab({ course }: { course: CourseItem }) {
  const { session, apiBaseUrl } = useMobileAuth()

  const assignmentsQuery = useQuery({
    queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return payload.items
    },
  })

  const feedbacksQuery = useQuery<{ items: FeedbackItem[] }>({
    queryKey: ['mobile-course-feedback-threads', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {
        courseId: course.id,
        status: 'open',
      })
      return { items: payload.items }
    },
  })

  const recent = (assignmentsQuery.data ?? [])
    .slice()
    .sort((a: AssignmentItem, b: AssignmentItem) => (a.dueAt < b.dueAt ? 1 : -1))
    .slice(0, MAX_RECENT_ASSIGNMENTS)

  const openFeedbacks = (feedbacksQuery.data?.items ?? []).filter((thread) => thread.responses.length === 0)

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>课程信息</Text>
        <Text style={styles.body}>{course.description || '该课程暂未填写简介。'}</Text>
        <View style={styles.metaRow}>
          <MetaItem label="上课时间" value={course.scheduleText || '—'} />
          <MetaItem label="上课地点" value={course.location || '—'} />
          <MetaItem label="人数上限" value={String(course.capacity ?? '—')} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>最近作业</Text>
        {assignmentsQuery.isLoading ? (
          <ActivityIndicator color="#005bac" />
        ) : recent.length === 0 ? (
          <Text style={styles.helper}>该课程暂未发布作业。</Text>
        ) : (
          <View style={styles.list}>
            {recent.map((assignment: AssignmentItem) => (
              <View key={assignment.id} style={styles.listItem}>
                <Text style={styles.listTitle}>{assignment.title}</Text>
                <Text style={styles.helper}>截止 {formatDateTimeBrief(assignment.dueAt)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>待回答反馈</Text>
        {feedbacksQuery.isLoading ? (
          <ActivityIndicator color="#005bac" />
        ) : openFeedbacks.length === 0 ? (
          <Text style={styles.helper}>当前课程暂无未回答的作业反馈。</Text>
        ) : (
          <View style={styles.list}>
            {openFeedbacks.slice(0, 5).map((thread) => (
              <View key={thread.id} style={styles.listItem}>
                <Text style={styles.listTag}>{thread.kind === 'question' ? '学生问题' : '学生反馈'}</Text>
                <Text style={styles.listTitle}>{thread.assignmentTitle ?? '作业反馈'}</Text>
                <Text style={styles.helper}>{thread.content}</Text>
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
  list: { gap: 8 },
  listItem: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#eef1f6',
    padding: 10,
    gap: 2,
  },
  listTitle: { color: '#111827', fontWeight: '700' },
  listTag: {
    alignSelf: 'flex-start',
    color: '#004080',
    backgroundColor: '#eaf3ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
})
