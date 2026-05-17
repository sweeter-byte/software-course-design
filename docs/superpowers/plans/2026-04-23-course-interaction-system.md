# 课程互动管理系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个包含后端、Web、移动端、共享契约、日志与测试的课程互动管理系统首版。

**Architecture:** 采用 TypeScript monorepo，后端为单一事实源，Web 与移动端通过共享 DTO、统一 API client 与刷新策略保持一致；核心实体覆盖用户、课程、作业、提交、反馈与回复。

**Tech Stack:** Fastify, React, Expo React Native, TypeScript, Zod, TanStack Query, Vitest

---

### Task 1: Monorepo 骨架与共享配置

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `apps/server/package.json`
- Create: `apps/web/package.json`
- Create: `apps/mobile/package.json`
- Create: `packages/config/package.json`
- Create: `packages/types/package.json`
- Create: `packages/shared/package.json`
- Create: `packages/ui/package.json`

- [ ] 定义 npm workspaces 与统一脚本
- [ ] 增加 TypeScript 基础配置
- [ ] 配置共享依赖、lint、test、build 命令

### Task 2: 后端底座

**Files:**
- Create: `apps/server/src/app.ts`
- Create: `apps/server/src/lib/config/*`
- Create: `apps/server/src/lib/logging/*`
- Create: `apps/server/src/lib/errors/*`
- Create: `apps/server/src/lib/db/*`
- Test: `apps/server/tests/app.integration.test.ts`

- [ ] 写健康检查失败用例
- [ ] 建立 Fastify app、配置、日志与统一错误处理
- [ ] 建立数据库初始化与种子机制
- [ ] 运行集成测试验证基础 app 可启动

### Task 3: 认证与账号流程

**Files:**
- Create: `apps/server/src/modules/auth/*`
- Create: `apps/server/src/modules/users/*`
- Create: `apps/web/src/features/auth/*`
- Create: `apps/mobile/src/features/auth/*`
- Test: `apps/server/tests/auth.integration.test.ts`

- [ ] 先写注册、登录、改密、找回密码、注销的集成测试
- [ ] 实现验证码、密码哈希、会话与角色登录
- [ ] 在 Web 与移动端接入认证页面和角色跳转
- [ ] 验证学生注册与教师/教务员预置账号登录都能跑通

### Task 4: 课程与选课

**Files:**
- Create: `apps/server/src/modules/courses/*`
- Create: `apps/server/src/modules/enrollments/*`
- Create: `apps/web/src/features/courses/*`
- Create: `apps/mobile/src/features/courses/*`
- Test: `apps/server/tests/courses.integration.test.ts`

- [ ] 先写课程 CRUD、筛选查询和选课测试
- [ ] 实现教务员课程维护与学生加入课程
- [ ] 实现三角色课程列表与详情
- [ ] 验证“学生查看自己所选课程”主路径

### Task 5: 作业、提交与批改

**Files:**
- Create: `apps/server/src/modules/assignments/*`
- Create: `apps/server/src/modules/submissions/*`
- Create: `apps/web/src/features/assignments/*`
- Create: `apps/mobile/src/features/assignments/*`
- Test: `apps/server/tests/assignments.integration.test.ts`
- Test: `apps/server/tests/submissions.integration.test.ts`

- [ ] 先写发布作业、提交答案、修改答案、教师批改的测试
- [ ] 实现状态规则：截止、取消、已批改不可修改
- [ ] 在教师端实现发布/批改工作台
- [ ] 在学生端实现提交结果与成绩回显

### Task 6: 问题/反馈与答疑

**Files:**
- Create: `apps/server/src/modules/feedback/*`
- Create: `apps/server/src/modules/responses/*`
- Create: `apps/web/src/features/feedback/*`
- Create: `apps/mobile/src/features/feedback/*`
- Test: `apps/server/tests/feedback.integration.test.ts`

- [ ] 先写学生发布与教师回复的测试
- [ ] 实现 `kind=question|feedback` 的统一线程模型
- [ ] 实现学生编辑/删除自己的反馈、教师编辑/删除自己的回复
- [ ] 验证完整互动闭环

### Task 7: 仪表盘、日志与交付文档

**Files:**
- Create: `apps/server/src/modules/dashboard/*`
- Create: `docs/TEST_PLAN.md`
- Create: `docs/TEST_REPORT.md`
- Create: `docs/DEPLOYMENT.md`
- Create: `README.md`

- [ ] 接入角色首页摘要接口
- [ ] 完善日志落盘与审计记录
- [ ] 跑 lint、typecheck、test、build
- [ ] 更新文档并记录测试结果

