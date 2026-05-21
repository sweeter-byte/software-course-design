import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { api } from '../../../api'
import { useMobileAuth } from '../../../contexts/MobileAuthContext'
import { createDefaultAssignmentDates } from '../../../demo-defaults'
import type { AssignmentItem, CourseItem } from '../../../domain'
import type { CourseStackParamList } from '../../../navigation/CourseStack'
import { assignmentStatusLabel } from '../../assignments/assignment-status'

type Nav = NativeStackNavigationProp<CourseStackParamList, 'CourseWorkspace'>

const DEFAULT_DRAFT = () => ({
  title: '',
  description: '',
  requirement: '',
  ...createDefaultAssignmentDates(),
})

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
}

export function TeacherCourseAssignmentsTab({ course }: { course: CourseItem }) {
  const navigation = useNavigation<Nav>()
  const { session, apiBaseUrl, notify } = useMobileAuth()
  const queryClient = useQueryClient()
  const [nowMs] = useState(() => Date.now())
  const [draft, setDraft] = useState(DEFAULT_DRAFT)
  const [publishOpen, setPublishOpen] = useState(false)

  const assignmentsQuery = useQuery({
    queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return payload.items
    },
  })

  const sorted = useMemo(
    () =>
      [...(assignmentsQuery.data ?? [])].sort((a, b) => (a.dueAt < b.dueAt ? 1 : -1)),
    [assignmentsQuery.data],
  )

  const createMutation = useMutation({
    mutationFn: () =>
      api.createAssignment(apiBaseUrl, session.accessToken, course.id, {
        title: draft.title,
        description: draft.description,
        requirement: draft.requirement,
        startAt: draft.startAt,
        dueAt: draft.dueAt,
      }),
    onSuccess: (payload) => {
      notify('作业已发布。', 'success')
      queryClient.invalidateQueries({
        queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, course.id],
      })
      setPublishOpen(false)
      setDraft(DEFAULT_DRAFT())
      if (payload.assignment.id) {
        navigation.navigate('AssignmentDetail', {
          assignmentId: payload.assignment.id,
          courseId: course.id,
        })
      }
    },
    onError: (error) => notify(error instanceof Error ? error.message : '发布作业失败', 'error'),
  })

  function open(assignment: AssignmentItem) {
    navigation.navigate('AssignmentDetail', { assignmentId: assignment.id, courseId: course.id })
  }

  const disablePublish =
    !draft.title.trim() || !draft.description.trim() || !draft.requirement.trim()

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headRow}>
          <Text style={styles.sectionTitle}>课程作业</Text>
          <Pressable style={styles.primaryButton} onPress={() => setPublishOpen(true)}>
            <Text style={styles.primaryButtonText}>发布作业</Text>
          </Pressable>
        </View>

        {assignmentsQuery.isLoading ? (
          <ActivityIndicator color="#005bac" />
        ) : sorted.length === 0 ? (
          <Text style={styles.helper}>该课程暂未发布作业，可点击右上角「发布作业」。</Text>
        ) : (
          <View style={styles.list}>
            {sorted.map((assignment) => (
              <Pressable key={assignment.id} style={styles.row} onPress={() => open(assignment)}>
                <Text style={styles.rowTitle}>{assignment.title}</Text>
                <Text style={styles.helper}>截止 {formatDateTimeBrief(assignment.dueAt)}</Text>
                <Text style={styles.tag}>{assignmentStatusLabel(assignment, nowMs)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Modal
        visible={publishOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPublishOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHead}>
              <Text style={styles.sectionTitle}>发布到 {course.courseName}</Text>
              <Pressable onPress={() => setPublishOpen(false)}>
                <Text style={styles.modalClose}>关闭</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.publishForm}>
              <Field label="标题" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
              <Field
                label="描述"
                value={draft.description}
                multiline
                onChange={(value) => setDraft((current) => ({ ...current, description: value }))}
              />
              <Field
                label="提交要求"
                value={draft.requirement}
                multiline
                onChange={(value) => setDraft((current) => ({ ...current, requirement: value }))}
              />
              <Field
                label="开始时间 (ISO)"
                value={draft.startAt}
                onChange={(value) => setDraft((current) => ({ ...current, startAt: value }))}
              />
              <Field
                label="截止时间 (ISO)"
                value={draft.dueAt}
                onChange={(value) => setDraft((current) => ({ ...current, dueAt: value }))}
              />
              <Pressable
                style={[styles.primaryButton, disablePublish ? styles.primaryButtonDisabled : null]}
                disabled={disablePublish || createMutation.isPending}
                onPress={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>发布作业</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  multiline?: boolean
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholderTextColor="#9ca3af"
        style={[styles.input, multiline ? styles.inputMultiline : null]}
      />
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
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
  helper: { color: '#6b7280', lineHeight: 20 },
  list: { gap: 8 },
  row: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#eef1f6',
    padding: 10,
    gap: 4,
  },
  rowTitle: { color: '#111827', fontWeight: '800' },
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
  primaryButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#005bac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { backgroundColor: '#a4bfe0' },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.36)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 10,
    maxHeight: '90%',
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalClose: { color: '#005bac', fontWeight: '800' },
  publishForm: { gap: 10, paddingBottom: 24 },
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
})
