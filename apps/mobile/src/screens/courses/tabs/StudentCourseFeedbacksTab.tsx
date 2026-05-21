import { useMemo } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { api } from '../../../api'
import { useMobileAuth } from '../../../contexts/MobileAuthContext'
import type { CourseItem, FeedbackItem } from '../../../domain'
import type { CourseStackParamList } from '../../../navigation/CourseStack'
import { buildStudentFeedbackRows } from '../../feedbacks/feedback-model'

type Nav = NativeStackNavigationProp<CourseStackParamList, 'CourseWorkspace'>

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return ''
  return value.replace('T', ' ').slice(0, 16)
}

export function StudentCourseFeedbacksTab({ course }: { course: CourseItem }) {
  const navigation = useNavigation<Nav>()
  const { session, apiBaseUrl } = useMobileAuth()

  const assignmentsQuery = useQuery({
    queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return payload.items
    },
  })

  const threadsQuery = useQuery<FeedbackItem[]>({
    queryKey: ['mobile-feedback-threads', apiBaseUrl, session.accessToken, course.id, 'student'],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {
        courseId: course.id,
      })
      return payload.items
    },
  })

  const rows = useMemo(
    () => buildStudentFeedbackRows(assignmentsQuery.data ?? [], threadsQuery.data ?? []),
    [assignmentsQuery.data, threadsQuery.data],
  )

  if (assignmentsQuery.isLoading || threadsQuery.isLoading) {
    return (
      <View style={styles.statePanel}>
        <ActivityIndicator color="#005bac" />
        <Text style={styles.helper}>反馈加载中…</Text>
      </View>
    )
  }

  if (rows.length === 0) {
    return (
      <View style={styles.statePanel}>
        <Text style={styles.sectionTitle}>暂无可反馈的作业</Text>
        <Text style={styles.helper}>
          按本课程已批改的作业聚合。批改完成后会在这里出现，可发起问题或反馈。
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <Text style={styles.helper}>
          按本课程已批改作业聚合。点击有线程的条目进入详情；没有线程的条目跳到作业详情发起。
        </Text>
      </View>
      {rows.map((row) => (
        <Pressable
          key={row.assignmentId}
          style={styles.row}
          onPress={() => {
            if (row.thread) {
              navigation.navigate('FeedbackThread', {
                feedbackId: row.thread.id,
                courseId: course.id,
              })
            } else {
              navigation.navigate('AssignmentDetail', {
                assignmentId: row.assignmentId,
                courseId: course.id,
              })
            }
          }}
        >
          <View style={styles.rowHead}>
            <Text style={styles.rowTitle}>{row.assignmentTitle}</Text>
            <Text style={styles.scoreText}>{row.score}</Text>
          </View>
          <Text style={styles.helper}>{row.teacherFeedback}</Text>
          <View style={styles.tagRow}>
            <Text style={row.hasThread ? styles.tagGreen : styles.tagAmber}>
              {row.hasThread ? '已发起' : '未发起'}
            </Text>
            <Text style={row.hasResponse ? styles.tagGreen : styles.tagBlue}>
              教师 · {row.hasResponse ? '已回复' : '未回复'}
            </Text>
            {row.thread?.createdAt ? (
              <Text style={styles.timeText}>
                发起 {formatDateTimeBrief(row.thread.createdAt)}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  intro: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#f8fbff',
    padding: 12,
  },
  helper: { color: '#6b7280', lineHeight: 20 },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 6,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { color: '#111827', fontWeight: '800', fontSize: 15, flex: 1, paddingRight: 8 },
  scoreText: { color: '#7c2d12', fontWeight: '800' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
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
  tagBlue: {
    color: '#004080',
    backgroundColor: '#eaf3ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  timeText: { color: '#6b7280', fontSize: 12 },
  sectionTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
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
