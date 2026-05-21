import { useEffect, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { api } from '../../api'
import { NoticeBanner } from '../../components/feedback/NoticeBanner'
import { SegmentedTabs } from '../../components/ui/SegmentedTabs'
import { useMobileAuth } from '../../contexts/MobileAuthContext'
import type { AssignmentItem, SubmissionItem } from '../../domain'
import type { CourseStackParamList } from '../../navigation/CourseStack'
import {
  getFeedbackThreadInvalidationKeys,
  invalidateQueryKeys,
} from '../../query-invalidation'
import {
  assignmentStatusLabel,
  evaluateStudentSubmissionLock,
  submissionStatusLabel,
} from '../assignments/assignment-status'

type Nav = NativeStackNavigationProp<CourseStackParamList, 'AssignmentDetail'>
type Route = RouteProp<CourseStackParamList, 'AssignmentDetail'>

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
}

function DetailShell({
  title,
  onBack,
  children,
}: {
  title: string
  onBack?: () => void
  children: ReactNode
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        {onBack ? (
          <Pressable onPress={onBack}>
            <Text style={styles.backText}>← 返回</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
        <Text style={styles.topTitle}>{title}</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>{children}</ScrollView>
    </View>
  )
}

export function AssignmentDetailScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { session, notice } = useMobileAuth()
  const role = session.user.role
  const { assignmentId, courseId } = route.params
  const [nowMs] = useState(() => Date.now())
  const { apiBaseUrl } = useMobileAuth()

  const assignmentsQuery = useQuery({
    queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, courseId],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, courseId)
      return payload.items
    },
  })

  const assignment = (assignmentsQuery.data ?? []).find((item) => item.id === assignmentId) ?? null

  if (assignmentsQuery.isLoading) {
    return <DetailShell title="作业详情">
      <ActivityIndicator color="#005bac" />
    </DetailShell>
  }

  if (!assignment) {
    return <DetailShell title="作业详情">
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>未找到作业</Text>
        <Text style={styles.helper}>该作业可能已被取消或不再可见。</Text>
        <Pressable style={styles.ghostButton} onPress={() => navigation.goBack()}>
          <Text style={styles.ghostButtonText}>返回</Text>
        </Pressable>
      </View>
    </DetailShell>
  }

  return (
    <DetailShell title="作业详情" onBack={() => navigation.goBack()}>
      <NoticeBanner notice={notice} />

      <View style={styles.card}>
        <Text style={styles.assignmentTag}>{assignmentStatusLabel(assignment, nowMs)}</Text>
        <Text style={styles.sectionTitle}>{assignment.title}</Text>
        <Text style={styles.helper}>截止 {formatDateTimeBrief(assignment.dueAt)}</Text>
        <Text style={styles.helper}>开始 {formatDateTimeBrief(assignment.startAt)}</Text>
        {assignment.description ? <Text style={styles.body}>{assignment.description}</Text> : null}
        {assignment.requirement ? (
          <View>
            <Text style={styles.fieldLabel}>提交要求</Text>
            <Text style={styles.body}>{assignment.requirement}</Text>
          </View>
        ) : null}
      </View>

      {role === 'student' ? (
        <StudentAssignmentBody assignment={assignment} courseId={courseId} nowMs={nowMs} />
      ) : role === 'teacher' ? (
        <TeacherAssignmentBody assignment={assignment} courseId={courseId} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>作业基础信息</Text>
          <Text style={styles.helper}>教务员可在课程工作区的「基础信息维护」Tab 修改课程数据。</Text>
        </View>
      )}
    </DetailShell>
  )
}

