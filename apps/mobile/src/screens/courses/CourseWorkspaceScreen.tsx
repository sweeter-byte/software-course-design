import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { api } from '../../api'
import { NoticeBanner } from '../../components/feedback/NoticeBanner'
import { CourseContextHeader } from '../../components/layout/CourseContextHeader'
import { SegmentedTabs } from '../../components/ui/SegmentedTabs'
import { useMobileAuth } from '../../contexts/MobileAuthContext'
import type { CourseItem } from '../../domain'
import type { CourseStackParamList } from '../../navigation/CourseStack'
import {
  getCourseWorkspaceTabs,
  getInitialCourseWorkspaceTab,
  type CourseWorkspaceTabValue,
} from './course-workspace-model'
import { CourseFeedbacksOverallTab } from './tabs/CourseFeedbacksOverallTab'
import { OfficerCourseAssignmentsTab } from './tabs/OfficerCourseAssignmentsTab'
import { OfficerCourseBasicInfoTab } from './tabs/OfficerCourseBasicInfoTab'
import { OfficerCourseOverviewTab } from './tabs/OfficerCourseOverviewTab'
import { StudentCourseAssignmentsTab } from './tabs/StudentCourseAssignmentsTab'
import { StudentCourseFeedbacksTab } from './tabs/StudentCourseFeedbacksTab'
import { StudentCourseOverviewTab } from './tabs/StudentCourseOverviewTab'
import { TeacherCourseAssignmentsTab } from './tabs/TeacherCourseAssignmentsTab'
import { TeacherCourseFeedbacksTab } from './tabs/TeacherCourseFeedbacksTab'
import { TeacherCourseOverviewTab } from './tabs/TeacherCourseOverviewTab'
import { TeacherCourseSubmissionsTab } from './tabs/TeacherCourseSubmissionsTab'

type Nav = NativeStackNavigationProp<CourseStackParamList, 'CourseWorkspace'>
type Route = RouteProp<CourseStackParamList, 'CourseWorkspace'>

export function CourseWorkspaceScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { session, apiBaseUrl, notice } = useMobileAuth()
  const role = session.user.role
  const courseId = route.params.courseId

  const courseQuery = useQuery<CourseItem>({
    enabled: Boolean(courseId),
    queryKey: ['mobile-course-detail', apiBaseUrl, session.accessToken, courseId],
    queryFn: async () => {
      const payload = await api.getCourse(apiBaseUrl, session.accessToken, courseId)
      return payload.course
    },
  })

  const tabs = getCourseWorkspaceTabs(role)
  const [activeTab, setActiveTab] = useState<CourseWorkspaceTabValue>(
    getInitialCourseWorkspaceTab(role),
  )

  const course = courseQuery.data ?? null

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.topTitle}>课程工作区</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <NoticeBanner notice={notice} />
        <CourseContextHeader
          course={course}
          badge={role === 'student' && course?.enrolled ? '已加入' : null}
        />

        <SegmentedTabs items={tabs} value={activeTab} onChange={setActiveTab} />

        {courseQuery.isLoading ? (
          <View style={styles.placeholder}>
            <ActivityIndicator color="#005bac" />
            <Text style={styles.helper}>课程加载中…</Text>
          </View>
        ) : courseQuery.isError || !course ? (
          <View style={styles.placeholder}>
            <Text style={styles.errorTitle}>课程加载失败</Text>
            <Text style={styles.helper}>
              {courseQuery.error instanceof Error ? courseQuery.error.message : '请稍后重试。'}
            </Text>
            <Pressable style={styles.retryButton} onPress={() => courseQuery.refetch()}>
              <Text style={styles.retryText}>重试</Text>
            </Pressable>
          </View>
        ) : (
          <ActiveTab tab={activeTab} role={role} course={course} />
        )}
      </ScrollView>
    </View>
  )
}

function ActiveTab({
  tab,
  role,
  course,
}: {
  tab: CourseWorkspaceTabValue
  role: 'student' | 'teacher' | 'officer'
  course: CourseItem
}) {
  if (tab === 'overview') {
    if (role === 'student') return <StudentCourseOverviewTab course={course} />
    if (role === 'teacher') return <TeacherCourseOverviewTab course={course} />
    return <OfficerCourseOverviewTab course={course} />
  }
  if (tab === 'assignments') {
    if (role === 'student') return <StudentCourseAssignmentsTab course={course} />
    if (role === 'teacher') return <TeacherCourseAssignmentsTab course={course} />
    return <OfficerCourseAssignmentsTab course={course} />
  }
  if (tab === 'submissions' && role === 'teacher') {
    return <TeacherCourseSubmissionsTab course={course} />
  }
  if (tab === 'feedbacks') {
    if (role === 'student') return <StudentCourseFeedbacksTab course={course} />
    if (role === 'teacher') return <TeacherCourseFeedbacksTab course={course} />
  }
  if (tab === 'course-feedbacks') {
    return <CourseFeedbacksOverallTab course={course} />
  }
  if (tab === 'basic-info' && role === 'officer') {
    return <OfficerCourseBasicInfoTab course={course} />
  }
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>{tabLabelFor(tab)}</Text>
      <Text style={styles.helper}>该 Tab 暂不可用。</Text>
    </View>
  )
}

function tabLabelFor(tab: CourseWorkspaceTabValue): string {
  switch (tab) {
    case 'assignments':
      return '作业'
    case 'submissions':
      return '批改'
    case 'feedbacks':
      return '作业反馈'
    case 'basic-info':
      return '基础信息维护'
    default:
      return tab
  }
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
  placeholder: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9e2ef',
    backgroundColor: '#ffffff',
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  placeholderTitle: { color: '#111827', fontWeight: '800' },
  helper: { color: '#6b7280', lineHeight: 20, textAlign: 'center' },
  errorTitle: { color: '#b91c1c', fontWeight: '800' },
  retryButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfd0e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: '#004080', fontWeight: '800' },
})
