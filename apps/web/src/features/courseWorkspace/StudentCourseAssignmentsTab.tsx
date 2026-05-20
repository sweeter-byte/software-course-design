import { useQuery } from '@tanstack/react-query'
import { Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import { api } from '../../api'
import { StatePanel } from '../../components/ui/StatePanel'
import { useAuth } from '../../contexts/useAuth'
import type { AssignmentItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'
import type { CourseWorkspaceOutletContext } from './CourseWorkspace'

const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  closed: '已截止',
  cancelled: '已取消',
}

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  draft: '未提交',
  submitted: '已提交',
  graded: '已批改',
}

export function StudentCourseAssignmentsTab() {
  const { course } = useOutletContext<CourseWorkspaceOutletContext>()
  const { apiBaseUrl, session } = useAuth()
  const params = useParams<{ courseId: string; assignmentId?: string }>()
  const navigate = useNavigate()

  const assignmentsQuery = useQuery<{ items: AssignmentItem[] }>({
    queryKey: ['assignments', apiBaseUrl, session.accessToken, course.id],
    queryFn: async () => {
      const payload = await api.listAssignments(apiBaseUrl, session.accessToken, course.id)
      return { items: payload.items as AssignmentItem[] }
    },
  })

  const assignments = assignmentsQuery.data?.items ?? []
  const selectedAssignmentId = params.assignmentId ?? null

  return (
    <div className="course-tab-content course-assignments-layout">
      <aside className="course-assignment-list">
        <header>
          <h3>作业列表</h3>
          <p className="muted-paragraph">点击作业进入详情页提交答案或查看批改结果。</p>
        </header>
        {assignmentsQuery.isLoading ? (
          <StatePanel title="作业加载中" detail="正在同步课程作业。" />
        ) : assignments.length === 0 ? (
          <StatePanel title="暂无作业" detail="该课程尚未发布作业。" />
        ) : (
          <div className="entity-list">
            {assignments.map((assignment) => {
              const submissionStatus =
                assignment.mySubmission?.status ??
                (assignment.hasSubmitted ? 'submitted' : 'draft')
              return (
                <button
                  key={assignment.id}
                  type="button"
                  className={selectedAssignmentId === assignment.id ? 'entity-card active' : 'entity-card'}
                  onClick={() => navigate(`/student/courses/${course.id}/assignments/${assignment.id}`)}
                >
                  <div>
                    <strong>{assignment.title}</strong>
                    <span>
                      {ASSIGNMENT_STATUS_LABELS[assignment.status] ?? assignment.status}
                    </span>
                  </div>
                  <p>{assignment.description}</p>
                  <small>截止：{formatDateTimeForDisplay(assignment.dueAt)}</small>
                  <small>
                    提交状态：
                    {SUBMISSION_STATUS_LABELS[submissionStatus] ?? submissionStatus}
                  </small>
                </button>
              )
            })}
          </div>
        )}
      </aside>

      <section className="course-assignment-detail">
        {selectedAssignmentId ? (
          <Outlet context={{ course } satisfies { course: typeof course }} />
        ) : (
          <StatePanel
            title="尚未选择作业"
            detail="在左侧选择一条作业，进入提交、查看批改结果或发起作业反馈。"
          />
        )}
      </section>
    </div>
  )
}