function StudentAssignmentBody({
  assignment,
  courseId,
  nowMs,
}: {
  assignment: AssignmentItem
  courseId: string
  nowMs: number
}) {
  const { session, apiBaseUrl, notify } = useMobileAuth()
  const queryClient = useQueryClient()

  const submission = assignment.mySubmission ?? null

  // Local draft mirrors web's lazy-init from the loaded submission content.
  const [content, setContent] = useState<string>(submission?.content ?? '')
  const [syncedSubmissionId, setSyncedSubmissionId] = useState<string | null>(submission?.id ?? null)

  useEffect(() => {
    if (submission && submission.id !== syncedSubmissionId) {
      setSyncedSubmissionId(submission.id)
      setContent(submission.content ?? '')
    }
    if (!submission && syncedSubmissionId !== null) {
      setSyncedSubmissionId(null)
      setContent('')
    }
  }, [submission, syncedSubmissionId])

  const invalidateAssignmentList = () =>
    queryClient.invalidateQueries({
      queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, courseId],
    })

  const submitMutation = useMutation({
    mutationFn: () =>
      api.createSubmission(apiBaseUrl, session.accessToken, assignment.id, content),
    onSuccess: () => {
      notify('提交成功。', 'success')
      invalidateAssignmentList()
    },
    onError: (error) => notify(error instanceof Error ? error.message : '提交失败', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!submission) throw new Error('missing-submission')
      return api.updateSubmission(apiBaseUrl, session.accessToken, submission.id, content)
    },
    onSuccess: () => {
      notify('已更新提交。', 'success')
      invalidateAssignmentList()
    },
    onError: (error) => notify(error instanceof Error ? error.message : '修改提交失败', 'error'),
  })

  const lock = evaluateStudentSubmissionLock(
    assignment,
    submission as Pick<SubmissionItem, 'status'> | null,
    { isSubmitting: submitMutation.isPending, isUpdating: updateMutation.isPending },
    nowMs,
  )

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>提交与成绩</Text>
        {submission ? (
          <View style={styles.summaryRow}>
            <Text style={styles.statusChip}>{submissionStatusLabel(submission.status)}</Text>
            <Text style={styles.scoreText}>
              {submission.score == null ? '暂无分数' : `${submission.score} 分`}
            </Text>
          </View>
        ) : (
          <Text style={styles.helper}>尚未提交答案。</Text>
        )}
        {submission?.teacherFeedback ? (
          <View style={styles.feedbackBox}>
            <Text style={styles.fieldLabel}>教师评语</Text>
            <Text style={styles.body}>{submission.teacherFeedback}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>提交内容</Text>
          <TextInput
            multiline
            value={content}
            editable={lock.canEdit}
            onChangeText={setContent}
            placeholder={lock.canEdit ? '请输入提交内容（不少于 2 个字）' : '当前不可编辑'}
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.inputMultiline, !lock.canEdit ? styles.inputReadonly : null]}
          />
        </View>

        {lock.lockReason ? <Text style={styles.helper}>{lock.lockReason}</Text> : null}

        <Pressable
          style={[
            styles.primaryButton,
            !lock.canEdit || content.trim().length < 2 ? styles.primaryButtonDisabled : null,
          ]}
          disabled={
            !lock.canEdit ||
            content.trim().length < 2 ||
            submitMutation.isPending ||
            updateMutation.isPending
          }
          onPress={() => {
            if (submission) {
              updateMutation.mutate()
            } else {
              submitMutation.mutate()
            }
          }}
        >
          {submitMutation.isPending || updateMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{lock.primaryButtonLabel}</Text>
          )}
        </Pressable>
      </View>

      <StudentFeedbackSection
        assignmentId={assignment.id}
        courseId={courseId}
        submissionId={submission?.id ?? null}
        gradedAndUnlocked={submission?.status === 'graded'}
      />
    </>
  )
}

