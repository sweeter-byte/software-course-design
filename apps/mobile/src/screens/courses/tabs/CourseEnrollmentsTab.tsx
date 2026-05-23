import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'

import { api } from '../../../api'
import { useMobileAuth } from '../../../contexts/MobileAuthContext'
import type { CourseEnrollmentItem, CourseItem } from '../../../domain'

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}

/**
 * Roster view for teacher / officer course workspaces. The server-side
 * endpoint already enforces role-based access, so this component just
 * renders the list.
 */
export function CourseEnrollmentsTab({ course }: { course: CourseItem }) {
  const { session, apiBaseUrl } = useMobileAuth()

  const enrollmentsQuery = useQuery<CourseEnrollmentItem[]>({
    queryKey: ['mobile-course-enrollments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listCourseEnrollments(apiBaseUrl, session.accessToken, course.id)
      return payload.items
    },
  })

  if (enrollmentsQuery.isLoading) {
    return (
      <View style={styles.statePanel}>
        <ActivityIndicator color="#005bac" />
        <Text style={styles.helper}>正在加载选课名单…</Text>
      </View>
    )
  }

  if (enrollmentsQuery.isError) {
    return (
      <View style={styles.statePanel}>
        <Text style={styles.errorTitle}>无法加载选课名单</Text>
        <Text style={styles.helper}>
          {enrollmentsQuery.error instanceof Error
            ? enrollmentsQuery.error.message
            : '请稍后重试。'}
        </Text>
      </View>
    )
  }

  const items = enrollmentsQuery.data ?? []

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>选课学生名单</Text>
        <Text style={styles.helper}>
          已加入 {items.length} / {course.capacity} 名学生，按加入时间升序排列。
        </Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.statePanel}>
          <Text style={styles.helper}>暂无学生加入该课程。</Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.studentId} style={styles.card}>
            <Text style={styles.rowTitle}>
              {item.realName}
              {item.studentNo ? `（${item.studentNo}）` : ''}
            </Text>
            <Text style={styles.helper}>手机：{item.phone}</Text>
            {item.college || item.major || item.className ? (
              <Text style={styles.helper}>
                {[item.college, item.major, item.className].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            <Text style={styles.helper}>加入时间：{formatDate(item.enrolledAt)}</Text>
          </View>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 4,
  },
  sectionTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
  rowTitle: { color: '#111827', fontWeight: '800' },
  helper: { color: '#6b7280', lineHeight: 20 },
  errorTitle: { color: '#b91c1c', fontWeight: '800' },
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
