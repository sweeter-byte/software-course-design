import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useParams } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import { useNotify } from '../../contexts/useNotify'
import type { AssignmentItem, CourseItem, FeedbackItem } from '../../domain'
import { extractErrorMessage } from '../../utils/errors'
import { StudentAssignmentWorkspace } from '../assignments/StudentAssignmentWorkspace'

interface AssignmentsTabOutletContext {
  course: CourseItem
}

export function StudentAssignmentDetailRoute() {
  const { course } = useOutletContext<AssignmentsTabOutletContext>()
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const { apiBaseUrl, session } = useAuth()
  const notify = useNotify()
  const queryClient = useQueryClient()

  const [submissionContent, setSubmissionContent] = useState('')
  const [submissionSyncKey, setSubmissionSyncKey] = useState<string | null>(null)
  const [feedbackDraft, setFeedbackDraft] = useState<{ kind: 'question' | 'feedback'; content: string }>({
    kind: 'question',
    content: '',
  })
  const [error, setError] = useState<string | null>(null)

  const assignmentsQuery = useQuery<{ items: AssignmentItem[] }>({
    queryKey: ['assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as AssignmentItem[] }
    },
  })

  const assignment =
    assignmentsQuery.data?.items.find((item) => item.id === assignmentId) ?? null

  // Sync the textarea when navigating between assignments or once the
  // server-side submission for the current assignment loads. We schedule the
  // update from render rather than useEffect to avoid an extra commit pass.
  const nextSyncKey = assignment ? `${assignment.id}:${assignment.mySubmission?.id ?? ''}` : null
  if (nextSyncKey !== submissionSyncKey) {
    setSubmissionSyncKey(nextSyncKey)
    setSubmissionContent(assignment?.mySubmission?.content ?? '')
  }

  const submissionId = assignment?.mySubmission?.id ?? assignment?.submissionId ?? null

  const feedbacksQuery = useQuery<{ items: FeedbackItem[] }>({
    enabled: Boolean(submissionId),
    queryKey: ['feedbacks', apiBaseUrl, session.accessToken, submissionId],
    queryFn: async () => {
      if (!submissionId) {
        return { items: [] }
      }
      const payload = await api.listFeedbacks(apiBaseUrl, session.accessToken, submissionId)
      return { items: payload.items as FeedbackItem[] }
    },
  })

  const createSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!assignment) return null
      return api.createSubmission(apiBaseUrl, session.accessToken, assignment.id, submissionContent)
    },
    onSuccess: () => {
      setError(null)
      notify({ type: 'success', content: '提交成功，答案已保存。' })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const updateSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!submissionId) return null
      return api.updateSubmission(apiBaseUrl, session.accessToken, submissionId, submissionContent)
    },
    onSuccess: () => {
      setError(null)
      notify({ type: 'success', content: '修改成功，答案已更新。' })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const createFeedbackMutation = useMutation({
    mutationFn: async () => {
      if (!submissionId) return null
      return api.createFeedback(
        apiBaseUrl,
        session.accessToken,
        submissionId,
        feedbackDraft.kind,
        feedbackDraft.content,
      )
    },
    onSuccess: () => {
      setError(null)
      setFeedbackDraft({ kind: 'question', content: '' })
      notify({ type: 'success', content: '已发布，可在下方查看。' })
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  if (assignmentsQuery.isLoading) {
    return <StatePanel title="作业加载中" detail="正在获取作业详情。" />
  }

  if (!assignment) {
    return <StatePanel title="作业不存在" detail="该作业可能已被取消，或不属于当前课程。" />
  }

  const isGraded = assignment.mySubmission?.status === 'graded'

  return (
    <div className="course-assignment-detail-body">
      {error ? <p className="error-banner">{error}</p> : null}
      {isGraded ? (
        <div className="cta-row">
          <a
            href="#student-feedback-content"
            className="primary-button"
            onClick={(event) => {
              event.preventDefault()
              const target = document.getElementById('student-feedback-content')
              if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' })
                target.focus()
              }
            }}
          >
            我有问题/反馈
          </a>
        </div>
      ) : null}
      <StudentAssignmentWorkspace
        assignment={assignment}
        feedbacks={feedbacksQuery.data?.items ?? []}
        submissionContent={submissionContent}
        feedbackKind={feedbackDraft.kind}
        feedbackContent={feedbackDraft.content}
        isSubmitting={createSubmissionMutation.isPending}
        isUpdating={updateSubmissionMutation.isPending}
        isPostingFeedback={createFeedbackMutation.isPending}
        onSubmissionContentChange={setSubmissionContent}
        onSubmitAnswer={() => createSubmissionMutation.mutate()}
        onUpdateAnswer={() => updateSubmissionMutation.mutate()}
        onFeedbackKindChange={(kind) => setFeedbackDraft((current) => ({ ...current, kind }))}
        onFeedbackContentChange={(content) =>
          setFeedbackDraft((current) => ({ ...current, content }))
        }
        onPostFeedback={() => createFeedbackMutation.mutate()}
      />
    </div>
  )
}
