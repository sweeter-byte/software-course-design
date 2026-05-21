import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'

import { api } from '../../api'
import { RoleScreen } from '../../components/layout/RoleScreen'
import { useMobileAuth } from '../../contexts/MobileAuthContext'
import type { FeedbackItem } from '../../domain'
import {
  navigateRoleTab,
  type RoleTabParamList,
} from '../../navigation/RoleTabs'
import { roleLabels } from '../../navigation/navigation-model'
import { useTeacherTaskQueues } from '../teacher/useTeacherTaskQueues'
import {
  buildDashboardActions,
  buildDashboardMetrics,
  buildDashboardTasks,
  type PendingSubmissionTask,
} from './dashboard-model'

type Nav = BottomTabNavigationProp<RoleTabParamList, 'Dashboard'>

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
}

export function DashboardScreen() {
  const navigation = useNavigation<Nav>()
  const { session, apiBaseUrl } = useMobileAuth()
  const role = session.user.role

  const dashboardQuery = useQuery({
    queryKey: ['mobile-dashboard', apiBaseUrl, session.accessToken, role],
    queryFn: () => api.getDashboard(apiBaseUrl, session.accessToken, role),
  })

  const { queues, isLoading: teacherTasksLoading } = useTeacherTaskQueues()

  const summary = dashboardQuery.data?.summary ?? {}
  const metrics = buildDashboardMetrics(role, summary)
  const tasks = buildDashboardTasks(role, summary)
  const actions = buildDashboardActions(role)
  const previewSubmissions = queues.pendingSubmissions.slice(0, 2)
  const previewFeedbacks = queues.pendingFeedbacks.slice(0, 2)

  const openSubmissionTask = (task: PendingSubmissionTask) => {
    navigation.navigate('Courses', {
      screen: 'SubmissionDetail',
      params: { submissionId: task.submission.id, courseId: task.courseId },
    })
  }

  const openFeedbackTask = (thread: FeedbackItem) => {
    navigation.navigate('Courses', {
      screen: 'FeedbackThread',
      params: { feedbackId: thread.id, courseId: thread.courseId ?? undefined },
    })
  }

  return (
    <RoleScreen
      title="工作台"
      subtitle={`${session.user.realName} · ${roleLabels[role]} · ${session.user.phone}`}
    >
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>角色概览</Text>
        <View style={styles.summaryGrid}>
          {metrics.map((metric, index) => (
            <View
              key={metric.key}
              style={[
                styles.summaryCard,
                { borderLeftColor: ['#005bac', '#159447', '#d97706', '#dc2626'][index % 4] },
              ]}
            >
              <Text style={styles.summaryLabel}>{metric.label}</Text>
              <Text style={styles.summaryValue}>{metric.value}</Text>
            </View>
          ))}
        </View>
        {dashboardQuery.isLoading ? <ActivityIndicator color="#005bac" /> : null}
        {!dashboardQuery.isLoading && metrics.every((metric) => metric.value === 0) ? (
          <Text style={styles.helper}>暂无概览数据，请稍后刷新或确认网络连接。</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>优先任务</Text>
        <View style={styles.taskList}>
          {tasks.map((task) => (
            <Pressable
              key={task.label}
              style={styles.taskCard}
              onPress={() => navigateRoleTab(navigation, task.target)}
            >
              <View style={styles.taskCardHead}>
                <Text style={styles.taskLabel}>{task.label}</Text>
                <Text style={styles.taskValue}>{task.value}</Text>
              </View>
              <Text style={styles.helper}>{task.detail}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {role === 'teacher' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>继续处理</Text>
          {teacherTasksLoading ? <ActivityIndicator color="#005bac" /> : null}
          {!teacherTasksLoading &&
          previewSubmissions.length === 0 &&
          previewFeedbacks.length === 0 ? (
            <Text style={styles.helper}>暂无待批改提交或未回答反馈。</Text>
          ) : null}
          <View style={styles.listBlock}>
            {previewSubmissions.map((task) => (
              <Pressable
                key={task.submission.id}
                style={styles.listItem}
                onPress={() => openSubmissionTask(task)}
              >
                <Text style={styles.threadTag}>待批改提交</Text>
                <Text style={styles.listItemTitle}>
                  {task.submission.studentName ?? task.submission.studentId} · {task.assignment.title}
                </Text>
                <Text style={styles.listItemCopy}>{task.submission.content}</Text>
                <Text style={styles.helper}>
                  {task.courseName} · {formatDateTimeBrief(task.submission.submittedAt)}
                </Text>
              </Pressable>
            ))}
            {previewFeedbacks.map((thread) => (
              <Pressable
                key={thread.id}
                style={styles.listItem}
                onPress={() => openFeedbackTask(thread)}
              >
                <Text style={styles.threadTag}>未回答反馈</Text>
                <Text style={styles.listItemTitle}>
                  {thread.studentName ?? thread.studentId} · {thread.assignmentTitle ?? '作业'}
                </Text>
                <Text style={styles.listItemCopy}>{thread.content}</Text>
                <Text style={styles.helper}>
                  {thread.courseName ?? '课程'} · {formatDateTimeBrief(thread.createdAt)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>快捷入口</Text>
        <View style={styles.actionGrid}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              style={styles.actionButton}
              onPress={() => navigateRoleTab(navigation, action.target)}
            >
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionDetail}>{action.detail}</Text>
            </Pressable>
          ))}
        </View>
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
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 96,
    borderLeftWidth: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#f8fbff',
    padding: 14,
    gap: 6,
  },
  summaryLabel: { color: '#4b5563', fontSize: 12, fontWeight: '700' },
  summaryValue: { color: '#005bac', fontSize: 24, fontWeight: '800' },
  taskList: { gap: 10 },
  taskCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#f8fbff',
    padding: 14,
    gap: 8,
  },
  taskCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  taskLabel: { flex: 1, color: '#111827', fontWeight: '800' },
  taskValue: { color: '#005bac', fontSize: 22, fontWeight: '800' },
  actionGrid: { gap: 10 },
  actionButton: {
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 91, 172, 0.28)',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  actionLabel: { color: '#004080', fontWeight: '800' },
  actionDetail: { color: '#6b7280', lineHeight: 18, fontSize: 12 },
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
  threadTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#eaf3ff',
    color: '#004080',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 4,
    overflow: 'hidden',
  },
})
