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
import type { FeedbackItem, FeedbackKind, SubmissionItem } from '../../domain'
import type { CourseStackParamList } from '../../navigation/CourseStack'
import {
  getFeedbackThreadInvalidationKeys,
  invalidateQueryKeys,
} from '../../query-invalidation'
import { canStudentEditFeedback, canTeacherEditResponse } from './feedback-model'

type Nav = NativeStackNavigationProp<CourseStackParamList, 'FeedbackThread'>
type Route = RouteProp<CourseStackParamList, 'FeedbackThread'>

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
}

export function FeedbackThreadScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { session, apiBaseUrl, notice, notify } = useMobileAuth()
  const queryClient = useQueryClient()
  const role = session.user.role
  const { feedbackId, courseId } = route.params

  const threadsQuery = useQuery<FeedbackItem[]>({
    enabled: Boolean(courseId),
    queryKey: ['mobile-feedback-threads', apiBaseUrl, session.accessToken, courseId, role],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {
        courseId,
      })
      return payload.items
    },
  })

  // Fallback: if courseId was missing (older callers), pull threads without
  // a filter and search by feedbackId.
  const globalThreadsQuery = useQuery<FeedbackItem[]>({
    enabled: !courseId,
    queryKey: ['mobile-feedback-threads', apiBaseUrl, session.accessToken, 'global', role],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {})
      return payload.items
    },
  })

  const allThreads = (threadsQuery.data ?? globalThreadsQuery.data ?? []) as FeedbackItem[]
  const thread = allThreads.find((item) => item.id === feedbackId) ?? null

  const submissionQuery = useQuery<SubmissionItem>({
    enabled: Boolean(thread?.submissionId),
    queryKey: ['mobile-submission-detail', apiBaseUrl, session.accessToken, thread?.submissionId],
    queryFn: async () => {
      const payload = await api.getSubmission(
        apiBaseUrl,
        session.accessToken,
        thread!.submissionId,
      )
      return payload.submission
    },
  })

  const invalidateThreads = () => {
    invalidateQueryKeys(queryClient, getFeedbackThreadInvalidationKeys())
  }

  if (threadsQuery.isLoading || globalThreadsQuery.isLoading) {
    return (
      <Shell title="反馈详情" onBack={() => navigation.goBack()}>
        <ActivityIndicator color="#005bac" />
      </Shell>
    )
  }

  if (!thread) {
    return (
      <Shell title="反馈详情" onBack={() => navigation.goBack()}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>未找到反馈</Text>
          <Text style={styles.helper}>该反馈可能已被删除或不属于当前课程范围。</Text>
        </View>
      </Shell>
    )
  }

  return (
    <Shell title="反馈详情" onBack={() => navigation.goBack()}>
      <NoticeBanner notice={notice} />

      <ThreadContextCard thread={thread} submission={submissionQuery.data ?? null} />

      {role === 'student' ? (
        <StudentBody
          thread={thread}
          courseId={courseId}
          onChanged={invalidateThreads}
          onDeleted={() => navigation.goBack()}
          notify={notify}
        />
      ) : (
        <TeacherBody thread={thread} onChanged={invalidateThreads} notify={notify} />
      )}
    </Shell>
  )
}

function Shell({
  title,
  onBack,
  children,
}: {
  title: string
  onBack: () => void
  children: ReactNode
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.topTitle}>{title}</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>{children}</ScrollView>
    </View>
  )
}

function ThreadContextCard({
  thread,
  submission,
}: {
  thread: FeedbackItem
  submission: SubmissionItem | null
}) {
  const answered = thread.responses.length > 0
  return (
    <View style={styles.card}>
      <View style={styles.tagRow}>
        <Text style={styles.kindTag}>{thread.kind === 'question' ? '问题' : '反馈'}</Text>
        <Text style={answered ? styles.answeredTag : styles.pendingTag}>
          {answered ? '已回答' : '未回答'}
        </Text>
      </View>
      <Text style={styles.sectionTitle}>{thread.assignmentTitle ?? '作业反馈'}</Text>
      <Text style={styles.helper}>
        发起人：{thread.studentName ?? thread.studentId}
        {thread.createdAt ? ` · ${formatDateTimeBrief(thread.createdAt)}` : ''}
      </Text>
      {submission ? (
        <View style={styles.contextBox}>
          <Text style={styles.fieldLabel}>提交内容</Text>
          <Text style={styles.body}>{submission.content}</Text>
          <View style={styles.gradeRow}>
            <Text style={styles.scoreText}>
              {submission.score == null ? '暂无分数' : `${submission.score} 分`}
            </Text>
            {submission.teacherFeedback ? (
              <Text style={styles.helper}>{submission.teacherFeedback}</Text>
            ) : (
              <Text style={styles.helper}>教师暂未填写评语。</Text>
            )}
          </View>
        </View>
      ) : null}
    </View>
  )
}

