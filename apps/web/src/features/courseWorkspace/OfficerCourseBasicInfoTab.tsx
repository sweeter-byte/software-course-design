import { useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useOutletContext } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { AssignmentItem, CourseFeedbackItem, CourseItem, FeedbackItem, SubmissionItem } from '../../domain'
import { confirmDestructive } from '../../utils/confirm'
import { extractErrorMessage } from '../../utils/errors'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'not_started', label: '未开始' },
  { value: 'active', label: '开课中' },
  { value: 'completed', label: '已结课' },
  { value: 'suspended', label: '暂停' },
]

interface DraftState {
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

function toDraft(course: CourseItem): DraftState {
  return {
    courseCode: course.courseCode,
    courseName: course.courseName,
    teacherId: course.teacherId,
    semester: course.semester,
    description: course.description,
    location: course.location,
    scheduleText: course.scheduleText,
    capacity: String(course.capacity),
    startDate: course.startDate ?? '',
    endDate: course.endDate ?? '',
    status: course.status,
  }
}

export function OfficerCourseBasicInfoTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [draft, setDraft] = useState<DraftState>(() => toDraft(course))
  const [draftCourseId, setDraftCourseId] = useState<string>(course.id)
  if (draftCourseId !== course.id) {
    setDraftCourseId(course.id)
    setDraft(toDraft(course))
  }

  const [error, setError] = useState<string | null>(null)

  const assignmentsQuery = useQuery<{ items: AssignmentItem[] }>({
    queryKey: ['assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as AssignmentItem[] }
    },
  })

  const courseFeedbacksQuery = useQuery<{ items: CourseFeedbackItem[] }>({
    queryKey: ['courseFeedbacks', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listCourseFeedbacks(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as CourseFeedbackItem[] }
    },
  })

