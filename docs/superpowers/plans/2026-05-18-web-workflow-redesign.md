# Web Workflow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 Web 端课程、作业、提交、反馈工作流，让学生和教师能在任务上下文内完成核心操作，不再依赖跨页面隐藏选择状态。

**Architecture:** 保留 React + TypeScript + Vite + TanStack Query，不更换前端框架。先抽出轻量类型、工具和布局组件，再按学生闭环、反馈总览接口、教师任务台、视觉打磨顺序推进。

**Tech Stack:** React 19, TypeScript, Vite, TanStack Query, Fastify, SQLite, Vitest.

---

## File Structure

- Create: `apps/web/src/domain.ts`
  - 统一定义 Web 端课程、作业、提交、反馈、课程反馈和上下文类型。
- Create: `apps/web/src/utils/date.ts`
  - 日期展示和 `datetime-local` 转换工具。
- Create: `apps/web/src/utils/errors.ts`
  - API 错误到中文业务文案的映射。
- Create: `apps/web/src/components/layout/WorkspaceContextBar.tsx`
  - 统一上下文栏组件。
- Create: `apps/web/src/components/ui/StatePanel.tsx`
  - 从 `App.tsx` 抽出的空状态/提示组件。
- Create: `apps/web/src/features/assignments/StudentAssignmentWorkspace.tsx`
  - 学生作业详情、提交、成绩和作业互动入口。
- Create: `apps/web/src/features/teacher/TeacherTaskWorkspace.tsx`
  - 教师待批改、待回复、课程反馈任务视图。
- Modify: `apps/web/src/api.ts`
  - 增加类型化接口、反馈总览接口客户端。
- Modify: `apps/web/src/App.tsx`
  - 挂接上下文栏和新 feature 组件，逐步移除重复视图。
- Modify: `apps/web/src/App.css`
  - 增加上下文栏、任务台、学生作业闭环和视觉打磨样式。
- Modify: `apps/web/src/display-copy.test.ts`
  - 增加 Web 文案/结构约束测试。
- Create: `apps/web/src/utils/date.test.ts`
  - 日期格式和输入转换测试。
- Create: `apps/web/src/utils/errors.test.ts`
  - 业务错误文案测试。
- Modify: `apps/server/src/modules/feedback/routes.ts`
  - 新增反馈线程总览接口。
- Modify: `apps/server/tests/feedback.integration.test.ts`
  - 增加反馈总览权限和返回字段测试。
- Modify: `docs/API_SPEC.md`
  - 记录新增反馈总览接口。
- Modify: `docs/ACCEPTANCE_SELF_CHECK.md`
  - 更新 Web 端验收路径。

---

### Task 1: Web 类型、工具和统一上下文栏

**Files:**
- Create: `apps/web/src/domain.ts`
- Create: `apps/web/src/utils/date.ts`
- Create: `apps/web/src/utils/errors.ts`
- Create: `apps/web/src/components/ui/StatePanel.tsx`
- Create: `apps/web/src/components/layout/WorkspaceContextBar.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.css`
- Create: `apps/web/src/utils/date.test.ts`
- Create: `apps/web/src/utils/errors.test.ts`
- Modify: `apps/web/src/display-copy.test.ts`

- [ ] **Step 1: Write failing date utility tests**

Create `apps/web/src/utils/date.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { formatDateTimeForDisplay, fromDateTimeLocalValue, toDateTimeLocalValue } from './date'

describe('date utilities', () => {
  it('formats ISO values for Chinese local display without raw ISO syntax', () => {
    const result = formatDateTimeForDisplay('2026-06-17T15:00:00.000Z')

    expect(result).toContain('06')
    expect(result).toContain('17')
    expect(result).not.toContain('T')
    expect(result).not.toContain('.000Z')
  })

  it('converts ISO values to datetime-local input values', () => {
    const result = toDateTimeLocalValue('2026-06-17T15:00:00.000Z')

    expect(result).toMatch(/^2026-06-(17|18)T/)
    expect(result).not.toContain('.000Z')
  })

  it('converts datetime-local input values back to ISO values', () => {
    const result = fromDateTimeLocalValue('2026-06-17T23:00')

    expect(result).toMatch(/^2026-06-17T/)
    expect(result).toContain('Z')
  })
})
```

