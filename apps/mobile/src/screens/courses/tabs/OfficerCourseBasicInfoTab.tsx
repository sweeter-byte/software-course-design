import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { api } from '../../../api'
import { SegmentedTabs } from '../../../components/ui/SegmentedTabs'
import { useMobileAuth } from '../../../contexts/MobileAuthContext'
import type {
  AdminUserItem,
  AssignmentItem,
  CourseFeedbackItem,
  CourseItem,
  CourseOptions,
  FeedbackItem,
  SubmissionItem,
} from '../../../domain'
import type { CourseStackParamList } from '../../../navigation/CourseStack'

type StackNav = NativeStackNavigationProp<CourseStackParamList, 'CourseWorkspace'>

const STATUS_OPTIONS = [
  { value: 'not_started', label: '未开始' },
  { value: 'active', label: '开课中' },
  { value: 'completed', label: '已结课' },
  { value: 'suspended', label: '暂停' },
]

type Draft = {
  courseCode: string
  courseName: string
  teacherId: string
  semester: string
  description: string
  location: string
  scheduleText: string
  capacity: string
  startDate: string
  endDate: string
  status: string
}

function toDraft(course: CourseItem): Draft {
  return {
    courseCode: course.courseCode,
    courseName: course.courseName,
    teacherId: course.teacherId,
    semester: course.semester,
    description: course.description ?? '',
    location: course.location ?? '',
    scheduleText: course.scheduleText ?? '',
    capacity: String(course.capacity ?? ''),
    startDate: course.startDate ?? '',
    endDate: course.endDate ?? '',
    status: course.status,
  }
}