function StudentBody({
  thread,
  courseId,
  onChanged,
  onDeleted,
  notify,
}: {
  thread: FeedbackItem
  courseId: string | undefined
  onChanged: () => void
  onDeleted: () => void
  notify: (message: string, type?: 'success' | 'error' | 'info') => void
}) {
  const { session, apiBaseUrl } = useMobileAuth()
  const editable = canStudentEditFeedback(thread)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ kind: thread.kind, content: thread.content })

  useEffect(() => {
    setEditing(false)
    setDraft({ kind: thread.kind, content: thread.content })
  }, [thread.id])

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateFeedback(apiBaseUrl, session.accessToken, thread.id, draft.kind, draft.content),
    onSuccess: () => {
      notify('已更新反馈。', 'success')
      setEditing(false)
      onChanged()
    },
    onError: (error) => notify(error instanceof Error ? error.message : '修改失败', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteFeedback(apiBaseUrl, session.accessToken, thread.id),
    onSuccess: () => {
      notify('已删除反馈。', 'success')
      onChanged()
      onDeleted()
    },
    onError: (error) => notify(error instanceof Error ? error.message : '删除失败', 'error'),
  })

  function confirmDelete() {
    Alert.alert('删除反馈', '确认删除该问题/反馈吗？删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ])
  }

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>我的问题 / 反馈</Text>
        <Text style={styles.helper}>
          {editable ? '教师回复前可以修改或删除。' : '教师已回复，本条已锁定。'}
        </Text>
        {editing ? (
          <>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>类型</Text>
              <SegmentedTabs
                items={[
                  { value: 'question', label: '问题' },
                  { value: 'feedback', label: '反馈' },
                ]}
                value={draft.kind}
                onChange={(value) => setDraft((current) => ({ ...current, kind: value as FeedbackKind }))}
                variant="wrap"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>内容</Text>
              <TextInput
                multiline
                value={draft.content}
                onChangeText={(value) => setDraft((current) => ({ ...current, content: value }))}
                placeholderTextColor="#9ca3af"
                style={[styles.input, styles.inputMultiline]}
              />
            </View>
            <View style={styles.actions}>
              <Pressable
                style={[
                  styles.primaryButton,
                  draft.content.trim().length < 2 ? styles.primaryButtonDisabled : null,
                ]}
                disabled={draft.content.trim().length < 2 || updateMutation.isPending}
                onPress={() => updateMutation.mutate()}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>保存修改</Text>
                )}
              </Pressable>
              <Pressable
                style={styles.ghostButton}
                onPress={() => {
                  setEditing(false)
                  setDraft({ kind: thread.kind, content: thread.content })
                }}
              >
                <Text style={styles.ghostButtonText}>取消</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.body}>{thread.content}</Text>
            {editable ? (
              <View style={styles.actions}>
                <Pressable style={styles.ghostButton} onPress={() => setEditing(true)}>
                  <Text style={styles.ghostButtonText}>修改</Text>
                </Pressable>
                <Pressable
                  style={styles.dangerButton}
                  disabled={deleteMutation.isPending}
                  onPress={confirmDelete}
                >
                  {deleteMutation.isPending ? (
                    <ActivityIndicator color="#b91c1c" />
                  ) : (
                    <Text style={styles.dangerButtonText}>删除</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </View>

      <ResponsesList thread={thread} />
    </>
  )
}

function TeacherBody({
  thread,
  onChanged,
  notify,
}: {
  thread: FeedbackItem
  onChanged: () => void
  notify: (message: string, type?: 'success' | 'error' | 'info') => void
}) {
  const { session, apiBaseUrl } = useMobileAuth()
  const [newResponse, setNewResponse] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')

  useEffect(() => {
    setNewResponse('')
    setEditingId(null)
    setEditingContent('')
  }, [thread.id])

  const createMutation = useMutation({
    mutationFn: () => api.createResponse(apiBaseUrl, session.accessToken, thread.id, newResponse),
    onSuccess: () => {
      notify('已发布回复。', 'success')
      setNewResponse('')
      onChanged()
    },
    onError: (error) => notify(error instanceof Error ? error.message : '发布回复失败', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      api.updateResponse(apiBaseUrl, session.accessToken, id, editingContent),
    onSuccess: () => {
      notify('已更新回复。', 'success')
      setEditingId(null)
      setEditingContent('')
      onChanged()
    },
    onError: (error) => notify(error instanceof Error ? error.message : '更新回复失败', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteResponse(apiBaseUrl, session.accessToken, id),
    onSuccess: () => {
      notify('已删除回复。', 'success')
      onChanged()
    },
    onError: (error) => notify(error instanceof Error ? error.message : '删除回复失败', 'error'),
  })

  function confirmDelete(id: string) {
    Alert.alert('删除回复', '确认删除该回复吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ])
  }

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>教师回复</Text>
        {thread.responses.length === 0 ? (
          <Text style={styles.helper}>尚无回复，使用下方表单发布第一条回复。</Text>
        ) : (
          <View style={styles.responseList}>
            {thread.responses.map((response) => {
              const isMine = canTeacherEditResponse(response, session.user.id)
              const isEditing = editingId === response.id
              return (
                <View key={response.id} style={styles.responseBubble}>
                  <Text style={styles.responseTag}>
                    {response.teacherName ?? '教师'}
                    {isMine ? '（我）' : ''}
                  </Text>
                  {isEditing ? (
                    <>
                      <TextInput
                        multiline
                        value={editingContent}
                        onChangeText={setEditingContent}
                        style={[styles.input, styles.inputMultiline]}
                        placeholderTextColor="#9ca3af"
                      />
                      <View style={styles.actions}>
                        <Pressable
                          style={[
                            styles.primaryButton,
                            editingContent.trim().length < 2 ? styles.primaryButtonDisabled : null,
                          ]}
                          disabled={
                            editingContent.trim().length < 2 || updateMutation.isPending
                          }
                          onPress={() => updateMutation.mutate(response.id)}
                        >
                          {updateMutation.isPending ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.primaryButtonText}>保存</Text>
                          )}
                        </Pressable>
                        <Pressable
                          style={styles.ghostButton}
                          onPress={() => {
                            setEditingId(null)
                            setEditingContent('')
                          }}
                        >
                          <Text style={styles.ghostButtonText}>取消</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.body}>{response.content}</Text>
                      {response.createdAt ? (
                        <Text style={styles.helper}>{formatDateTimeBrief(response.createdAt)}</Text>
                      ) : null}
                      {isMine ? (
                        <View style={styles.actions}>
                          <Pressable
                            style={styles.ghostButton}
                            onPress={() => {
                              setEditingId(response.id)
                              setEditingContent(response.content)
                            }}
                          >
                            <Text style={styles.ghostButtonText}>修改</Text>
                          </Pressable>
                          <Pressable
                            style={styles.dangerButton}
                            disabled={deleteMutation.isPending}
                            onPress={() => confirmDelete(response.id)}
                          >
                            {deleteMutation.isPending ? (
                              <ActivityIndicator color="#b91c1c" />
                            ) : (
                              <Text style={styles.dangerButtonText}>删除</Text>
                            )}
                          </Pressable>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              )
            })}
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>新增回复</Text>
          <TextInput
            multiline
            value={newResponse}
            onChangeText={setNewResponse}
            placeholder="至少 2 个字"
            placeholderTextColor="#9ca3af"
            style={[styles.input, styles.inputMultiline]}
          />
        </View>
        <Pressable
          style={[
            styles.primaryButton,
            newResponse.trim().length < 2 ? styles.primaryButtonDisabled : null,
          ]}
          disabled={newResponse.trim().length < 2 || createMutation.isPending}
          onPress={() => createMutation.mutate()}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>发布回复</Text>
          )}
        </Pressable>
      </View>
    </>
  )
}

function ResponsesList({ thread }: { thread: FeedbackItem }) {
  if (thread.responses.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>教师回复</Text>
        <Text style={styles.helper}>教师回复后会显示在这里。</Text>
      </View>
    )
  }
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>教师回复</Text>
      <View style={styles.responseList}>
        {thread.responses.map((response) => (
          <View key={response.id} style={styles.responseBubble}>
            <Text style={styles.responseTag}>{response.teacherName ?? '教师'}</Text>
            <Text style={styles.body}>{response.content}</Text>
            {response.createdAt ? (
              <Text style={styles.helper}>{formatDateTimeBrief(response.createdAt)}</Text>
            ) : null}
          </View>
        ))}
      </View>
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
  tagRow: { flexDirection: 'row', gap: 6 },
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
  contextBox: {
    borderRadius: 6,
    backgroundColor: '#f4f7fb',
    padding: 10,
    gap: 6,
  },
  fieldLabel: { color: '#374151', fontWeight: '700', fontSize: 12 },
  field: { gap: 6 },
  gradeRow: { gap: 4 },
  scoreText: { color: '#7c2d12', fontWeight: '800', fontSize: 16 },
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  primaryButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#005bac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { backgroundColor: '#a4bfe0' },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
  ghostButton: {
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
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f4b8b8',
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: { color: '#b91c1c', fontWeight: '700' },
  responseList: { gap: 8 },
  responseBubble: {
    borderLeftWidth: 4,
    borderLeftColor: '#159447',
    backgroundColor: '#eaf8ef',
    borderRadius: 6,
    padding: 10,
    gap: 4,
  },
  responseTag: {
    color: '#116c35',
    fontWeight: '800',
    fontSize: 12,
  },
})
