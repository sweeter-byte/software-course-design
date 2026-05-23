import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, extractErrorMessage } from '../../../api'
import { SegmentedTabs } from '../../../components/ui/SegmentedTabs'
import { useMobileAuth } from '../../../contexts/MobileAuthContext'
import type { CourseFeedbackDimension, CourseFeedbackItem, CourseItem } from '../../../domain'
import {
  getCourseFeedbackInvalidationKeys,
  invalidateQueryKeys,
} from '../../../query-invalidation'

const DIMENSION_LABELS: Record<CourseFeedbackDimension, string> = {
  content: '课程内容',
  method: '教学方法',
  teaching: '教师授课',
  gain: '学习收获',
  other: '其他建议',
}

const DIMENSION_OPTIONS = (Object.keys(DIMENSION_LABELS) as CourseFeedbackDimension[]).map(
  (value) => ({ value, label: DIMENSION_LABELS[value] }),
)

type Draft = { dimension: CourseFeedbackDimension; content: string }

const DEFAULT_DRAFT: Draft = { dimension: 'teaching', content: '' }

export function CourseFeedbacksOverallTab({ course }: { course: CourseItem }) {
  const { session, apiBaseUrl, notify } = useMobileAuth()
  const queryClient = useQueryClient()
  const role = session.user.role
  const canEdit = role === 'student'

  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)

  const feedbacksQuery = useQuery<CourseFeedbackItem[]>({
    queryKey: ['mobile-course-feedbacks', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listCourseFeedbacks(apiBaseUrl, session.accessToken, course.id)
      return payload.items
    },
  })

  const invalidate = () => {
    invalidateQueryKeys(
      queryClient,
      getCourseFeedbackInvalidationKeys(apiBaseUrl, session.accessToken, course.id),
    )
  }

  const createMutation = useMutation({
    mutationFn: () => api.createCourseFeedback(apiBaseUrl, session.accessToken, course.id, draft),
    onSuccess: () => {
      setDraft(DEFAULT_DRAFT)
      notify('已提交课程整体反馈。', 'success')
      invalidate()
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error('missing-editing-id')
      return api.updateCourseFeedback(apiBaseUrl, session.accessToken, editingId, draft)
    },
    onSuccess: () => {
      setDraft(DEFAULT_DRAFT)
      setEditingId(null)
      notify('已更新课程反馈。', 'success')
      invalidate()
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCourseFeedback(apiBaseUrl, session.accessToken, id),
    onSuccess: () => {
      notify('已删除课程反馈。', 'success')
      invalidate()
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  const allFeedbacks = feedbacksQuery.data ?? []
  const myFeedbacks = useMemo(
    () => allFeedbacks.filter((item) => item.studentId === session.user.id),
    [allFeedbacks, session.user.id],
  )

  const groupedForReadonly = useMemo(() => {
    const groups = new Map<CourseFeedbackDimension, CourseFeedbackItem[]>()
    for (const item of allFeedbacks) {
      const bucket = groups.get(item.dimension) ?? []
      bucket.push(item)
      groups.set(item.dimension, bucket)
    }
    return Array.from(groups.entries())
  }, [allFeedbacks])

  function startEdit(item: CourseFeedbackItem) {
    setEditingId(item.id)
    setDraft({ dimension: item.dimension, content: item.content })
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(DEFAULT_DRAFT)
  }

  function confirmDelete(id: string) {
    Alert.alert('删除课程反馈', '确认删除该课程反馈吗？删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ])
  }

  if (canEdit) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {editingId ? '修改课程整体反馈' : '提交课程整体反馈'}
          </Text>
          <Text style={styles.helper}>按维度提交对本课程的整体看法，可多次提交。</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>反馈维度</Text>
            <SegmentedTabs
              items={DIMENSION_OPTIONS}
              value={draft.dimension}
              onChange={(value) => setDraft((current) => ({ ...current, dimension: value }))}
              variant="wrap"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>反馈内容</Text>
            <TextInput
              multiline
              value={draft.content}
              onChangeText={(value) => setDraft((current) => ({ ...current, content: value }))}
              placeholder="不少于 2 个字"
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
              disabled={
                draft.content.trim().length < 2 || createMutation.isPending || updateMutation.isPending
              }
              onPress={() => (editingId ? updateMutation.mutate() : createMutation.mutate())}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{editingId ? '保存修改' : '提交反馈'}</Text>
              )}
            </Pressable>
            {editingId ? (
              <Pressable style={styles.ghostButton} onPress={cancelEdit}>
                <Text style={styles.ghostButtonText}>取消修改</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>我的课程反馈</Text>
          {feedbacksQuery.isLoading ? (
            <ActivityIndicator color="#005bac" />
          ) : myFeedbacks.length === 0 ? (
            <Text style={styles.helper}>还未提交课程反馈。</Text>
          ) : (
            <View style={styles.list}>
              {myFeedbacks.map((item) => (
                <View key={item.id} style={styles.listItem}>
                  <Text style={styles.tag}>{DIMENSION_LABELS[item.dimension]}</Text>
                  <Text style={styles.body}>{item.content}</Text>
                  {item.createdAt ? (
                    <Text style={styles.helper}>提交于 {formatDateTimeBrief(item.createdAt)}</Text>
                  ) : null}
                  <View style={styles.actions}>
                    <Pressable style={styles.ghostButton} onPress={() => startEdit(item)}>
                      <Text style={styles.ghostButtonText}>修改</Text>
                    </Pressable>
                    <Pressable style={styles.dangerButton} onPress={() => confirmDelete(item.id)}>
                      <Text style={styles.dangerButtonText}>删除</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>课程整体反馈（只读）</Text>
        <Text style={styles.helper}>按维度分组展示当前课程学生提交的反馈。</Text>
        {feedbacksQuery.isLoading ? (
          <ActivityIndicator color="#005bac" />
        ) : groupedForReadonly.length === 0 ? (
          <Text style={styles.helper}>该课程暂无学生反馈。</Text>
        ) : (
          groupedForReadonly.map(([dimension, items]) => (
            <View key={dimension} style={styles.group}>
              <Text style={styles.groupTitle}>{DIMENSION_LABELS[dimension]}（{items.length}）</Text>
              <View style={styles.list}>
                {items.map((item) => (
                  <View key={item.id} style={styles.listItem}>
                    <Text style={styles.body}>{item.content}</Text>
                    <Text style={styles.helper}>
                      {(item.studentName ?? item.studentId) +
                        (item.createdAt ? ` · ${formatDateTimeBrief(item.createdAt)}` : '')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  )
}

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
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
  list: { gap: 8 },
  listItem: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#eef1f6',
    padding: 10,
    gap: 4,
  },
  tag: {
    alignSelf: 'flex-start',
    color: '#004080',
    backgroundColor: '#eaf3ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  group: { gap: 6 },
  groupTitle: { color: '#374151', fontWeight: '800' },
})