- [ ] **Step 2: Run date tests to verify RED**

Run:

```bash
npm run test --workspace @course/web -- src/utils/date.test.ts
```

Expected: FAIL because `apps/web/src/utils/date.ts` does not exist.

- [ ] **Step 3: Write failing error mapping tests**

Create `apps/web/src/utils/errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { friendlyErrorMessage } from './errors'

describe('friendlyErrorMessage', () => {
  it('explains that assignment feedback requires a graded submission', () => {
    expect(friendlyErrorMessage('feedback_requires_grading')).toBe(
      '该提交尚未批改，批改后才能发起作业问题或反馈。',
    )
  })

  it('keeps service connection failures actionable', () => {
    expect(friendlyErrorMessage('Failed to fetch')).toBe('当前无法连接系统服务，请确认后端服务已启动。')
  })
})
```

- [ ] **Step 4: Run error tests to verify RED**

Run:

```bash
npm run test --workspace @course/web -- src/utils/errors.test.ts
```

Expected: FAIL because `apps/web/src/utils/errors.ts` does not exist.

- [ ] **Step 5: Write failing display-copy assertions**

Modify `apps/web/src/display-copy.test.ts` to include:

```ts
it('contains redesigned workflow copy', () => {
  expect(appSource).toContain('当前工作上下文')
  expect(appSource).toContain('课程 / 作业 / 提交')
  expect(appSource).toContain('我的作业')
  expect(appSource).toContain('待回复反馈')
})
```

- [ ] **Step 6: Run display-copy test to verify RED**

Run:

```bash
npm run test --workspace @course/web -- src/display-copy.test.ts
```

Expected: FAIL because the new workflow copy is not yet in `App.tsx`.

- [ ] **Step 7: Implement domain types**

Create `apps/web/src/domain.ts`:

```ts
export type UserRole = 'student' | 'teacher' | 'officer'

export type CourseItem = {
  id: string
  courseCode: string
  courseName: string
  teacherId: string
  semester: string
  description: string
  location: string
  scheduleText: string
  capacity: number
  startDate?: string | null
  endDate?: string | null
  status: string
}

export type AssignmentItem = {
  id: string
  courseId: string
  title: string
  description: string
  requirement: string
  startAt: string
  dueAt: string
  status: string
  hasSubmitted?: boolean
  mySubmission?: SubmissionItem | null
}

export type SubmissionItem = {
  id: string
  assignmentId: string
  studentId: string
  studentName?: string | null
  studentNo?: string | null
  content: string
  status: string
  score: number | null
  teacherFeedback: string | null
  submittedAt: string | null
  gradedAt: string | null
}

export type FeedbackResponseItem = {
  id: string
  feedbackId: string
  teacherId: string
  teacherName?: string | null
  content: string
  createdAt: string
  updatedAt: string
  editedAt?: string | null
}

export type FeedbackItem = {
  id: string
  assignmentId: string
  submissionId: string
  studentId: string
  studentName?: string | null
  studentNo?: string | null
  courseName?: string | null
  courseCode?: string | null
  assignmentTitle?: string | null
  submissionStatus?: string | null
  kind: 'question' | 'feedback'
  content: string
  status: string
  createdAt: string
  updatedAt: string
  responses: FeedbackResponseItem[]
}

export type CourseFeedbackItem = {
  id: string
  courseId: string
  courseName: string
  studentId: string
  studentName?: string | null
  studentNo?: string | null
  dimension: 'content' | 'method' | 'teaching' | 'gain' | 'other'
  content: string
  status: string
  createdAt: string
  updatedAt: string
}

export type WorkspaceContext = {
  course: CourseItem | null
  assignment: AssignmentItem | null
  submission: SubmissionItem | null
}
```

- [ ] **Step 8: Implement date utilities**

Create `apps/web/src/utils/date.ts`:

```ts
export function formatDateTimeForDisplay(value?: string | null) {
  if (!value) return '未设置'

  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function toDateTimeLocalValue(value?: string | null) {
  if (!value) return ''

  const date = new Date(value)
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

export function fromDateTimeLocalValue(value: string) {
  if (!value) return ''

  return new Date(value).toISOString()
}
```

