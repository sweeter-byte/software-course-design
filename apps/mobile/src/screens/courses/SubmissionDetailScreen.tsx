import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
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
import { useMobileAuth } from '../../contexts/MobileAuthContext'
import type { CourseStackParamList } from '../../navigation/CourseStack'
import {
  getSubmissionGradeInvalidationKeys,
  invalidateQueryKeys,
} from '../../query-invalidation'
import { submissionStatusLabel } from '../assignments/assignment-status'

type Nav = NativeStackNavigationProp<CourseStackParamList, 'SubmissionDetail'>
type Route = RouteProp<CourseStackParamList, 'SubmissionDetail'>

function formatDateTimeBrief(value: string | null | undefined) {
  if (!value) return '未记录'
  return value.replace('T', ' ').slice(0, 16)
}

export function SubmissionDetailScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { session, apiBaseUrl, notice, notify } = useMobileAuth()
  const queryClient = useQueryClient()
  const role = session.user.role
  const { submissionId, courseId } = route.params

  const submissionQuery = useQuery({
    enabled: Boolean(submissionId),
    queryKey: ['mobile-submission-detail', apiBaseUrl, session.accessToken, submissionId],
    queryFn: async () => {
      const payload = await api.getSubmission(apiBaseUrl, session.accessToken, submissionId)
      return payload.submission
    },
  })

  const submission = submissionQuery.data ?? null
  const alreadyGraded = submission?.status === 'graded'

  const [score, setScore] = useState<string>('')
  const [teacherFeedback, setTeacherFeedback] = useState<string>('')
  const [syncedId, setSyncedId] = useState<string | null>(null)

  useEffect(() => {
    if (submission && submission.id !== syncedId) {
      setSyncedId(submission.id)
      setScore(submission.score == null ? '' : String(submission.score))
      setTeacherFeedback(submission.teacherFeedback ?? '')
    }
  }, [submission, syncedId])

  const gradeMutation = useMutation({
    mutationFn: () => {
      const scoreNumber = Number(score)
      if (!Number.isFinite(scoreNumber) || scoreNumber < 0 || scoreNumber > 100) {
        throw new Error('分数需在 0-100 之间')
      }
      if (teacherFeedback.trim().length < 2) {
        throw new Error('教师批改回复至少 2 个字')
      }
      return api.gradeSubmission(
        apiBaseUrl,
        session.accessToken,
        submissionId,
        scoreNumber,
        teacherFeedback,
      )
    },
    onSuccess: () => {
      notify(alreadyGraded ? '批改已更新。' : '批改已提交，学生可看到分数和评语。', 'success')
      invalidateQueryKeys(
        queryClient,
        getSubmissionGradeInvalidationKeys(apiBaseUrl, session.accessToken, courseId, submissionId),
      )
    },
    onError: (error) => notify(error instanceof Error ? error.message : '批改失败', 'error'),
  })

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 返回</Text>
        </Pressable>
        <Text style={styles.topTitle}>提交详情</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <NoticeBanner notice={notice} />

        {submissionQuery.isLoading ? (
          <View style={styles.card}>
            <ActivityIndicator color="#005bac" />
            <Text style={styles.helper}>提交加载中…</Text>
          </View>
        ) : !submission ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>未找到提交</Text>
            <Text style={styles.helper}>该提交可能已不存在或权限受限。</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.statusTag}>{submissionStatusLabel(submission.status)}</Text>
              <Text style={styles.sectionTitle}>
                {submission.studentName ?? submission.studentId}
                {submission.studentNo ? `（${submission.studentNo}）` : ''}
              </Text>
              <Text style={styles.helper}>
                提交时间：{formatDateTimeBrief(submission.submittedAt)}
                {submission.gradedAt ? `   ·   批改时间：${formatDateTimeBrief(submission.gradedAt)}` : ''}
              </Text>
              <View style={styles.contentBox}>
                <Text style={styles.body}>{submission.content}</Text>
              </View>
            </View>

            {role === 'teacher' ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{alreadyGraded ? '修改批改结果' : '填写批改结果'}</Text>
                <Text style={styles.helper}>
                  {alreadyGraded
                    ? '保存修改会覆盖原分数与评语。'
                    : '提交后学生可发起作业问题或反馈。'}
                </Text>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>分数 (0-100)</Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={score}
                    onChangeText={setScore}
                    placeholderTextColor="#9ca3af"
                    style={styles.input}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>教师批改回复</Text>
                  <TextInput
                    multiline
                    value={teacherFeedback}
                    onChangeText={setTeacherFeedback}
                    placeholder="不少于 2 个字"
                    placeholderTextColor="#9ca3af"
                    style={[styles.input, styles.inputMultiline]}
                  />
                </View>
                <Pressable
                  style={[
                    styles.primaryButton,
                    !score.trim() || teacherFeedback.trim().length < 2 ? styles.primaryButtonDisabled : null,
                  ]}
                  disabled={
                    !score.trim() ||
                    teacherFeedback.trim().length < 2 ||
                    gradeMutation.isPending
                  }
                  onPress={() => gradeMutation.mutate()}
                >
                  {gradeMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {alreadyGraded ? '保存修改' : '提交批改'}
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>批改结果</Text>
                <Text style={styles.scoreText}>
                  {submission.score == null ? '暂无分数' : `${submission.score} 分`}
                </Text>
                <Text style={styles.body}>
                  {submission.teacherFeedback ?? '教师暂未填写评语。'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  contentBox: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#eef1f6',
    padding: 10,
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
  primaryButton: {
    minHeight: 44,
    borderRadius: 6,
    backgroundColor: '#005bac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: { backgroundColor: '#a4bfe0' },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
  scoreText: { color: '#7c2d12', fontWeight: '800', fontSize: 20 },
})