  const feedbackThreadsQuery = useQuery<{ items: FeedbackItem[] }>({
    queryKey: ['feedbackThreads', apiBaseUrl, session.accessToken, course.id, 'officer'],
    queryFn: async () => {
      const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {
        courseId: course.id,
      })
      return { items: payload.items as FeedbackItem[] }
    },
  })

  const assignments = assignmentsQuery.data?.items ?? []
  const submissionQueries = useQueries({
    queries: assignments.map((assignment) => ({
      queryKey: ['submissions', apiBaseUrl, session.accessToken, assignment.id],
      queryFn: async () => {
        const payload = await api.listSubmissions(
          apiBaseUrl,
          session.accessToken,
          assignment.id,
        )
        return { items: payload.items as SubmissionItem[] }
      },
    })),
  })

  const submissionTotal = submissionQueries.reduce(
    (acc, q) => acc + (q.data?.items.length ?? 0),
    0,
  )

  const updateMutation = useMutation({
    mutationFn: async () => {
      return api.updateCourse(apiBaseUrl, session.accessToken, course.id, {
        ...draft,
        capacity: Number(draft.capacity),
      })
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['course-detail'] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return api.deleteCourse(apiBaseUrl, session.accessToken, course.id)
    },
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      navigate('/officer/courses', { replace: true })
    },
    onError: (error) => setError(extractErrorMessage(error)),
  })

  const deleteImpactReady =
    !assignmentsQuery.isLoading &&
    !courseFeedbacksQuery.isLoading &&
    !feedbackThreadsQuery.isLoading &&
    submissionQueries.every((q) => !q.isLoading)

  return (
    <div className="course-tab-content">
      <article className="section-card wide-card">
        <div className="section-head">
          <h3>基础信息维护</h3>
          <p>修改课程基础信息。修改后需二次确认。</p>
        </div>
        {error ? <p className="error-banner">{error}</p> : null}
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (confirmDestructive('确认保存课程基础信息修改吗？')) {
              updateMutation.mutate()
            }
          }}
        >
          <div className="form-grid">
            <label htmlFor="officer-course-code">
              课程代码
              <input
                id="officer-course-code"
                required
                minLength={2}
                value={draft.courseCode}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, courseCode: event.target.value }))
                }
              />
            </label>
            <label htmlFor="officer-course-name">
              课程名称
              <input
                id="officer-course-name"
                required
                minLength={2}
                value={draft.courseName}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, courseName: event.target.value }))
                }
              />
            </label>
            <label htmlFor="officer-course-teacher">
              授课教师编号
              <input
                id="officer-course-teacher"
                required
                value={draft.teacherId}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, teacherId: event.target.value }))
                }
              />
            </label>
            <label htmlFor="officer-course-semester">
              开课学期
              <input
                id="officer-course-semester"
                required
                minLength={2}
                value={draft.semester}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, semester: event.target.value }))
                }
              />
            </label>
            <label htmlFor="officer-course-location">
              授课地点
              <input
                id="officer-course-location"
                required
                value={draft.location}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, location: event.target.value }))
                }
              />
            </label>
            <label htmlFor="officer-course-schedule">
              上课时间
              <input
                id="officer-course-schedule"
                required
                value={draft.scheduleText}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, scheduleText: event.target.value }))
                }
              />
            </label>
          </div>
          <label htmlFor="officer-course-description">
            课程简介
            <textarea
              id="officer-course-description"
              required
              minLength={2}
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>
          <div className="form-grid">
            <label htmlFor="officer-course-capacity">
              课程人数上限
              <input
                id="officer-course-capacity"
                type="number"
                min={1}
                step={1}
                required
                value={draft.capacity}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, capacity: event.target.value }))
                }
              />
            </label>
            <label htmlFor="officer-course-start">
              开始日期
              <input
                id="officer-course-start"
                type="date"
                required
                value={draft.startDate}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, startDate: event.target.value }))
                }
              />
            </label>
            <label htmlFor="officer-course-end">
              结束日期
              <input
                id="officer-course-end"
                type="date"
                required
                value={draft.endDate}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, endDate: event.target.value }))
                }
              />
            </label>
            <label htmlFor="officer-course-status">
              课程状态
              <select
                id="officer-course-status"
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, status: event.target.value }))
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="primary-button" type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? '保存中...' : '保存修改'}
          </button>
        </form>
      </article>

      <article className="section-card wide-card">
        <div className="section-head">
          <h3>删除课程</h3>
          <p>删除会级联清除该课程下的所有选课、作业、提交、反馈、课程反馈。</p>
        </div>
        {deleteImpactReady ? (
          <ul className="bullet-list">
            <li>关联作业：{assignments.length} 条</li>
            <li>关联提交：{submissionTotal} 条</li>
            <li>关联作业反馈线程：{feedbackThreadsQuery.data?.items.length ?? 0} 条</li>
            <li>关联课程整体反馈：{courseFeedbacksQuery.data?.items.length ?? 0} 条</li>
          </ul>
        ) : (
          <StatePanel title="影响范围统计中" detail="正在汇总关联数据。" />
        )}
        <button
          className="danger-button"
          type="button"
          disabled={!deleteImpactReady || deleteMutation.isPending}
          onClick={() => {
            const summary =
              `确认删除课程 ${course.courseName} 吗？` +
              `\n此操作将同步删除：` +
              `\n· 关联作业 ${assignments.length} 条` +
              `\n· 关联提交 ${submissionTotal} 条` +
              `\n· 关联作业反馈线程 ${feedbackThreadsQuery.data?.items.length ?? 0} 条` +
              `\n· 关联课程整体反馈 ${courseFeedbacksQuery.data?.items.length ?? 0} 条` +
              `\n删除后无法恢复。`
            if (confirmDestructive(summary)) {
              deleteMutation.mutate()
            }
          }}
        >
          {deleteMutation.isPending ? '删除中...' : '删除课程'}
        </button>
      </article>
    </div>
  )
}