- [ ] **Step 9: Implement error utilities**

Create `apps/web/src/utils/errors.ts`:

```ts
const friendlyMessages: Record<string, string> = {
  invalid_credentials: '手机号或密码不正确，请重新输入。',
  verification_code_not_found: '请先获取验证码。',
  verification_code_used: '验证码已失效，请重新获取。',
  verification_code_expired: '验证码已过期，请重新获取。',
  verification_code_invalid: '验证码不正确，请重新输入。',
  phone_already_registered: '该手机号已注册，可直接登录。',
  student_id_already_registered: '该学号已存在，请核对后重试。',
  validation_failed: '请检查填写内容后再提交。',
  already_enrolled: '你已加入该课程。',
  forbidden: '当前账号暂无此操作权限。',
  not_found: '未找到对应内容。',
  feedback_requires_grading: '该提交尚未批改，批改后才能发起作业问题或反馈。',
  submission_id_required: '请先选择一条提交记录。',
  internal_server_error: '系统暂时繁忙，请稍后再试。',
}

export function friendlyErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('failed to fetch')) {
    return '当前无法连接系统服务，请确认后端服务已启动。'
  }

  return friendlyMessages[normalized] ?? '当前操作暂时无法完成，请稍后再试。'
}
```

- [ ] **Step 10: Extract StatePanel**

Create `apps/web/src/components/ui/StatePanel.tsx`:

```tsx
type StatePanelProps = {
  title: string
  detail: string
}

export function StatePanel({ title, detail }: StatePanelProps) {
  return (
    <div className="state-panel">
      <span className="state-eyebrow">状态提示</span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}
```

Update `apps/web/src/App.tsx` to import and use this component, then remove the local duplicate component.

- [ ] **Step 11: Add WorkspaceContextBar**

Create `apps/web/src/components/layout/WorkspaceContextBar.tsx`:

```tsx
import type { AssignmentItem, CourseItem, SubmissionItem, WorkspaceContext } from '../../domain'

type WorkspaceContextBarProps = {
  context: WorkspaceContext
  courses: CourseItem[]
  assignments: AssignmentItem[]
  submissions: SubmissionItem[]
  onCourseChange: (courseId: string) => void
  onAssignmentChange: (assignmentId: string) => void
  onSubmissionChange: (submissionId: string) => void
}

export function WorkspaceContextBar({
  context,
  courses,
  assignments,
  submissions,
  onCourseChange,
  onAssignmentChange,
  onSubmissionChange,
}: WorkspaceContextBarProps) {
  return (
    <section className="context-bar" aria-label="当前工作上下文">
      <div>
        <p className="context-kicker">当前工作上下文</p>
        <h3>课程 / 作业 / 提交</h3>
      </div>
      <label>
        课程
        <select value={context.course?.id ?? ''} onChange={(event) => onCourseChange(event.target.value)}>
          <option value="">请选择课程</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.courseName} / {course.courseCode}
            </option>
          ))}
        </select>
      </label>
      <label>
        作业
        <select
          value={context.assignment?.id ?? ''}
          onChange={(event) => onAssignmentChange(event.target.value)}
          disabled={!context.course}
        >
          <option value="">请选择作业</option>
          {assignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        提交
        <select
          value={context.submission?.id ?? ''}
          onChange={(event) => onSubmissionChange(event.target.value)}
          disabled={!context.assignment || submissions.length === 0}
        >
          <option value="">请选择提交</option>
          {submissions.map((submission) => (
            <option key={submission.id} value={submission.id}>
              {submission.studentName ?? submission.studentNo ?? submission.studentId} / {submission.status}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
```

- [ ] **Step 12: Wire WorkspaceContextBar into App**

In `apps/web/src/App.tsx`, import `WorkspaceContextBar` and render it below the page notice for authenticated users:

