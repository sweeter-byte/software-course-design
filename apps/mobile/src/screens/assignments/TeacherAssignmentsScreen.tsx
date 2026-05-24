import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'

import { api, extractErrorMessage } from '../../api'
import { NoticeBanner } from '../../components/feedback/NoticeBanner'
import { SegmentedTabs } from '../../components/ui/SegmentedTabs'
import { useMobileAuth } from '../../contexts/MobileAuthContext'
import { createDefaultAssignmentDates } from '../../demo-defaults'
import type { AssignmentItem, CourseItem } from '../../domain'
import { resetCourseStackTo } from '../../navigation/courseStackNav'
import type { RoleTabParamList } from '../../navigation/RoleTabs'
import {
  ASSIGNMENT_STATUS_OPTIONS,
  assignmentStatusLabel,
  deriveAssignmentStatus,
} from './assignment-status'
import {
  selectTeacherCourseForTarget,
  type TeacherCoursePickerTarget,
} from './teacher-assignments-model'

type Nav = BottomTabNavigationProp<RoleTabParamList, 'Assignments'>

type Row = {
  assignment: AssignmentItem
  course: CourseItem
}

const DEFAULT_DRAFT = () => ({
  courseId: '',
  title: '',
  description: '',
  requirement: '',
  ...createDefaultAssignmentDates(),
})

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
}

