import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const appSource = readFileSync(path.resolve(currentDir, 'App.tsx'), 'utf8')
const boundarySource = readFileSync(path.resolve(currentDir, 'error-boundary.tsx'), 'utf8')
const contextBarSource = readFileSync(
  path.resolve(currentDir, 'components/layout/WorkspaceContextBar.tsx'),
  'utf8',
)
const studentAssignmentSource = readFileSync(
  path.resolve(currentDir, 'features/assignments/StudentAssignmentWorkspace.tsx'),
  'utf8',
)

describe('frontend display copy', () => {
  it('removes internal development wording from user-facing screens', () => {
    const combinedSource = `${appSource}\n${boundarySource}`
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
    expect(appSource).toContain('账号登录')
    expect(appSource).toContain('学生注册')
    expect(appSource).toContain('使用指引')
    expect(appSource).toContain('课程列表')
    expect(appSource).toContain('当前进度')
  })

  it('contains redesigned workflow copy', () => {
    const workflowSource = `${appSource}\n${contextBarSource}\n${studentAssignmentSource}`

    expect(workflowSource).toContain('当前工作上下文')
    expect(workflowSource).toContain('课程 / 作业 / 提交')
    expect(workflowSource).toContain('我的作业')
    expect(workflowSource).toContain('待回复反馈')
    expect(workflowSource).toContain('提交与成绩')
    expect(workflowSource).toContain('批改后可发起作业问题或反馈')
  })
})
