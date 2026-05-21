import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { ApiError, api } from '../../api'
import { NoticeBanner } from '../../components/feedback/NoticeBanner'
import { SegmentedTabs } from '../../components/ui/SegmentedTabs'
import { useMobileAuth } from '../../contexts/MobileAuthContext'
import type {
  AdminUserItem,
  CourseFilters,
  CourseItem,
  CourseOptions,
  UserRole,
} from '../../domain'
import type { CourseStackParamList } from '../../navigation/CourseStack'
import {
  getCourseEnrollmentInvalidationKeys,
  invalidateQueryKeys,
} from '../../query-invalidation'
import {
  COURSE_STATUS_OPTIONS,
  EMPTY_COURSE_LIST_DRAFT,
  applyClientCourseFilters,
  buildServerCourseFilters,
  getCourseStatusLabel,
} from './course-list-model'

type ListNavigation = NativeStackNavigationProp<CourseStackParamList, 'CourseList'>

const ROLE_TITLES: Record<UserRole, string> = {
  student: '我的课程',
  teacher: '授课课程',
  officer: '课程运营',
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  student: '查找可加入的课程，或进入已加入课程的工作区。',
  teacher: '展示本账号授课课程，进入课程工作区处理作业与反馈。',
  officer: '维护课程基础信息，进入课程工作区查看运营状态。',
}