```tsx
<WorkspaceContextBar
  context={{ course: selectedCourse, assignment: selectedAssignment, submission: selectedSubmission }}
  courses={visibleCourses}
  assignments={assignments}
  submissions={submissions}
  onCourseChange={(courseId) => {
    startTransition(() => {
      setSelectedCourseId(courseId || null)
      setSelectedAssignmentId(null)
      setSelectedSubmissionId(null)
    })
  }}
  onAssignmentChange={(assignmentId) => {
    startTransition(() => {
      setSelectedAssignmentId(assignmentId || null)
      setSelectedSubmissionId(null)
    })
  }}
  onSubmissionChange={(submissionId) => setSelectedSubmissionId(submissionId || null)}
/>
```

Keep existing course/assignment cards for now; they become alternate selection entry points.

- [ ] **Step 13: Add context bar CSS**

Add to `apps/web/src/App.css`:

```css
.context-bar {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) repeat(3, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: #ffffff;
  box-shadow: var(--shadow-soft);
}

.context-kicker {
  margin: 0 0 4px;
  color: var(--nuaa-blue);
  font-size: 0.75rem;
  font-weight: 800;
}

.context-bar h3 {
  margin: 0;
  font-size: 1rem;
}

.context-bar label {
  display: grid;
  gap: 6px;
  color: var(--text-soft);
  font-size: 0.8rem;
  font-weight: 760;
}

.context-bar select {
  min-width: 0;
}
```

- [ ] **Step 14: Replace assignment date inputs**

In `apps/web/src/App.tsx`, import date utilities and change assignment start/due inputs to:

```tsx
<input
  type="datetime-local"
  value={toDateTimeLocalValue(assignmentDraft.startAt)}
  onChange={(event) =>
    setAssignmentDraft((current) => ({
      ...current,
      startAt: fromDateTimeLocalValue(event.target.value),
    }))
  }
/>
```

Apply the same pattern to `assignmentDraft.dueAt`.

- [ ] **Step 15: Verify Task 1 tests pass**

Run:

```bash
npm run test --workspace @course/web -- src/utils/date.test.ts src/utils/errors.test.ts src/display-copy.test.ts
npm run typecheck --workspace @course/web
```

Expected: all pass.

- [ ] **Step 16: Commit Task 1**

Run:

```bash
git add apps/web/src/domain.ts apps/web/src/utils/date.ts apps/web/src/utils/date.test.ts apps/web/src/utils/errors.ts apps/web/src/utils/errors.test.ts apps/web/src/components/ui/StatePanel.tsx apps/web/src/components/layout/WorkspaceContextBar.tsx apps/web/src/App.tsx apps/web/src/App.css apps/web/src/display-copy.test.ts
git commit -m "feat(web): add workspace context selector"
```

---

### Task 2: Student Assignment Workflow

**Files:**
- Create: `apps/web/src/features/assignments/StudentAssignmentWorkspace.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.css`
- Modify: `apps/web/src/display-copy.test.ts`
- Modify: `apps/server/src/modules/assignments/routes.ts`
- Modify: `apps/server/tests/assignments.integration.test.ts`

- [ ] **Step 1: Write failing server test for student assignment submission summary**

In `apps/server/tests/assignments.integration.test.ts`, add a test that:

1. Creates a course, assignment and student enrollment.
2. Student submits an answer.
3. Student lists course assignments.
4. Expects the assignment item to include `hasSubmitted: true` and `mySubmission` with `id`, `status`, `score`, `teacherFeedback`, and `content`.

Expected assertion:

```ts
expect(item.hasSubmitted).toBe(true)
expect(item.mySubmission).toMatchObject({
  id: submissionId,
  status: 'submitted',
  content: '学生提交内容',
})
```

- [ ] **Step 2: Run server test to verify RED**

Run:

```bash
npm run test --workspace @course/server -- assignments.integration.test.ts
```

Expected: FAIL because assignment list currently only exposes `hasSubmitted`, not `mySubmission`.

- [ ] **Step 3: Implement assignment list submission summary**

In `apps/server/src/modules/assignments/routes.ts`, when actor role is student, join or query that student's submission for each assignment and return:

```ts
mySubmission: submission
  ? {
      id: submission.id,
      assignmentId: submission.assignment_id,
      studentId: submission.student_id,
      content: submission.content,
      status: submission.status,
      score: submission.score,
      teacherFeedback: submission.teacher_feedback,
      submittedAt: submission.submitted_at,
      gradedAt: submission.graded_at,
    }
  : null
```

