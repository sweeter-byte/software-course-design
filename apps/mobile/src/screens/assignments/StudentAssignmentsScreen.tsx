import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'

import { api } from '../../api'
import { NoticeBanner } from '../../components/feedback/NoticeBanner'
import { SegmentedTabs } from '../../components/ui/SegmentedTabs'
import { useMobileAuth } from '../../contexts/MobileAuthContext'
import type { AssignmentItem, CourseItem } from '../../domain'
import { resetCourseStackTo } from '../../navigation/courseStackNav'
import type { RoleTabParamList } from '../../navigation/RoleTabs'
import {
  SUBMISSION_STATUS_OPTIONS,
  assignmentStatusLabel,
  derivedSubmissionStatusForAssignment,
} from './assignment-status'

type Nav = BottomTabNavigationProp<RoleTabParamList, 'Assignments'>

type AssignmentRow = {
  assignment: AssignmentItem
  course: CourseItem
  submissionStatus: string
}

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
}

export function StudentAssignmentsScreen() {
  const { session, apiBaseUrl, notice, dismissNotice } = useMobileAuth()
  const navigation = useNavigation<Nav>()
  const [filter, setFilter] = useState<string>('')
  const [nowMs] = useState(() => Date.now())

  const coursesQuery = useQuery({
    queryKey: ['mobile-student-courses', apiBaseUrl, session.accessToken],
    queryFn: async () => {
      const payload = await api.listCourses(apiBaseUrl, session.accessToken, {})
      return payload.items
    },
  })

  const enrolled = useMemo(
    () => (coursesQuery.data ?? []).filter((course) => course.enrolled),
    [coursesQuery.data],
  )

  const assignmentQueries = useQueries({
    queries: enrolled.map((course) => ({
      queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, course.id],
      queryFn: async () => {
        const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
        return { items: payload.items, course }
      },
    })),
  })

  const rows = useMemo<AssignmentRow[]>(() => {
    const merged: AssignmentRow[] = []
    for (const query of assignmentQueries) {
      if (!query.data) continue
      for (const assignment of query.data.items) {
        merged.push({
          assignment,
          course: query.data.course,
          submissionStatus: derivedSubmissionStatusForAssignment(assignment),
        })
      }
    }
    return merged
      .filter((row) => (filter ? row.submissionStatus === filter : true))
      .sort((a, b) => (a.assignment.dueAt < b.assignment.dueAt ? 1 : -1))
  }, [assignmentQueries, filter])

  const isLoading = coursesQuery.isLoading || assignmentQueries.some((query) => query.isLoading)
  const isRefreshing =
    !isLoading &&
    (coursesQuery.isFetching || assignmentQueries.some((query) => query.isFetching))

  function refreshAll() {
    coursesQuery.refetch()
    assignmentQueries.forEach((query) => query.refetch())
  }

  function openAssignment(row: AssignmentRow) {
    resetCourseStackTo(navigation, [
      { name: 'CourseList' },
      { name: 'CourseWorkspace', params: { courseId: row.course.id } },
      {
        name: 'AssignmentDetail',
        params: { assignmentId: row.assignment.id, courseId: row.course.id },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <NoticeBanner notice={notice} onDismiss={dismissNotice} />
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>我的作业</Text>
        <Text style={styles.helper}>跨课程汇总所有作业，点击进入作业详情查看或提交。</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>提交状态</Text>
          <SegmentedTabs
            items={SUBMISSION_STATUS_OPTIONS}
            value={filter}
            onChange={setFilter}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.statePanel}>
          <ActivityIndicator color="#005bac" />
          <Text style={styles.helper}>加载中…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.assignment.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refreshAll} tintColor="#005bac" />
          }
          ListEmptyComponent={
            <View style={styles.statePanel}>
              <Text style={styles.helper}>暂无符合条件的作业。</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openAssignment(item)}>
              <Text style={styles.rowTitle}>{item.assignment.title}</Text>
              <Text style={styles.rowMeta}>
                {item.course.courseName} · 截止 {formatDateTimeBrief(item.assignment.dueAt)}
              </Text>
              <View style={styles.tagRow}>
                <Text style={styles.statusTag}>{assignmentStatusLabel(item.assignment, nowMs)}</Text>
                <Text style={styles.submissionTag}>
                  {item.submissionStatus === 'graded'
                    ? '已批改'
                    : item.submissionStatus === 'submitted'
                      ? '已提交'
                      : '未提交'}
                </Text>
                {item.assignment.mySubmission?.score != null ? (
                  <Text style={styles.scoreTag}>{item.assignment.mySubmission.score} 分</Text>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12, padding: 16 },
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
  field: { gap: 6 },
  fieldLabel: { color: '#374151', fontWeight: '700', fontSize: 12 },
  list: { gap: 10, paddingBottom: 24 },
  row: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 6,
  },
  rowTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
  rowMeta: { color: '#374151' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusTag: {
    color: '#004080',
    backgroundColor: '#eaf3ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  submissionTag: {
    color: '#116c35',
    backgroundColor: '#dcf2e3',
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
