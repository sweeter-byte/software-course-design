import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { api } from '../../../api'
import { SegmentedTabs } from '../../../components/ui/SegmentedTabs'
import { useMobileAuth } from '../../../contexts/MobileAuthContext'
import type { CourseItem, FeedbackItem } from '../../../domain'
import type { CourseStackParamList } from '../../../navigation/CourseStack'
import { useMemo, useState } from 'react'

type Nav = NativeStackNavigationProp<CourseStackParamList, 'CourseWorkspace'>

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
}

export function TeacherCourseFeedbacksTab({ course }: { course: CourseItem }) {
  const navigation = useNavigation<Nav>()
  const { session, apiBaseUrl } = useMobileAuth()
  const [filter, setFilter] = useState<string>('open')

  const threadsQuery = useQuery<FeedbackItem[]>({
    queryKey: ['mobile-feedback-threads', apiBaseUrl, session.accessToken, course.id, 'teacher'],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {
        courseId: course.id,
      })
      return payload.items
    },
  })

  const filtered = useMemo<FeedbackItem[]>(() => {
    const items = threadsQuery.data ?? []
    if (filter === 'open') return items.filter((thread) => thread.responses.length === 0)
    if (filter === 'answered') return items.filter((thread) => thread.responses.length > 0)
    return items
  }, [threadsQuery.data, filter])

  if (threadsQuery.isLoading) {
    return (
      <View style={styles.statePanel}>
        <ActivityIndicator color="#005bac" />
        <Text style={styles.helper}>反馈加载中…</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>作业反馈</Text>
        <Text style={styles.helper}>展示本课程下学生发起的作业问题或反馈。</Text>
        <SegmentedTabs
          items={[
            { value: 'open', label: '未回答' },
            { value: 'answered', label: '已回答' },
            { value: '', label: '全部' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.statePanel}>
          <Text style={styles.helper}>暂无符合条件的反馈。</Text>
        </View>
      ) : (
        filtered.map((thread) => {
          const answered = thread.responses.length > 0
          return (
            <Pressable
              key={thread.id}
              style={styles.row}
              onPress={() =>
                navigation.navigate('FeedbackThread', { feedbackId: thread.id, courseId: course.id })
              }
            >
              <View style={styles.rowHead}>
                <Text style={styles.rowTitle}>
                  {thread.studentName ?? thread.studentId} · {thread.assignmentTitle ?? '作业'}
                </Text>
                <Text style={answered ? styles.tagGreen : styles.tagAmber}>
                  {answered ? '已回答' : '未回答'}
                </Text>
              </View>
              <Text style={styles.kindTag}>{thread.kind === 'question' ? '问题' : '反馈'}</Text>
              <Text style={styles.helper}>{thread.content}</Text>
              <Text style={styles.timeText}>发起：{formatDateTimeBrief(thread.createdAt)}</Text>
            </Pressable>
          )
        })
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
    padding: 14,
    gap: 8,
  },
  sectionTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
  helper: { color: '#6b7280', lineHeight: 20 },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 4,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowTitle: { color: '#111827', fontWeight: '800', flex: 1, paddingRight: 8 },
  kindTag: {
    alignSelf: 'flex-start',
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
    color: '#b54708',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  timeText: { color: '#6b7280', fontSize: 12 },
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