- [ ] **Step 4: Write failing Web copy test**

Add to `apps/web/src/display-copy.test.ts`:

```ts
expect(appSource).toContain('提交与成绩')
expect(appSource).toContain('批改后可发起作业问题或反馈')
```

- [ ] **Step 5: Run Web copy test to verify RED**

Run:

```bash
npm run test --workspace @course/web -- src/display-copy.test.ts
```

Expected: FAIL until `StudentAssignmentWorkspace` is wired.

- [ ] **Step 6: Create StudentAssignmentWorkspace**

Create `apps/web/src/features/assignments/StudentAssignmentWorkspace.tsx` with props:

```tsx
import type { AssignmentItem, FeedbackItem } from '../../domain'
import { formatDateTimeForDisplay } from '../../utils/date'
import { StatePanel } from '../../components/ui/StatePanel'

type StudentAssignmentWorkspaceProps = {
  assignment: AssignmentItem | null
  feedbacks: FeedbackItem[]
  submissionContent: string
  feedbackKind: 'question' | 'feedback'
  feedbackContent: string
  isSubmitting: boolean
  isUpdating: boolean
  isPostingFeedback: boolean
  onSubmissionContentChange: (value: string) => void
  onSubmitAnswer: () => void
  onUpdateAnswer: () => void
  onFeedbackKindChange: (value: 'question' | 'feedback') => void
  onFeedbackContentChange: (value: string) => void
  onPostFeedback: () => void
}
```

The component must render:

- `我的作业`
- assignment title, requirement, due date
- `提交与成绩`
- submit/update buttons based on `assignment.mySubmission`
- a feedback form only when `assignment.mySubmission?.status === 'graded'`
- `批改后可发起作业问题或反馈` when not graded

- [ ] **Step 7: Wire StudentAssignmentWorkspace into App**

In student assignment view, replace the old separate “作业安排” plus “学习提交” layout with `StudentAssignmentWorkspace`. Keep the assignment list visible beside it or above it, but make the selected assignment detail the primary panel.

- [ ] **Step 8: Select mySubmission after assignment selection**

When student selects an assignment:

```tsx
setSelectedAssignmentId(assignment.id)
setSelectedSubmissionId(assignment.mySubmission?.id ?? null)
if (assignment.mySubmission?.content) {
  setSubmissionContent(assignment.mySubmission.content)
}
```

- [ ] **Step 9: Verify Task 2**

Run:

```bash
npm run test --workspace @course/server -- assignments.integration.test.ts
npm run test --workspace @course/web -- src/display-copy.test.ts
npm run typecheck --workspace @course/server
npm run typecheck --workspace @course/web
```

Expected: all pass.

- [ ] **Step 10: Commit Task 2**

Run:

```bash
git add apps/server/src/modules/assignments/routes.ts apps/server/tests/assignments.integration.test.ts apps/web/src/features/assignments/StudentAssignmentWorkspace.tsx apps/web/src/App.tsx apps/web/src/App.css apps/web/src/display-copy.test.ts
git commit -m "feat(web): streamline student assignment workflow"
```

---

### Task 3: Feedback Thread Overview API

**Files:**
- Modify: `apps/server/src/modules/feedback/routes.ts`
- Modify: `apps/server/tests/feedback.integration.test.ts`
- Modify: `apps/web/src/api.ts`
- Modify: `apps/web/src/domain.ts`
- Modify: `docs/API_SPEC.md`

- [ ] **Step 1: Write failing teacher feedback thread overview test**

In `apps/server/tests/feedback.integration.test.ts`, add:

```ts
it('lists feedback threads for the course teacher without requiring a selected submission')
```

The test should create a graded submission, student feedback, teacher login, then call:

```text
GET /api/v1/feedbacks/threads?courseId=<courseId>
```

Expected item fields:

```ts
expect(item).toMatchObject({
  courseId,
  courseName: '反馈课程',
  assignmentId,
  assignmentTitle: '反馈作业',
  submissionId,
  studentId,
  studentName: '反馈学生',
  studentNo: '162350130',
  kind: 'question',
  status: 'open',
})
```

- [ ] **Step 2: Write failing forbidden overview test**

