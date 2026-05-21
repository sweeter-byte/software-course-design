import { useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useQueries, useQuery } from '@tanstack/react-query'

import { api } from '../../../api'
import { useMobileAuth } from '../../../contexts/MobileAuthContext'
import type { AssignmentItem, CourseItem, SubmissionItem } from '../../../domain'
import { assignmentStatusLabel } from '../../assignments/assignment-status'

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
}

export function OfficerCourseAssignmentsTab({ course }: { course: CourseItem }) {
  const { session, apiBaseUrl } = useMobileAuth()
  const [nowMs] = useState(() => Date.now())

  const assignmentsQuery = useQuery({
    queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return payload.items
    },
  })

  const assignments = useMemo(
    () => [...(assignmentsQuery.data ?? [])].sort((a, b) => (a.dueAt < b.dueAt ? 1 : -1)),
    [assignmentsQuery.data],
  )

  const submissionQueries = useQueries({
    queries: assignments.map((assignment) => ({
      queryKey: ['mobile-assignment-submissions', apiBaseUrl, session.accessToken, assignment.id],
      queryFn: async () => {
        const payload = await api.listSubmissions(apiBaseUrl, session.accessToken, assignment.id)
        return { assignmentId: assignment.id, items: payload.items as SubmissionItem[] }
      },
    })),
  })

  const submissionsByAssignment = useMemo(() => {
    const map: Record<string, SubmissionItem[]> = {}
    submissionQueries.forEach((query) => {
      if (query.data) map[query.data.assignmentId] = query.data.items
    })
    return map
  }, [submissionQueries])

  if (assignmentsQuery.isLoading) {
    return (
      <View style={styles.statePanel}>
        <ActivityIndicator color="#005bac" />
        <Text style={styles.helper}>作业加载中…</Text>
      </View>
    )
  }

  if (assignments.length === 0) {
    return (
      <View style={styles.statePanel}>
        <Text style={styles.helper}>该课程暂无作业。</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {assignments.map((assignment: AssignmentItem) => {
        const submissions = submissionsByAssignment[assignment.id] ?? []
        const total = submissions.length
        const pending = submissions.filter((submission) => submission.status === 'submitted').length
        const graded = submissions.filter((submission) => submission.status === 'graded').length
        return (
          <View key={assignment.id} style={styles.card}>
            <Text style={styles.sectionTitle}>{assignment.title}</Text>
            <Text style={styles.helper}>截止 {formatDateTimeBrief(assignment.dueAt)}</Text>
            <Text style={styles.tag}>{assignmentStatusLabel(assignment, nowMs)}</Text>
            <View style={styles.metricRow}>
              <Metric label="提交总数" value={total} />
              <Metric label="待批改" value={pending} />
              <Metric label="已批改" value={graded} />
            </View>
          </View>
        )
      })}
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
  container: { gap: 10 },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 6,
  },
  sectionTitle: { color: '#111827', fontWeight: '800' },
  helper: { color: '#6b7280', lineHeight: 20 },
  tag: {
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
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  metric: {
    minWidth: 90,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#005bac',
    backgroundColor: '#f6f9ff',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2,
  },
  metricLabel: { color: '#374151', fontSize: 12, fontWeight: '700' },
  metricValue: { color: '#005bac', fontSize: 20, fontWeight: '800' },
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
