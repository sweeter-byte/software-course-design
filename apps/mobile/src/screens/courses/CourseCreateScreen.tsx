import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
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

import { api } from '../../api'
import { NoticeBanner } from '../../components/feedback/NoticeBanner'
import { SegmentedTabs } from '../../components/ui/SegmentedTabs'
import { useMobileAuth } from '../../contexts/MobileAuthContext'
import type { AdminUserItem, CourseOptions } from '../../domain'
import type { CourseStackParamList } from '../../navigation/CourseStack'

type Nav = NativeStackNavigationProp<CourseStackParamList, 'CourseCreate'>

const STATUS_OPTIONS = [
  { value: 'not_started', label: '未开始' },
  { value: 'active', label: '开课中' },
]

const DEFAULT_DRAFT = {
  courseCode: '',
  courseName: '',
  teacherId: '',
  semester: '',
  description: '',
  location: '',
  scheduleText: '',
  capacity: '50',
  startDate: '',
  endDate: '',
  status: 'not_started',
}

export function CourseCreateScreen() {
  const navigation = useNavigation<Nav>()
  const { session, apiBaseUrl, notice, notify } = useMobileAuth()
  const queryClient = useQueryClient()

  const [draft, setDraft] = useState(DEFAULT_DRAFT)
  const [teacherPickerOpen, setTeacherPickerOpen] = useState(false)

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

  const teachers = teachersQuery.data ?? []
  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => teacher.id === draft.teacherId) ?? null,
    [teachers, draft.teacherId],
  )

  const createMutation = useMutation({
    mutationFn: async () => {
      const capacityNumber = Number(draft.capacity)
      return api.createCourse(apiBaseUrl, session.accessToken, {
        ...draft,
        capacity: Number.isFinite(capacityNumber) ? capacityNumber : 0,
      })
    },
    onSuccess: (payload) => {
      notify('课程已创建。', 'success')
      queryClient.invalidateQueries({ queryKey: ['mobile-course-list'] })
      const created = payload.course
      if (created.id) {
        navigation.replace('CourseWorkspace', { courseId: created.id })
      } else {
        navigation.goBack()
      }
    },
    onError: (error) => notify(error instanceof Error ? error.message : '创建课程失败', 'error'),
  })

  const formInvalid =
    !draft.courseCode.trim() ||
    !draft.courseName.trim() ||
    !draft.teacherId ||
    !draft.semester.trim() ||
    !draft.location.trim() ||
    !draft.scheduleText.trim() ||
    !draft.startDate ||
    !draft.endDate

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>新建课程</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <NoticeBanner notice={notice} />
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>课程基础信息</Text>
          <Text style={styles.helper}>必填项均需填写后方可保存。</Text>

          <FormField
            label="课程代码"
            value={draft.courseCode}
            onChange={(value) => setDraft((current) => ({ ...current, courseCode: value }))}
          />
          <FormField
            label="课程名称"
            value={draft.courseName}
            onChange={(value) => setDraft((current) => ({ ...current, courseName: value }))}
          />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>授课教师</Text>
            <Pressable style={styles.input} onPress={() => setTeacherPickerOpen(true)}>
              <Text style={selectedTeacher ? styles.inputValue : styles.inputPlaceholder}>
                {selectedTeacher
                  ? `${selectedTeacher.realName}${selectedTeacher.teacherNo ? ` (${selectedTeacher.teacherNo})` : ''}`
                  : '点击选择教师'}
              </Text>
            </Pressable>
          </View>

          <FormField
            label="开课学期"
            value={draft.semester}
            onChange={(value) => setDraft((current) => ({ ...current, semester: value }))}
          />
          {(courseOptionsQuery.data?.semesters ?? []).length > 0 ? (
            <View style={styles.suggestionsRow}>
              {(courseOptionsQuery.data?.semesters ?? []).map((value) => (
                <Pressable
                  key={value}
                  style={[styles.suggestion, draft.semester === value ? styles.suggestionActive : null]}
                  onPress={() => setDraft((current) => ({ ...current, semester: value }))}
                >
                  <Text
                    style={[styles.suggestionText, draft.semester === value ? styles.suggestionTextActive : null]}
                  >
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
          {(courseOptionsQuery.data?.locations ?? []).length > 0 ? (
            <View style={styles.suggestionsRow}>
              {(courseOptionsQuery.data?.locations ?? []).map((value) => (
                <Pressable
                  key={value}
                  style={[styles.suggestion, draft.location === value ? styles.suggestionActive : null]}
                  onPress={() => setDraft((current) => ({ ...current, location: value }))}
                >
                  <Text
                    style={[styles.suggestionText, draft.location === value ? styles.suggestionTextActive : null]}
                  >
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
            <Text style={styles.fieldLabel}>初始状态</Text>
            <SegmentedTabs
              items={STATUS_OPTIONS}
              value={draft.status}
              onChange={(value) => setDraft((current) => ({ ...current, status: value }))}
              variant="wrap"
            />
          </View>

          <Pressable
            style={[styles.primaryButton, formInvalid ? styles.primaryButtonDisabled : null]}
            disabled={formInvalid || createMutation.isPending}
            onPress={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>创建课程</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={teacherPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setTeacherPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHead}>
              <Text style={styles.sectionTitle}>选择授课教师</Text>
              <Pressable onPress={() => setTeacherPickerOpen(false)}>
                <Text style={styles.modalClose}>关闭</Text>
              </Pressable>
            </View>
            {teachersQuery.isLoading ? (
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
                      draft.teacherId === item.id ? styles.teacherRowActive : null,
                    ]}
                    onPress={() => {
                      setDraft((current) => ({ ...current, teacherId: item.id }))
                      setTeacherPickerOpen(false)
                    }}
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

const styles = StyleSheet.create({
  header: {
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
  headerTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
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
  primaryButtonDisabled: { backgroundColor: '#a4bfe0' },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
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