export function OfficerCourseBasicInfoTab({ course }: { course: CourseItem }) {
  const { session, apiBaseUrl, notify } = useMobileAuth()
  const queryClient = useQueryClient()
  const navigation = useNavigation<StackNav>()

  const [draft, setDraft] = useState<Draft>(() => toDraft(course))
  const [draftCourseId, setDraftCourseId] = useState<string>(course.id)
  const [teacherPickerOpen, setTeacherPickerOpen] = useState(false)

  useEffect(() => {
    if (draftCourseId !== course.id) {
      setDraftCourseId(course.id)
      setDraft(toDraft(course))
    }
  }, [course, draftCourseId])

  const teachersQuery = useQuery<AdminUserItem[]>({
    queryKey: ['mobile-teacher-options', apiBaseUrl, session.accessToken],
    queryFn: async () => {
      const payload = await api.listAdminUsers(apiBaseUrl, session.accessToken, 'teacher')
      return payload.users
    },
  })

  const courseOptionsQuery = useQuery<CourseOptions>({
    queryKey: ['mobile-course-options', apiBaseUrl, session.accessToken],
    queryFn: async () => api.listCourseOptions(apiBaseUrl, session.accessToken),
  })

  const assignmentsQuery = useQuery<AssignmentItem[]>({
    queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return payload.items
    },
  })

  const courseFeedbacksQuery = useQuery<CourseFeedbackItem[]>({
    queryKey: ['mobile-course-feedbacks', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listCourseFeedbacks(apiBaseUrl, session.accessToken, course.id)
      return payload.items
    },
  })

  const feedbackThreadsQuery = useQuery<FeedbackItem[]>({
    queryKey: ['mobile-feedback-threads', apiBaseUrl, session.accessToken, course.id, 'officer'],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {
        courseId: course.id,
      })
      return payload.items
    },
  })

  const assignments = assignmentsQuery.data ?? []

  const submissionQueries = useQueries({
    queries: assignments.map((assignment) => ({
      queryKey: ['mobile-submissions', apiBaseUrl, session.accessToken, assignment.id],
      queryFn: async () => {
        const payload = await api.listSubmissions(apiBaseUrl, session.accessToken, assignment.id)
        return payload.items as SubmissionItem[]
      },
    })),
  })

  const submissionTotal = submissionQueries.reduce(
    (acc, query) => acc + (query.data?.length ?? 0),
    0,
  )

  const updateMutation = useMutation({
    mutationFn: () => {
      const capacityNumber = Number(draft.capacity)
      return api.updateCourse(apiBaseUrl, session.accessToken, course.id, {
        ...draft,
        capacity: Number.isFinite(capacityNumber) ? capacityNumber : 0,
      })
    },
    onSuccess: () => {
      notify('课程基础信息已更新。', 'success')
      queryClient.invalidateQueries({ queryKey: ['mobile-course-detail', apiBaseUrl, session.accessToken, course.id] })
      queryClient.invalidateQueries({ queryKey: ['mobile-course-list'] })
    },
    onError: (error) => notify(error instanceof Error ? error.message : '保存课程信息失败', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteCourse(apiBaseUrl, session.accessToken, course.id),
    onSuccess: () => {
      notify('课程已删除。', 'success')
      queryClient.invalidateQueries({ queryKey: ['mobile-course-list'] })
      navigation.popToTop()
    },
    onError: (error) => notify(error instanceof Error ? error.message : '删除课程失败', 'error'),
  })

  const impactReady =
    !assignmentsQuery.isLoading &&
    !courseFeedbacksQuery.isLoading &&
    !feedbackThreadsQuery.isLoading &&
    submissionQueries.every((query) => !query.isLoading)

  const teacherList = teachersQuery.data ?? []
  const selectedTeacher = useMemo(
    () => teacherList.find((teacher) => teacher.id === draft.teacherId) ?? null,
    [teacherList, draft.teacherId],
  )

  const semesterSuggestions = courseOptionsQuery.data?.semesters ?? []
  const locationSuggestions = courseOptionsQuery.data?.locations ?? []

  function confirmDelete() {
    const summary =
      `确认删除课程「${course.courseName}」吗？\n此操作将同步删除：` +
      `\n· 关联作业 ${assignments.length} 条` +
      `\n· 关联提交 ${submissionTotal} 条` +
      `\n· 作业反馈线程 ${feedbackThreadsQuery.data?.length ?? 0} 条` +
      `\n· 课程整体反馈 ${courseFeedbacksQuery.data?.length ?? 0} 条` +
      `\n删除后无法恢复。`
    Alert.alert('删除课程', summary, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ])
  }

  function confirmUpdate() {
    Alert.alert('保存课程信息', '确认保存当前修改吗？', [
      { text: '取消', style: 'cancel' },
      { text: '保存', onPress: () => updateMutation.mutate() },
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>基础信息维护</Text>
        <Text style={styles.helper}>修改完成后会触发二次确认。</Text>

        <FormField label="课程代码" value={draft.courseCode} onChange={(value) => setDraft((current) => ({ ...current, courseCode: value }))} />
        <FormField label="课程名称" value={draft.courseName} onChange={(value) => setDraft((current) => ({ ...current, courseName: value }))} />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>授课教师</Text>
          <Pressable style={styles.input} onPress={() => setTeacherPickerOpen(true)}>
            <Text style={selectedTeacher ? styles.inputValue : styles.inputPlaceholder}>
              {selectedTeacher
                ? `${selectedTeacher.realName}${selectedTeacher.teacherNo ? ` (${selectedTeacher.teacherNo})` : ''}`
                : '点击选择教师'}
            </Text>
          </Pressable>
          {!selectedTeacher && draft.teacherId ? (
            <Text style={styles.errorHint}>
              当前 teacherId 不在教师列表中：{draft.teacherId}
            </Text>
          ) : null}
        </View>

        <FormField
          label="开课学期"
          value={draft.semester}
          onChange={(value) => setDraft((current) => ({ ...current, semester: value }))}
        />
        {semesterSuggestions.length > 0 ? (
          <View style={styles.suggestionsRow}>
            {semesterSuggestions.map((value) => (
              <Pressable
                key={value}
                style={[styles.suggestion, draft.semester === value ? styles.suggestionActive : null]}
                onPress={() => setDraft((current) => ({ ...current, semester: value }))}
              >
                <Text style={[styles.suggestionText, draft.semester === value ? styles.suggestionTextActive : null]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <FormField
          label="上课地点"
          value={draft.location}
          onChange={(value) => setDraft((current) => ({ ...current, location: value }))}
        />
        {locationSuggestions.length > 0 ? (
          <View style={styles.suggestionsRow}>
            {locationSuggestions.map((value) => (
              <Pressable
                key={value}
                style={[styles.suggestion, draft.location === value ? styles.suggestionActive : null]}
                onPress={() => setDraft((current) => ({ ...current, location: value }))}
              >
                <Text style={[styles.suggestionText, draft.location === value ? styles.suggestionTextActive : null]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <FormField
          label="上课时间"
          value={draft.scheduleText}
          onChange={(value) => setDraft((current) => ({ ...current, scheduleText: value }))}
        />
        <FormField
          label="人数上限"
          value={draft.capacity}
          keyboardType="number-pad"
          onChange={(value) => setDraft((current) => ({ ...current, capacity: value }))}
        />
        <FormField
          label="开课日期 (YYYY-MM-DD)"
          value={draft.startDate}
          onChange={(value) => setDraft((current) => ({ ...current, startDate: value }))}
        />
        <FormField
          label="结课日期 (YYYY-MM-DD)"
          value={draft.endDate}
          onChange={(value) => setDraft((current) => ({ ...current, endDate: value }))}
        />
        <FormField
          label="课程简介"
          value={draft.description}
          multiline
          onChange={(value) => setDraft((current) => ({ ...current, description: value }))}
        />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>课程状态</Text>
          <SegmentedTabs
            items={STATUS_OPTIONS}
            value={draft.status}
            onChange={(value) => setDraft((current) => ({ ...current, status: value }))}
            variant="wrap"
          />
        </View>

        <Pressable style={styles.primaryButton} onPress={confirmUpdate} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>保存修改</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>删除课程</Text>
        <Text style={styles.helper}>删除会级联清除该课程下的所有选课、作业、提交、反馈、课程反馈。</Text>
        {impactReady ? (
          <View style={styles.impactList}>
            <ImpactRow label="关联作业" value={assignments.length} />
            <ImpactRow label="关联提交" value={submissionTotal} />
            <ImpactRow label="作业反馈线程" value={feedbackThreadsQuery.data?.length ?? 0} />
            <ImpactRow label="课程整体反馈" value={courseFeedbacksQuery.data?.length ?? 0} />
          </View>
        ) : (
          <View style={styles.impactLoading}>
            <ActivityIndicator color="#005bac" />
            <Text style={styles.helper}>正在汇总影响范围…</Text>
          </View>
        )}
        <Pressable
          style={[styles.dangerButton, !impactReady ? styles.dangerButtonDisabled : null]}
          disabled={!impactReady || deleteMutation.isPending}
          onPress={confirmDelete}
        >
          {deleteMutation.isPending ? (
            <ActivityIndicator color="#b91c1c" />
          ) : (
            <Text style={styles.dangerButtonText}>删除课程</Text>
          )}
        </Pressable>
      </View>

      <TeacherPickerModal
        visible={teacherPickerOpen}
        teachers={teacherList}
        selectedTeacherId={draft.teacherId}
        isLoading={teachersQuery.isLoading}
        onClose={() => setTeacherPickerOpen(false)}
        onSelect={(teacherId) => {
          setDraft((current) => ({ ...current, teacherId }))
          setTeacherPickerOpen(false)
        }}
      />
    </View>
  )
}

function FormField({
  label,
  value,
  onChange,
  multiline,
  keyboardType,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  multiline?: boolean
  keyboardType?: 'default' | 'number-pad'
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor="#9ca3af"
        style={[styles.input, multiline ? styles.inputMultiline : null]}
      />
    </View>
  )
}

function ImpactRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.impactRow}>
      <Text style={styles.impactLabel}>{label}</Text>
      <Text style={styles.impactValue}>{value} 条</Text>
    </View>
  )
}

type TeacherPickerModalProps = {
  visible: boolean
  teachers: AdminUserItem[]
  selectedTeacherId: string
  isLoading: boolean
  onClose: () => void
  onSelect: (teacherId: string) => void
}

function TeacherPickerModal({
  visible,
  teachers,
  selectedTeacherId,
  isLoading,
  onClose,
  onSelect,
}: TeacherPickerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHead}>
            <Text style={styles.sectionTitle}>选择授课教师</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.modalClose}>关闭</Text>
            </Pressable>
          </View>
          {isLoading ? (
            <ActivityIndicator color="#005bac" />
          ) : (
            <FlatList
              data={teachers}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.helper}>暂无可选择的教师账号。</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.teacherRow,
                    selectedTeacherId === item.id ? styles.teacherRowActive : null,
                  ]}
                  onPress={() => onSelect(item.id)}
                >
                  <Text style={styles.teacherName}>{item.realName}</Text>
                  <Text style={styles.helper}>
                    {item.teacherNo ? `工号 ${item.teacherNo}` : item.id} · {item.phone}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
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
  field: { gap: 6 },
  fieldLabel: { color: '#374151', fontWeight: '700', fontSize: 12 },
  errorHint: { color: '#b91c1c', fontSize: 12 },
  input: {
    minHeight: 40,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#fbfcfe',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111827',
    justifyContent: 'center',
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  inputValue: { color: '#111827' },
  inputPlaceholder: { color: '#9ca3af' },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestion: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#bfd0e5',
    backgroundColor: '#f4f7fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionActive: { backgroundColor: '#005bac', borderColor: '#004080' },
  suggestionText: { color: '#004080', fontSize: 12, fontWeight: '700' },
  suggestionTextActive: { color: '#ffffff' },
  primaryButton: {
    minHeight: 44,
    borderRadius: 6,
    backgroundColor: '#005bac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
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
  impactList: { gap: 4 },
  impactRow: { flexDirection: 'row', justifyContent: 'space-between' },
  impactLabel: { color: '#374151' },
  impactValue: { color: '#111827', fontWeight: '800' },
  impactLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.36)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 10,
    maxHeight: '80%',
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalClose: { color: '#005bac', fontWeight: '800' },
  teacherRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 3,
  },
  teacherRowActive: { backgroundColor: '#eaf3ff' },
  teacherName: { color: '#111827', fontWeight: '800' },
})