function StudentFeedbackSection({
  assignmentId,
  courseId,
  submissionId,
  gradedAndUnlocked,
}: {
  assignmentId: string
  courseId: string
  submissionId: string | null
  gradedAndUnlocked: boolean
}) {
  const { session, apiBaseUrl, notify } = useMobileAuth()
  const navigation = useNavigation<Nav>()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<{ kind: 'question' | 'feedback'; content: string }>({
    kind: 'question',
    content: '',
  })

  // Pull this course's feedback threads so we can show this student's existing
  // threads for the current assignment.
  const threadsQuery = useQuery({
    enabled: gradedAndUnlocked,
    queryKey: ['mobile-feedback-threads', apiBaseUrl, session.accessToken, courseId, 'student'],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {
        courseId,
      })
      return payload.items
    },
  })

  const myThreads = (threadsQuery.data ?? []).filter(
    (thread) => thread.assignmentId === assignmentId && thread.studentId === session.user.id,
  )

  const invalidateThreads = () => {
    invalidateQueryKeys(queryClient, getFeedbackThreadInvalidationKeys())
  }

  const createMutation = useMutation({
    mutationFn: () => {
      if (!submissionId) throw new Error('missing-submission')
      return api.createFeedback(
        apiBaseUrl,
        session.accessToken,
        submissionId,
        draft.kind,
        draft.content,
      )
    },
    onSuccess: () => {
      notify('已发起反馈。', 'success')
      setDraft({ kind: 'question', content: '' })
      invalidateThreads()
    },
    onError: (error) => notify(error instanceof Error ? error.message : '发起反馈失败', 'error'),
  })

  if (!gradedAndUnlocked) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>作业反馈</Text>
        <Text style={styles.helper}>批改完成后才能就该作业发起问题或反馈。</Text>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>作业反馈</Text>
      <Text style={styles.helper}>已批改，可发起问题或反馈，教师回复后会在此显示。</Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>类型</Text>
        <SegmentedTabs
          items={[
            { value: 'question', label: '问题' },
            { value: 'feedback', label: '反馈' },
          ]}
          value={draft.kind}
          onChange={(value) =>
            setDraft((current) => ({ ...current, kind: value as 'question' | 'feedback' }))
          }
          variant="wrap"
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>内容</Text>
        <TextInput
          multiline
          value={draft.content}
          onChangeText={(value) => setDraft((current) => ({ ...current, content: value }))}
          placeholder="不少于 2 个字"
          placeholderTextColor="#9ca3af"
          style={[styles.input, styles.inputMultiline]}
        />
      </View>
      <Pressable
        style={[
          styles.primaryButton,
          draft.content.trim().length < 2 ? styles.primaryButtonDisabled : null,
        ]}
        disabled={
          draft.content.trim().length < 2 ||
          createMutation.isPending ||
          !submissionId
        }
        onPress={() => createMutation.mutate()}
      >
        {createMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>发起新反馈</Text>
        )}
      </Pressable>

      {threadsQuery.isLoading ? (
        <ActivityIndicator color="#005bac" />
      ) : myThreads.length === 0 ? (
        <Text style={styles.helper}>暂未发起过反馈。</Text>
      ) : (
        <View style={styles.threadList}>
          {myThreads.map((thread) => {
            const answered = thread.responses.length > 0
            return (
              <Pressable
                key={thread.id}
                style={styles.threadRow}
                onPress={() =>
                  navigation.navigate('FeedbackThread', {
                    feedbackId: thread.id,
                    courseId,
                  })
                }
              >
                <View style={styles.threadTagRow}>
                  <Text style={styles.kindTag}>{thread.kind === 'question' ? '问题' : '反馈'}</Text>
                  <Text style={answered ? styles.answeredTag : styles.pendingTag}>
                    {answered ? '已回答' : '未回答'}
                  </Text>
                </View>
                <Text style={styles.body}>{thread.content}</Text>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
}

function TeacherAssignmentBody({
  assignment,
  courseId,
}: {
  assignment: AssignmentItem
  courseId: string
}) {
  const { session, apiBaseUrl, notify } = useMobileAuth()
  const queryClient = useQueryClient()

  const [draft, setDraft] = useState({
    title: assignment.title,
    description: assignment.description ?? '',
    requirement: assignment.requirement ?? '',
    startAt: assignment.startAt,
    dueAt: assignment.dueAt,
  })
  const [cancelReason, setCancelReason] = useState('教学计划调整，取消本次作业。')
  const [syncedAssignmentId, setSyncedAssignmentId] = useState(assignment.id)

  useEffect(() => {
    if (assignment.id !== syncedAssignmentId) {
      setSyncedAssignmentId(assignment.id)
      setDraft({
        title: assignment.title,
        description: assignment.description ?? '',
        requirement: assignment.requirement ?? '',
        startAt: assignment.startAt,
        dueAt: assignment.dueAt,
      })
    }
  }, [assignment, syncedAssignmentId])

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, courseId],
    })

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateAssignment(apiBaseUrl, session.accessToken, assignment.id, draft),
    onSuccess: () => {
      notify('作业已更新。', 'success')
      invalidate()
    },
    onError: (error) => notify(error instanceof Error ? error.message : '修改作业失败', 'error'),
  })

  const cancelMutation = useMutation({
    mutationFn: () =>
      api.cancelAssignment(apiBaseUrl, session.accessToken, assignment.id, cancelReason),
    onSuccess: () => {
      notify('作业已取消。', 'success')
      invalidate()
    },
    onError: (error) => notify(error instanceof Error ? error.message : '取消作业失败', 'error'),
  })

  const isCancelled = assignment.status === 'cancelled'

  function confirmUpdate() {
    Alert.alert('保存作业修改', '确认更新当前作业内容吗？学生将看到最新版本。', [
      { text: '取消', style: 'cancel' },
      { text: '保存', onPress: () => updateMutation.mutate() },
    ])
  }

  function confirmCancel() {
    Alert.alert(
      '取消作业',
      `确认取消「${assignment.title}」吗？取消后学生无法继续提交，已有提交保留但不再可被新提交覆盖。`,
      [
        { text: '保留', style: 'cancel' },
        { text: '取消该作业', style: 'destructive', onPress: () => cancelMutation.mutate() },
      ],
    )
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>编辑作业</Text>
      {isCancelled ? (
        <Text style={styles.helper}>作业已取消，不能再修改。</Text>
      ) : (
        <Text style={styles.helper}>所有修改与取消操作都会先弹出二次确认。</Text>
      )}

      <FormField
        label="标题"
        value={draft.title}
        editable={!isCancelled}
        onChange={(value) => setDraft((current) => ({ ...current, title: value }))}
      />
      <FormField
        label="描述"
        value={draft.description}
        editable={!isCancelled}
        multiline
        onChange={(value) => setDraft((current) => ({ ...current, description: value }))}
      />
      <FormField
        label="提交要求"
        value={draft.requirement}
        editable={!isCancelled}
        multiline
        onChange={(value) => setDraft((current) => ({ ...current, requirement: value }))}
      />
      <FormField
        label="开始时间 (ISO)"
        value={draft.startAt}
        editable={!isCancelled}
        onChange={(value) => setDraft((current) => ({ ...current, startAt: value }))}
      />
      <FormField
        label="截止时间 (ISO)"
        value={draft.dueAt}
        editable={!isCancelled}
        onChange={(value) => setDraft((current) => ({ ...current, dueAt: value }))}
      />

      <Pressable
        style={[styles.primaryButton, isCancelled ? styles.primaryButtonDisabled : null]}
        disabled={isCancelled || updateMutation.isPending}
        onPress={confirmUpdate}
      >
        {updateMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>保存修改</Text>
        )}
      </Pressable>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>取消作业</Text>
      <FormField
        label="取消原因（教师可见，供后续审计）"
        value={cancelReason}
        editable={!isCancelled}
        multiline
        onChange={setCancelReason}
      />
      <Pressable
        style={[styles.dangerButton, isCancelled ? styles.dangerButtonDisabled : null]}
        disabled={isCancelled || cancelMutation.isPending}
        onPress={confirmCancel}
      >
        {cancelMutation.isPending ? (
          <ActivityIndicator color="#b91c1c" />
        ) : (
          <Text style={styles.dangerButtonText}>{isCancelled ? '已取消' : '取消该作业'}</Text>
        )}
      </Pressable>
    </View>
  )
}