export function TeacherAssignmentsScreen() {
  const { session, apiBaseUrl, notice, notify, dismissNotice } = useMobileAuth()
  const navigation = useNavigation<Nav>()
  const queryClient = useQueryClient()

  const [courseFilter, setCourseFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [draft, setDraft] = useState(DEFAULT_DRAFT)
  const [publishOpen, setPublishOpen] = useState(false)
  const [coursePickerOpen, setCoursePickerOpen] = useState(false)
  const [coursePickerTarget, setCoursePickerTarget] =
    useState<TeacherCoursePickerTarget>('filter')
  const [nowMs] = useState(() => Date.now())

  const coursesQuery = useQuery({
    queryKey: ['mobile-teacher-courses', apiBaseUrl, session.accessToken],
    queryFn: async () => {
      const payload = await api.listCourses(apiBaseUrl, session.accessToken, {})
      return payload.items
    },
  })

  const myCourses = useMemo(
    () => (coursesQuery.data ?? []).filter((course) => course.teacherId === session.user.id),
    [coursesQuery.data, session.user.id],
  )

  // The query key ['mobile-course-assignments', ..., courseId] is shared with
  // TeacherCourseAssignmentsTab / AssignmentDetailScreen / overview tabs, which
  // all cache the bare AssignmentItem[] array. We MUST return the same shape
  // here, or React Query cache pollution makes whichever screen mounts second
  // crash (object .find vs array.items mismatches). Course context is joined
  // back via the myCourses[] index below instead of being baked into cache.
  const assignmentQueries = useQueries({
    queries: myCourses.map((course) => ({
      queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, course.id],
      queryFn: async () => {
        const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
        return payload.items
      },
    })),
  })

  const rows = useMemo<Row[]>(() => {
    const merged: Row[] = []
    assignmentQueries.forEach((query, index) => {
      if (!query.data) return
      const course = myCourses[index]
      if (!course) return
      for (const assignment of query.data) {
        merged.push({ assignment, course })
      }
    })
    return merged
      .filter((row) => (courseFilter ? row.course.id === courseFilter : true))
      .filter((row) => (statusFilter ? deriveAssignmentStatus(row.assignment, nowMs) === statusFilter : true))
      .sort((a, b) => (a.assignment.dueAt < b.assignment.dueAt ? 1 : -1))
  }, [assignmentQueries, myCourses, courseFilter, statusFilter, nowMs])

  const isLoading = coursesQuery.isLoading || assignmentQueries.some((query) => query.isLoading)
  const isRefreshing =
    !isLoading &&
    (coursesQuery.isFetching || assignmentQueries.some((query) => query.isFetching))

  function refreshAll() {
    coursesQuery.refetch()
    assignmentQueries.forEach((query) => query.refetch())
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!draft.courseId) throw new Error('请先选择课程')
      return api.createAssignment(apiBaseUrl, session.accessToken, draft.courseId, {
        title: draft.title,
        description: draft.description,
        requirement: draft.requirement,
        startAt: draft.startAt,
        dueAt: draft.dueAt,
      })
    },
    onSuccess: (payload) => {
      notify('作业已发布。', 'success')
      const courseId = payload.assignment.courseId ?? draft.courseId
      const assignmentId = payload.assignment.id
      queryClient.invalidateQueries({ queryKey: ['mobile-course-assignments', apiBaseUrl, session.accessToken, courseId] })
      setPublishOpen(false)
      setDraft(DEFAULT_DRAFT())
      if (assignmentId && courseId) {
        resetCourseStackTo(navigation, [
          { name: 'CourseList' },
          { name: 'CourseWorkspace', params: { courseId } },
          { name: 'AssignmentDetail', params: { assignmentId, courseId } },
        ])
      }
    },
    onError: (error) => notify(extractErrorMessage(error), 'error'),
  })

  const selectedCourse = useMemo(
    () => myCourses.find((course) => course.id === draft.courseId) ?? null,
    [myCourses, draft.courseId],
  )

  function openAssignment(row: Row) {
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
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.sectionTitle}>作业管理</Text>
            <Text style={styles.helper}>跨课程汇总本人发布的作业。</Text>
          </View>
          <Pressable style={styles.primaryButton} onPress={() => setPublishOpen(true)}>
            <Text style={styles.primaryButtonText}>发布作业</Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>按课程</Text>
          <Pressable
            style={styles.input}
            onPress={() => {
              setCoursePickerTarget('filter')
              setCoursePickerOpen(true)
            }}
          >
            <Text style={courseFilter ? styles.inputValue : styles.inputPlaceholder}>
              {courseFilter
                ? myCourses.find((course) => course.id === courseFilter)?.courseName ?? '全部课程'
                : '全部课程 · 点击筛选'}
            </Text>
          </Pressable>
          {courseFilter ? (
            <Pressable style={styles.linkButton} onPress={() => setCourseFilter('')}>
              <Text style={styles.linkText}>清除课程筛选</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>按状态</Text>
          <SegmentedTabs items={ASSIGNMENT_STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
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
              <Text style={styles.statusTag}>{assignmentStatusLabel(item.assignment, nowMs)}</Text>
            </Pressable>
          )}
        />
      )}

      {/* Course picker modal (filter) */}
      <Modal
        visible={coursePickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCoursePickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHead}>
              <Text style={styles.sectionTitle}>
                {coursePickerTarget === 'publish' ? '选择发布课程' : '选择筛选课程'}
              </Text>
              <Pressable onPress={() => setCoursePickerOpen(false)}>
                <Text style={styles.modalClose}>关闭</Text>
              </Pressable>
            </View>
            <FlatList
              data={myCourses}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.helper}>暂无授课课程。</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.modalRow,
                    (coursePickerTarget === 'publish' ? draft.courseId : courseFilter) === item.id
                      ? styles.modalRowActive
                      : null,
                  ]}
                  onPress={() => {
                    const next = selectTeacherCourseForTarget(coursePickerTarget, item.id, {
                      courseFilter,
                      draft,
                    })
                    setCourseFilter(next.courseFilter)
                    setDraft(next.draft)
                    setCoursePickerOpen(false)
                  }}
                >
                  <Text style={styles.modalRowTitle}>{item.courseName}</Text>
                  <Text style={styles.helper}>{item.courseCode} · {item.semester}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Publish modal */}
      <Modal
        visible={publishOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPublishOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHead}>
              <Text style={styles.sectionTitle}>发布作业</Text>
              <Pressable onPress={() => setPublishOpen(false)}>
                <Text style={styles.modalClose}>关闭</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.publishForm}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>目标课程</Text>
                <Pressable
                  style={styles.input}
                  onPress={() => {
                    setCoursePickerTarget('publish')
                    setCoursePickerOpen(true)
                  }}
                >
                  <Text style={selectedCourse ? styles.inputValue : styles.inputPlaceholder}>
                    {selectedCourse ? selectedCourse.courseName : '点击选择目标课程'}
                  </Text>
                </Pressable>
                {myCourses.length === 0 ? (
                  <Text style={styles.errorHint}>当前账号尚未授课课程，无法发布作业。</Text>
                ) : null}
                <View style={styles.suggestionsRow}>
                  {myCourses.map((course) => (
                    <Pressable
                      key={course.id}
                      style={[
                        styles.suggestion,
                        draft.courseId === course.id ? styles.suggestionActive : null,
                      ]}
                      onPress={() => setDraft((current) => ({ ...current, courseId: course.id }))}
                    >
                      <Text
                        style={[
                          styles.suggestionText,
                          draft.courseId === course.id ? styles.suggestionTextActive : null,
                        ]}
                      >
                        {course.courseName}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <FormField label="作业标题" value={draft.title} onChange={(value) => setDraft((current) => ({ ...current, title: value }))} />
              <FormField
                label="作业描述"
                value={draft.description}
                multiline
                onChange={(value) => setDraft((current) => ({ ...current, description: value }))}
              />
              <FormField
                label="提交要求"
                value={draft.requirement}
                multiline
                onChange={(value) => setDraft((current) => ({ ...current, requirement: value }))}
              />
              <FormField
                label="开始时间 (ISO)"
                value={draft.startAt}
                onChange={(value) => setDraft((current) => ({ ...current, startAt: value }))}
              />
              <FormField
                label="截止时间 (ISO)"
                value={draft.dueAt}
                onChange={(value) => setDraft((current) => ({ ...current, dueAt: value }))}
              />

              <Pressable
                style={[
                  styles.primaryButton,
                  !draft.courseId || !draft.title.trim() || !draft.description.trim() ? styles.primaryButtonDisabled : null,
                ]}
                disabled={
                  !draft.courseId ||
                  !draft.title.trim() ||
                  !draft.description.trim() ||
                  createMutation.isPending
                }
                onPress={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>发布到课程</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function FormField({
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
  container: { flex: 1, gap: 12, padding: 16 },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titleCopy: { flex: 1, gap: 2 },
  sectionTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
  helper: { color: '#6b7280', lineHeight: 20 },
  errorHint: { color: '#b91c1c', fontSize: 12 },
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
    justifyContent: 'center',
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  inputValue: { color: '#111827' },
  inputPlaceholder: { color: '#9ca3af' },
  linkButton: { alignSelf: 'flex-start', paddingVertical: 4 },
  linkText: { color: '#005bac', fontWeight: '700' },
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
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#005bac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { backgroundColor: '#a4bfe0' },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
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
  statusTag: {
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
  statePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
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
  modalRow: { paddingVertical: 12, paddingHorizontal: 8, borderRadius: 6, gap: 2 },
  modalRowActive: { backgroundColor: '#eaf3ff' },
  modalRowTitle: { color: '#111827', fontWeight: '800' },
  publishForm: { gap: 10, paddingBottom: 24 },
})
