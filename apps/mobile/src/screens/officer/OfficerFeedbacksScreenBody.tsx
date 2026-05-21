import { useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'

import { api } from '../../api'
import { SegmentedTabs } from '../../components/ui/SegmentedTabs'
import { useMobileAuth } from '../../contexts/MobileAuthContext'
import type { CourseFeedbackItem } from '../../domain'
import {
  DIMENSION_LABELS,
  DIMENSION_OPTIONS,
  filterGlobalCourseFeedbacks,
} from './officer-admin-model'

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return ''
  return value.replace('T', ' ').slice(0, 16)
}

export function OfficerFeedbacksScreenBody() {
  const { session, apiBaseUrl } = useMobileAuth()
  const [dimensionFilter, setDimensionFilter] = useState<string>('')

  const feedbacksQuery = useQuery<CourseFeedbackItem[]>({
    queryKey: ['mobile-global-course-feedbacks', apiBaseUrl, session.accessToken],
    queryFn: async () => {
      const payload = await api.listCourseFeedbacks(apiBaseUrl, session.accessToken)
      return payload.items
    },
  })

  const filtered = useMemo(
    () => filterGlobalCourseFeedbacks(feedbacksQuery.data ?? [], dimensionFilter),
    [feedbacksQuery.data, dimensionFilter],
  )

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>课程反馈查看</Text>
        <Text style={styles.helper}>聚合全部课程的学生课程整体反馈，只读视图。</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>维度筛选</Text>
          <SegmentedTabs items={DIMENSION_OPTIONS} value={dimensionFilter} onChange={setDimensionFilter} />
        </View>
      </View>

      {feedbacksQuery.isLoading ? (
        <View style={styles.statePanel}>
          <ActivityIndicator color="#005bac" />
          <Text style={styles.helper}>课程反馈加载中…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.statePanel}>
          <Text style={styles.helper}>没有匹配的课程反馈。</Text>
        </View>
      ) : (
        filtered.map((feedback) => (
          <View key={feedback.id} style={styles.row}>
            <Text style={styles.dimensionTag}>{DIMENSION_LABELS[feedback.dimension]}</Text>
            <Text style={styles.body}>{feedback.content}</Text>
            <Text style={styles.helper}>
              课程：{feedback.courseName ?? '未命名课程'}   ·   学生：
              {feedback.studentName ?? feedback.studentId}
              {feedback.studentNo ? `（${feedback.studentNo}）` : ''}
            </Text>
            {feedback.createdAt ? (
              <Text style={styles.timeText}>提交于 {formatDateTimeBrief(feedback.createdAt)}</Text>
            ) : null}
          </View>
        ))
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
    gap: 10,
  },
  sectionTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
  helper: { color: '#6b7280', lineHeight: 20 },
  body: { color: '#111827', lineHeight: 22 },
  field: { gap: 6 },
  fieldLabel: { color: '#374151', fontWeight: '700', fontSize: 12 },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 4,
  },
  dimensionTag: {
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