function FormField({
  label,
  value,
  onChange,
  multiline,
  editable = true,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  multiline?: boolean
  editable?: boolean
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        editable={editable}
        placeholderTextColor="#9ca3af"
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          !editable ? styles.inputReadonly : null,
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d9e2ef',
    backgroundColor: '#ffffff',
  },
  backText: { color: '#005bac', fontWeight: '800' },
  topTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
  scroll: { padding: 16, gap: 12 },
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
  assignmentTag: {
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
  field: { gap: 6 },
  fieldLabel: { color: '#374151', fontWeight: '700', fontSize: 12 },
  input: {
    minHeight: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#fbfcfe',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111827',
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  inputReadonly: { backgroundColor: '#f1f3f5', color: '#6b7280' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusChip: {
    color: '#004080',
    backgroundColor: '#eaf3ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '800',
    fontSize: 12,
    overflow: 'hidden',
  },
  scoreText: { color: '#7c2d12', fontWeight: '800', fontSize: 18 },
  feedbackBox: {
    borderLeftWidth: 4,
    borderLeftColor: '#159447',
    borderRadius: 6,
    backgroundColor: '#eaf8ef',
    padding: 10,
    gap: 4,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 6,
    backgroundColor: '#005bac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { backgroundColor: '#a4bfe0' },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
  ghostButton: {
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfd0e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: { color: '#004080', fontWeight: '700' },
  dangerButton: {
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f4b8b8',
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonDisabled: { opacity: 0.5 },
  dangerButtonText: { color: '#b91c1c', fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#eef1f6', marginVertical: 6 },
  threadList: { gap: 8, marginTop: 6 },
  threadRow: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#eef1f6',
    padding: 10,
    gap: 4,
  },
  threadTagRow: { flexDirection: 'row', gap: 6 },
  kindTag: {
    color: '#004080',
    backgroundColor: '#eaf3ff',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  answeredTag: {
    color: '#116c35',
    backgroundColor: '#dcf2e3',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  pendingTag: {
    color: '#b54708',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
})
