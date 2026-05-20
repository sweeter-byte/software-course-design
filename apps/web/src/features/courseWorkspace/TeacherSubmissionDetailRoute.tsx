import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useParams } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { SubmissionItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'
import { extractErrorMessage } from '../../utils/errors'
import { submissionStatusLabel } from '../../utils/submission-status'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

export function TeacherSubmissionDetailRoute() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { submissionId } = useParams<{ submissionId: string }>()
  const { apiBaseUrl, session } = useAuth()
  const queryClient = useQueryClient()

  const submissionQuery = useQuery<{ submission: SubmissionItem }>({
    enabled: Boolean(submissionId),
    queryKey: ['submission-detail', apiBaseUrl, session.accessToken, submissionId],
    queryFn: async () => {
      if (!submissionId) throw new Error('missing submissionId')
      const payload = await api.getSubmission(apiBaseUrl, session.accessToken, submissionId)
      return { submission: payload.submission as SubmissionItem }
    },
  })

  const submission = submissionQuery.data?.submission ?? null

  const [score, setScore] = useState<string>('')
  const [teacherFeedback, setTeacherFeedback] = useState<string>('')
  const [syncKey, setSyncKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Sync local state to the loaded submission once it arrives or changes.
  const nextSyncKey = submission ? submission.id : null
  if (nextSyncKey !== syncKey) {
    setSyncKey(nextSyncKey)
    setScore(submission?.score == null ? '' : String(submission.score))
    setTeacherFeedback(submission?.teacherFeedback ?? '')
  }

  const gradeMutation = useMutation({
    mutationFn: async () => {
      if (!submissionId) return null
      return api.gradeSubmission(
        apiBaseUrl,
        session.accessToken,
        submissionId,
        Number(score),
        teacherFeedback,
      )
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['submission-detail'] })
      queryClient.invalidateQueries({ queryKey: ['feedbackThreads'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  if (submissionQuery.isLoading) {
    return <StatePanel title="提交加载中" detail="正在获取提交详情。" />
  }

  if (!submission) {
    return <StatePanel title="未找到提交" detail="该提交可能不在当前课程范围内。" />
  }

  const alreadyGraded = submission.status === 'graded'

  return (
    <div className="course-submission-detail-body">
      {error ? <p className="error-banner">{error}</p> : null}

      <section className="section-card">
        <div className="section-head">
          <h3>提交内容</h3>
          <p>
            课程 {course.courseName} ·{' '}
            {submission.studentName ?? submission.studentId}
            {submission.studentNo ? `（${submission.studentNo}）` : ''}
          </p>
        </div>
        <dl className="detail-list">
          <div>
            <dt>提交时间</dt>
            <dd>{formatDateTimeForDisplay(submission.submittedAt)}</dd>
          </div>
          <div>
            <dt>当前状态</dt>
            <dd>{submissionStatusLabel(submission.status)}</dd>
          </div>
          {submission.gradedAt ? (
            <div>
              <dt>批改时间</dt>
              <dd>{formatDateTimeForDisplay(submission.gradedAt)}</dd>
            </div>
          ) : null}
        </dl>
        <p className="thread-content">{submission.content}</p>
      </section>

      <section className="section-card">
        <div className="section-head">
          <h3>{alreadyGraded ? '修改批改' : '填写批改结果'}</h3>
          <p>
            {alreadyGraded
              ? '重新提交将覆盖原分数和批改回复，可能影响已有作业反馈上下文。'
              : '一旦提交，学生可以开始就该作业发起问题或反馈。'}
          </p>
        </div>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault()
            gradeMutation.mutate()
          }}
        >
          <label htmlFor="grade-score">
            分数（0-100）
            <input
              id="grade-score"
              type="number"
              min={0}
              max={100}
              step={1}
              required
              value={score}
              onChange={(event) => setScore(event.target.value)}
            />
          </label>
          <label htmlFor="grade-feedback">
            教师批改回复
            <textarea
              id="grade-feedback"
              required
              minLength={2}
              value={teacherFeedback}
              onChange={(event) => setTeacherFeedback(event.target.value)}
            />
          </label>
          <button className="primary-button" type="submit" disabled={gradeMutation.isPending}>
            {gradeMutation.isPending ? '保存中...' : alreadyGraded ? '保存修改' : '提交批改'}
          </button>
        </form>
      </section>
    </div>
  )
}
