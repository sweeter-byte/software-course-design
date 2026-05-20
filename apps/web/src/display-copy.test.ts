import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const appSource = readFileSync(path.resolve(currentDir, 'App.tsx'), 'utf8')
const roleShellSource = readFileSync(
  path.resolve(currentDir, 'components/layout/RoleShell.tsx'),
  'utf8',
)
const boundarySource = readFileSync(path.resolve(currentDir, 'error-boundary.tsx'), 'utf8')
const contextBarSource = readFileSync(
  path.resolve(currentDir, 'components/layout/WorkspaceContextBar.tsx'),
  'utf8',
)
const studentAssignmentSource = readFileSync(
  path.resolve(currentDir, 'features/assignments/StudentAssignmentWorkspace.tsx'),
  'utf8',
)
const teacherTasksRouteSource = readFileSync(
  path.resolve(currentDir, 'features/teacher/TeacherTasksRoute.tsx'),
  'utf8',
)
const teacherFeedbackThreadSource = readFileSync(
  path.resolve(currentDir, 'features/courseWorkspace/TeacherFeedbackThreadRoute.tsx'),
  'utf8',
)
const teacherCourseFeedbacksReadonlySource = readFileSync(
  path.resolve(currentDir, 'features/courseWorkspace/TeacherCourseFeedbacksReadonlyTab.tsx'),
  'utf8',
)
const teacherSubmissionDetailSource = readFileSync(
  path.resolve(currentDir, 'features/courseWorkspace/TeacherSubmissionDetailRoute.tsx'),
  'utf8',
)
const loginShellSource = readFileSync(
  path.resolve(currentDir, 'features/auth/LoginShell.tsx'),
  'utf8',
)
const accountSectionSource = readFileSync(
  path.resolve(currentDir, 'features/account/AccountSection.tsx'),
  'utf8',
)

describe('frontend display copy', () => {
  it('removes internal development wording from user-facing screens', () => {
    const combinedSource = `${appSource}\n${roleShellSource}\n${boundarySource}\n${loginShellSource}\n${accountSectionSource}`
    const bannedPhrases = [
      'API Base URL',
      '演示账号',
      '开发态',
      '后端现状',
      '接口测试已通过',
      '写后失效',
      '日志链路',
      '真实接口',
      '统一 API',
      '后端日志',
      'Live Session',
      '当前上下文',
    ]

    for (const phrase of bannedPhrases) {
      expect(combinedSource).not.toContain(phrase)
    }
  })

  it('keeps the page copy product-facing', () => {
    const productSource = `${appSource}\n${roleShellSource}\n${loginShellSource}\n${accountSectionSource}`
    expect(productSource).toContain('账号登录')
    expect(productSource).toContain('学生注册')
    expect(roleShellSource).toContain('使用指引')
    // Role-specific navigation labels live in App.tsx's roleNavigation map.
    expect(appSource).toContain('我的课程')
    expect(appSource).toContain('授课课程')
    expect(appSource).toContain('课程运营')
  })

  it('contains redesigned workflow copy', () => {
    const workflowSource = [
      appSource,
      contextBarSource,
      studentAssignmentSource,
      teacherTasksRouteSource,
      teacherFeedbackThreadSource,
      teacherCourseFeedbacksReadonlySource,
      teacherSubmissionDetailSource,
    ].join('\n')

    expect(workflowSource).toContain('当前工作上下文')
    expect(workflowSource).toContain('课程 / 作业 / 提交')
    expect(workflowSource).toContain('我的作业')
    expect(workflowSource).toContain('提交与成绩')
    expect(workflowSource).toContain('批改后可发起作业问题或反馈')
    // Teacher task-flow copy is now split across TeacherTasksRoute and the
    // course-workspace feedback thread route.
    expect(workflowSource).toContain('教学任务')
    expect(workflowSource).toContain('待批改提交')
    expect(workflowSource).toContain('未回答作业反馈')
    expect(workflowSource).toContain('教师回复')
  })
})