Add:

```ts
it('prevents a teacher from listing feedback threads for another teacher course')
```

Expected: response status `403`.

- [ ] **Step 3: Run feedback tests to verify RED**

Run:

```bash
npm run test --workspace @course/server -- feedback.integration.test.ts
```

Expected: FAIL because `/feedbacks/threads` is missing.

- [ ] **Step 4: Implement GET /feedbacks/threads**

In `apps/server/src/modules/feedback/routes.ts`, add route before `app.get('/feedbacks', ...)`:

```ts
app.get('/feedbacks/threads', async (request) => {
  const actor = await requireAuth(request)
  const query = (request.query ?? {}) as { courseId?: string; assignmentId?: string; status?: string }
  const filters = ["feedbacks.status <> 'deleted'"]
  const params: string[] = []

  if (query.courseId) {
    filters.push('assignments.course_id = ?')
    params.push(query.courseId)
  }

  if (query.assignmentId) {
    filters.push('feedbacks.assignment_id = ?')
    params.push(query.assignmentId)
  }

  if (query.status) {
    filters.push('feedbacks.status = ?')
    params.push(query.status)
  }

  if (actor.role === 'student') {
    filters.push('feedbacks.student_id = ?')
    params.push(actor.sub)
  } else if (actor.role === 'teacher') {
    filters.push('assignments.teacher_id = ?')
    params.push(actor.sub)
  }

  const rows = context.database.prepare(`
    SELECT
      feedbacks.id,
      feedbacks.assignment_id,
      feedbacks.submission_id,
      feedbacks.student_id,
      feedbacks.kind,
      feedbacks.content,
      feedbacks.status,
      feedbacks.created_at,
      feedbacks.updated_at,
      submissions.status AS submission_status,
      assignments.title AS assignment_title,
      assignments.course_id,
      courses.course_name,
      courses.course_code,
      users.real_name AS student_name,
      users.student_no
    FROM feedbacks
    INNER JOIN submissions ON submissions.id = feedbacks.submission_id
    INNER JOIN assignments ON assignments.id = feedbacks.assignment_id
    INNER JOIN courses ON courses.id = assignments.course_id
    INNER JOIN users ON users.id = feedbacks.student_id
    WHERE ${filters.join(' AND ')}
    ORDER BY feedbacks.created_at DESC
  `).all(...params)

  // Load responses for returned feedback IDs and attach them.
})
```

Map returned rows to the `FeedbackItem` shape with course, assignment, submission and student display fields.

- [ ] **Step 5: Add Web API method**

In `apps/web/src/api.ts`, add:

```ts
listFeedbackThreads(
  baseUrl: string,
  token: string,
  filters: { courseId?: string; assignmentId?: string; status?: string } = {},
) {
  const query = new URLSearchParams()
  if (filters.courseId) query.set('courseId', filters.courseId)
  if (filters.assignmentId) query.set('assignmentId', filters.assignmentId)
  if (filters.status) query.set('status', filters.status)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return requestJson<{ items: Array<Record<string, unknown>> }>(baseUrl, `/feedbacks/threads${suffix}`, {
    token,
  })
}
```

- [ ] **Step 6: Update API docs**

In `docs/API_SPEC.md`, document:

```text
GET /api/v1/feedbacks/threads
Query: courseId, assignmentId, status
Roles: student, teacher, officer
Purpose: list assignment feedback threads without requiring a preselected submission.
```

- [ ] **Step 7: Verify Task 3**

Run:

```bash
npm run test --workspace @course/server -- feedback.integration.test.ts
npm run typecheck --workspace @course/server
npm run typecheck --workspace @course/web
```

Expected: all pass.

- [ ] **Step 8: Commit Task 3**

Run:

```bash
git add apps/server/src/modules/feedback/routes.ts apps/server/tests/feedback.integration.test.ts apps/web/src/api.ts apps/web/src/domain.ts docs/API_SPEC.md
git commit -m "feat(server): add feedback thread overview"
```

---

### Task 4: Teacher Task Workflow

