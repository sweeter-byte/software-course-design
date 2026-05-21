import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'

import { RoleScreen } from '../../components/layout/RoleScreen'
import type { FeedbackItem } from '../../domain'
import type { RoleTabParamList } from '../../navigation/RoleTabs'
import { useTeacherTaskQueues } from './useTeacherTaskQueues'
import type { PendingSubmissionTask } from '../dashboard/dashboard-model'

type Nav = BottomTabNavigationProp<RoleTabParamList, 'TeacherTasks'>

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
}

export function TeacherTasksScreen() {
  const navigation = useNavigation<Nav>()
  const { queues, isLoading } = useTeacherTaskQueues()
  const [tab, setTab] = useState<'submissions' | 'feedbacks'>('submissions')
  const showSubmissions = tab === 'submissions'

  const openSubmission = (task: PendingSubmissionTask) => {
    navigation.navigate('Courses', {
      screen: 'SubmissionDetail',
      params: { submissionId: task.submission.id, courseId: task.courseId },
    })
  }

  const openFeedback = (thread: FeedbackItem) => {
    navigation.navigate('Courses', {
      screen: 'FeedbackThread',
      params: { feedbackId: thread.id, courseId: thread.courseId ?? undefined },
    })
  }

  return (
    <RoleScreen title="教学任务" subtitle="跨课程汇总待批改提交和未回答作业反馈。">
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>任务队列</Text>
        <View style={styles.queueGrid}>
          <Pressable
            style={[styles.queueTab, showSubmissions ? styles.queueTabActive : null]}
            onPress={() => setTab('submissions')}
          >
            <Text style={styles.queueLabel}>待批改提交</Text>
            <Text style={styles.queueValue}>{queues.pendingSubmissions.length}</Text>
          </Pressable>
          <Pressable
            style={[styles.queueTab, !showSubmissions ? styles.queueTabActive : null]}
            onPress={() => setTab('feedbacks')}
          >
            <Text style={styles.queueLabel}>未回答反馈</Text>
            <Text style={styles.queueValue}>{queues.pendingFeedbacks.length}</Text>
          </Pressable>
        </View>
        {isLoading ? <ActivityIndicator color="#005bac" /> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {showSubmissions ? '待批改提交' : '未回答作业反馈'}
        </Text>
        {showSubmissions ? (
          <View style={styles.listBlock}>
            {queues.pendingSubmissions.map((task) => (
              <Pressable
                key={task.submission.id}
                style={styles.listItem}
                onPress={() => openSubmission(task)}
              >
                <Text style={styles.listItemTitle}>
                  {task.submission.studentName ?? task.submission.studentId} · {task.assignment.title}
                </Text>
                <Text style={styles.listItemCopy}>{task.submission.content}</Text>
                <Text style={styles.helper}>课程：{task.courseName}</Text>
                <Text style={styles.helper}>
                  提交时间：{formatDateTimeBrief(task.submission.submittedAt)}
                </Text>
              </Pressable>
            ))}
            {!isLoading && queues.pendingSubmissions.length === 0 ? (
              <Text style={styles.helper}>暂无待批改提交，所有提交都已批改完成。</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.listBlock}>
            {queues.pendingFeedbacks.map((thread) => (
              <Pressable
                key={thread.id}
                style={styles.listItem}
                onPress={() => openFeedback(thread)}
              >
                <Text style={styles.listItemTitle}>
                  {thread.studentName ?? thread.studentId} · {thread.assignmentTitle ?? '作业'}
                </Text>
                <Text style={styles.listItemCopy}>{thread.content}</Text>
                {thread.courseName ? (
                  <Text style={styles.helper}>课程：{thread.courseName}</Text>
                ) : null}
                <Text style={styles.helper}>
                  发起时间：{formatDateTimeBrief(thread.createdAt)}
                </Text>
              </Pressable>
            ))}
            {!isLoading && queues.pendingFeedbacks.length === 0 ? (
              <Text style={styles.helper}>暂无待回答反馈，所有学生反馈都已回应。</Text>
            ) : null}
          </View>
        )}
      </View>
    </RoleScreen>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 14,
  },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '800' },
  helper: { color: '#6b7280', lineHeight: 20 },
  queueGrid: { flexDirection: 'row', gap: 10 },
  queueTab: {
    flex: 1,
    minHeight: 76,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#f8fbff',
    padding: 12,
    gap: 8,
  },
  queueTabActive: { borderColor: '#005bac', backgroundColor: '#eaf3ff' },
  queueLabel: { color: '#4b5563', fontWeight: '800' },
  queueValue: { color: '#005bac', fontSize: 26, fontWeight: '800' },
  listBlock: { gap: 10 },
  listItem: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#f8fbff',
    padding: 14,
    gap: 4,
  },
  listItemTitle: { color: '#111827', fontWeight: '800' },
  listItemCopy: { color: '#4b5563', lineHeight: 20 },
})