export function CourseListScreen() {
  const navigation = useNavigation<ListNavigation>()
  const { session, apiBaseUrl, notice, notify } = useMobileAuth()
  const queryClient = useQueryClient()
  const role = session.user.role

  const [draft, setDraft] = useState(EMPTY_COURSE_LIST_DRAFT)
  const [teacherPickerOpen, setTeacherPickerOpen] = useState(false)

  const serverFilters: CourseFilters = useMemo(() => buildServerCourseFilters(role, draft), [role, draft])

  const coursesQuery = useQuery({
    queryKey: ['mobile-course-list', apiBaseUrl, session.accessToken, role, serverFilters],
    queryFn: async () => {
      const payload = await api.listCourses(apiBaseUrl, session.accessToken, serverFilters)
      return payload.items
    },
  })

  const courseOptionsQuery = useQuery<CourseOptions>({
    enabled: role !== 'teacher',
    queryKey: ['mobile-course-options', apiBaseUrl, session.accessToken],
    queryFn: async () => {
      const payload = await api.listCourseOptions(apiBaseUrl, session.accessToken)
      return payload
    },
  })

  const teachersQuery = useQuery<AdminUserItem[]>({
    enabled: role === 'officer',
    queryKey: ['mobile-teacher-options', apiBaseUrl, session.accessToken],
    queryFn: async () => {
      const payload = await api.listAdminUsers(apiBaseUrl, session.accessToken, 'teacher')
      return payload.users
    },
  })

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => api.enrollCourse(apiBaseUrl, session.accessToken, courseId),
    onSuccess: (_data, courseId) => {
      notify('已加入课程，进入课程工作区继续学习。', 'success')
      invalidateQueryKeys(queryClient, getCourseEnrollmentInvalidationKeys())
      navigation.navigate('CourseWorkspace', { courseId })
    },
    onError: (error) => {
      if (error instanceof ApiError && (error.code === 'ALREADY_ENROLLED' || error.message.includes('already_enrolled'))) {
        notify('你已加入该课程。', 'info')
        queryClient.invalidateQueries({ queryKey: ['mobile-course-list'] })
        return
      }
      notify(error instanceof Error ? error.message : '加入课程失败', 'error')
    },
  })

  const courses = useMemo(
    () => applyClientCourseFilters(role, draft, role === 'teacher' ? session.user.id : null, coursesQuery.data ?? []),
    [role, draft, session.user.id, coursesQuery.data],
  )

  const semesterSuggestions = courseOptionsQuery.data?.semesters ?? []
  const teachers = teachersQuery.data ?? []
  const selectedTeacher = teachers.find((teacher) => teacher.id === draft.teacherId) ?? null

  function handleCoursePress(course: CourseItem) {
    navigation.navigate('CourseWorkspace', { courseId: course.id })
  }

  function handleEnroll(course: CourseItem) {
    if (course.enrolled) {
      navigation.navigate('CourseWorkspace', { courseId: course.id })
      return
    }
    Alert.alert(course.courseName, '确认加入这门课程吗？', [
      { text: '取消', style: 'cancel' },
      { text: '加入', onPress: () => enrollMutation.mutate(course.id) },
    ])
  }

  return (
    <View style={styles.container}>
      <NoticeBanner notice={notice} />
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.sectionTitle}>{ROLE_TITLES[role]}</Text>
            <Text style={styles.helper}>{ROLE_DESCRIPTIONS[role]}</Text>
          </View>
          {role === 'officer' ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() => navigation.navigate('CourseCreate')}
            >
              <Text style={styles.primaryButtonText}>新建课程</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>关键字</Text>
          <TextInput
            placeholder="按课程名称 / 课程代码"
            placeholderTextColor="#9ca3af"
            value={draft.keyword}
            onChangeText={(value) => setDraft((current) => ({ ...current, keyword: value }))}
            style={styles.input}
          />
        </View>

        {role !== 'teacher' ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>学期</Text>
            <TextInput
              placeholder="例如 2026 春"
              placeholderTextColor="#9ca3af"
              value={draft.semester}
              onChangeText={(value) => setDraft((current) => ({ ...current, semester: value }))}
              style={styles.input}
            />
            {semesterSuggestions.length > 0 ? (
              <View style={styles.chipRow}>
                {semesterSuggestions.map((value) => (
                  <Pressable
                    key={value}
                    style={[styles.suggestion, draft.semester === value ? styles.suggestionActive : null]}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        semester: current.semester === value ? '' : value,
                      }))
                    }
                  >
                    <Text style={[styles.suggestionText, draft.semester === value ? styles.suggestionTextActive : null]}>
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>状态</Text>
          <SegmentedTabs
            items={COURSE_STATUS_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            value={draft.status}
            onChange={(value) => setDraft((current) => ({ ...current, status: value }))}
          />
        </View>

        {role === 'officer' ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>授课教师</Text>
            <Pressable style={styles.input} onPress={() => setTeacherPickerOpen(true)}>
              <Text style={selectedTeacher ? styles.inputValue : styles.inputPlaceholder}>
                {selectedTeacher
                  ? `${selectedTeacher.realName}${selectedTeacher.teacherNo ? ` (${selectedTeacher.teacherNo})` : ''}`
                  : '全部教师 · 点击选择'}
              </Text>
            </Pressable>
            {draft.teacherId ? (
              <Pressable
                style={styles.clearButton}
                onPress={() => setDraft((current) => ({ ...current, teacherId: '' }))}
              >
                <Text style={styles.clearButtonText}>清除教师筛选</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {coursesQuery.isLoading ? (
        <View style={styles.statePanel}>
          <ActivityIndicator color="#005bac" />
          <Text style={styles.helper}>课程加载中…</Text>
        </View>
      ) : coursesQuery.isError ? (
        <View style={styles.statePanel}>
          <Text style={styles.errorTitle}>课程加载失败</Text>
          <Text style={styles.helper}>
            {coursesQuery.error instanceof Error ? coursesQuery.error.message : '请稍后重试。'}
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => coursesQuery.refetch()}>
            <Text style={styles.primaryButtonText}>重新加载</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={coursesQuery.isFetching && !coursesQuery.isLoading}
              onRefresh={() => coursesQuery.refetch()}
              tintColor="#005bac"
            />
          }
          ListEmptyComponent={
            <View style={styles.statePanel}>
              <Text style={styles.helper}>未匹配到课程，调整筛选后再试。</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CourseCard
              course={item}
              role={role}
              onOpen={() => handleCoursePress(item)}
              onEnroll={role === 'student' ? () => handleEnroll(item) : null}
              isEnrolling={enrollMutation.isPending && enrollMutation.variables === item.id}
            />
          )}
        />
      )}

      <TeacherPickerModal
        visible={teacherPickerOpen}
        teachers={teachers}
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

type CourseCardProps = {
  course: CourseItem
  role: UserRole
  onOpen: () => void
  onEnroll: (() => void) | null
  isEnrolling: boolean
}

function CourseCard({ course, role, onOpen, onEnroll, isEnrolling }: CourseCardProps) {
  return (
    <Pressable style={styles.courseCard} onPress={onOpen}>
      <Text style={styles.courseTitle}>{course.courseName}</Text>
      <Text style={styles.courseMeta}>
        {course.courseCode} · {course.semester || '未填学期'}
      </Text>
      <Text style={styles.helper}>
        授课教师：{course.teacherName ?? course.teacherId}
      </Text>
      <Text style={styles.helper}>
        {course.scheduleText || '上课时间未设置'} · {course.location || '上课地点未设置'}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.statusTag}>{getCourseStatusLabel(course.status)}</Text>
        {role === 'student' && course.enrolled ? (
          <Text style={styles.enrolledTag}>已加入</Text>
        ) : null}
        {role === 'student' && onEnroll && !course.enrolled ? (
          <Pressable style={styles.primaryButton} onPress={onEnroll} disabled={isEnrolling}>
            {isEnrolling ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>加入课程</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </Pressable>
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
  container: {
    flex: 1,
    gap: 12,
    padding: 16,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleCopy: { flex: 1, gap: 2 },
  sectionTitle: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 16,
  },
  helper: {
    color: '#6b7280',
    lineHeight: 20,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 12,
  },
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
  inputValue: {
    color: '#111827',
  },
  inputPlaceholder: {
    color: '#9ca3af',
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  clearButtonText: {
    color: '#005bac',
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
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
  suggestionActive: {
    backgroundColor: '#005bac',
    borderColor: '#004080',
  },
  suggestionText: {
    color: '#004080',
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionTextActive: {
    color: '#ffffff',
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  courseCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 4,
  },
  courseTitle: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 16,
  },
  courseMeta: {
    color: '#374151',
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  statusTag: {
    color: '#004080',
    backgroundColor: '#eaf3ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  enrolledTag: {
    color: '#116c35',
    backgroundColor: '#dcf2e3',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontWeight: '700',
    fontSize: 12,
    overflow: 'hidden',
  },
  primaryButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#005bac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
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
  errorTitle: {
    color: '#b91c1c',
    fontWeight: '800',
  },
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
  modalClose: {
    color: '#005bac',
    fontWeight: '800',
  },
  teacherRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 3,
  },
  teacherRowActive: {
    backgroundColor: '#eaf3ff',
  },
  teacherName: {
    color: '#111827',
    fontWeight: '800',
  },
})