**Files:**
- Create: `apps/web/src/features/teacher/TeacherTaskWorkspace.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.css`
- Modify: `apps/web/src/display-copy.test.ts`
- Modify: `apps/server/src/modules/submissions/routes.ts`
- Modify: `apps/server/src/modules/course-feedbacks/routes.ts`
- Modify: `apps/server/tests/submissions.integration.test.ts`
- Modify: `apps/server/tests/course-feedbacks.integration.test.ts`

- [ ] **Step 1: Write failing submission display field test**

In `apps/server/tests/submissions.integration.test.ts`, update the teacher submission list test to expect:

```ts
expect(item.studentName).toBe('提交学生')
expect(item.studentNo).toBe('162350120')
```

- [ ] **Step 2: Run submission test to verify RED**

Run:

```bash
npm run test --workspace @course/server -- submissions.integration.test.ts
```

Expected: FAIL because submission list currently returns internal `studentId` only.

- [ ] **Step 3: Add user display fields to submissions**

In `apps/server/src/modules/submissions/routes.ts`, join `users` in the list query and return `studentName` and `studentNo`.

- [ ] **Step 4: Write failing course feedback display field test**

In `apps/server/tests/course-feedbacks.integration.test.ts`, update teacher/officer list tests to expect:

```ts
expect(item.studentName).toBe('课程反馈学生')
expect(item.studentNo).toBe('162351110')
```

- [ ] **Step 5: Add user display fields to course feedbacks**

In `apps/server/src/modules/course-feedbacks/routes.ts`, join `users` and return display fields.

- [ ] **Step 6: Write failing Web copy test**

Add to `apps/web/src/display-copy.test.ts`:

```ts
expect(appSource).toContain('教师任务台')
expect(appSource).toContain('待批改提交')
expect(appSource).toContain('待回复反馈')
```

- [ ] **Step 7: Create TeacherTaskWorkspace**

Create `apps/web/src/features/teacher/TeacherTaskWorkspace.tsx` with props for:

- selected course/assignment/submission
- submissions
- feedbackThreads
- courseFeedbacks
- grade draft state
- response draft state
- callbacks for selecting submission, grading, selecting feedback, replying

It must render three sections:

```tsx
<h3>教师任务台</h3>
<section>待批改提交</section>
<section>待回复反馈</section>
<section>课程反馈</section>
```

Use student display as:

```tsx
submission.studentName ?? submission.studentNo ?? submission.studentId
```

- [ ] **Step 8: Add feedback thread query in App**

In `apps/web/src/App.tsx`, add:

```ts
const feedbackThreadsQuery = useQuery({
  enabled: Boolean(session?.user.role === 'teacher'),
  queryKey: ['feedbackThreads', apiBaseUrl, session?.accessToken, selectedCourseId, selectedAssignmentId],
  queryFn: async () => {
    if (!session) return { items: [] as FeedbackItem[] }
    const payload = await api.listFeedbackThreads(apiBaseUrl, session.accessToken, {
      courseId: selectedCourseId ?? undefined,
      assignmentId: selectedAssignmentId ?? undefined,
      status: 'open',
    })
    return { items: payload.items as FeedbackItem[] }
  },
})
```

- [ ] **Step 9: Wire TeacherTaskWorkspace into grading and interaction views**

For teacher role, use the same `TeacherTaskWorkspace` for `grading` and `interaction` views. The interaction tab should no longer show an empty state simply because `selectedSubmissionId` is missing.

- [ ] **Step 10: Verify Task 4**

Run:

```bash
npm run test --workspace @course/server -- submissions.integration.test.ts course-feedbacks.integration.test.ts
npm run test --workspace @course/web -- src/display-copy.test.ts
npm run typecheck --workspace @course/server
npm run typecheck --workspace @course/web
```

Expected: all pass.

- [ ] **Step 11: Commit Task 4**

Run:

```bash
git add apps/server/src/modules/submissions/routes.ts apps/server/src/modules/course-feedbacks/routes.ts apps/server/tests/submissions.integration.test.ts apps/server/tests/course-feedbacks.integration.test.ts apps/web/src/features/teacher/TeacherTaskWorkspace.tsx apps/web/src/App.tsx apps/web/src/App.css apps/web/src/display-copy.test.ts
git commit -m "feat(web): add teacher task workflow"
```

---

### Task 5: Visual and UX Polish

**Files:**
- Modify: `apps/web/src/App.css`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/features/assignments/StudentAssignmentWorkspace.tsx`
- Modify: `apps/web/src/features/teacher/TeacherTaskWorkspace.tsx`
- Modify: `apps/web/src/display-copy.test.ts`
- Modify: `docs/ACCEPTANCE_SELF_CHECK.md`

- [ ] **Step 1: Write failing copy constraints**

In `apps/web/src/display-copy.test.ts`, add assertions:

```ts
expect(appSource).not.toContain('学生：{feedback.studentId}')
expect(appSource).toContain('资料与安全')
expect(appSource).toContain('危险操作')
```

- [ ] **Step 2: Run Web copy test to verify RED**

Run:

```bash
npm run test --workspace @course/web -- src/display-copy.test.ts
```

Expected: FAIL until account page and feedback displays are updated.

- [ ] **Step 3: Replace internal ID displays**

In all Web feedback and submission cards, display:

```tsx
feedback.studentName ?? feedback.studentNo ?? feedback.studentId
```

and only keep internal ID as fallback.

- [ ] **Step 4: Split account page sections**

In `apps/web/src/App.tsx`, restructure account card headings:

- `资料与安全`
- `修改密码`
- `更换手机号`
- `危险操作`

Move account cancellation into the `危险操作` section.

- [ ] **Step 5: Refine CSS color and density**

Update `apps/web/src/App.css`:

- Reduce sidebar width from the current large width to a denser desktop rail.
- Keep dominant palette neutral white/blue, with green success and red danger used only for status.
- Use smaller summary cards and denser task lists.
- Ensure `.context-bar` stacks cleanly under `900px`.

- [ ] **Step 6: Update self-check docs**

In `docs/ACCEPTANCE_SELF_CHECK.md`, add Web verification notes:

```md
- 学生端：在“我的作业”内完成查看作业、提交答案、查看成绩、发起作业问题/反馈。
- 教师端：在“教师任务台”内完成待批改提交和待回复反馈处理。
- 课程反馈：教师和教务员列表显示学生姓名/学号，不显示内部用户 ID。
```

- [ ] **Step 7: Verify Task 5**

Run:

```bash
npm run test --workspace @course/web
npm run typecheck --workspace @course/web
npm run build --workspace @course/web
npm run lint --workspace @course/web
```

Expected: all pass.

- [ ] **Step 8: Commit Task 5**

Run:

```bash
git add apps/web/src/App.css apps/web/src/App.tsx apps/web/src/features/assignments/StudentAssignmentWorkspace.tsx apps/web/src/features/teacher/TeacherTaskWorkspace.tsx apps/web/src/display-copy.test.ts docs/ACCEPTANCE_SELF_CHECK.md
git commit -m "style(web): polish teaching workspace presentation"
```

---

### Task 6: Final Verification and Acceptance Notes

**Files:**
- Modify: `docs/TEST_REPORT.md`
- Modify: `docs/ACCEPTANCE_SELF_CHECK.md`

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run test
npm run typecheck --workspaces --if-present
npm run build --workspaces --if-present
npm run lint --workspaces --if-present
```

Expected: all pass.

- [ ] **Step 2: Update test report**

In `docs/TEST_REPORT.md`, add a 2026-05-18 entry with exact command results for:

- server feedback overview tests
- Web tests
- full workspace verification

- [ ] **Step 3: Update acceptance self-check**

In `docs/ACCEPTANCE_SELF_CHECK.md`, mark Web-only validation notes for:

- unified context selector
- student assignment workflow
- teacher task workflow
- feedback overview
- visual polish

- [ ] **Step 4: Commit final docs**

Run:

```bash
git add docs/TEST_REPORT.md docs/ACCEPTANCE_SELF_CHECK.md
git commit -m "docs: update web acceptance workflow"
```

---

## Self-Review

- Spec coverage: all five user-confirmed stages are covered by Tasks 1-5, with final verification in Task 6.
- Placeholder scan: no placeholder markers or vague implementation-only steps remain.
- Type consistency: shared Web types live in `apps/web/src/domain.ts`; feature components consume those types.
- Git granularity: each stage has its own commit message and scoped file list.
