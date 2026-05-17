# Acceptance Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐《需求获取报告》中当前缺失的账号、课程、作业、提交、问题反馈、回答和课程反馈功能，使 29 个验收用例都有可演示实现。

**Architecture:** 保持现有 TypeScript monorepo 和 Fastify 模块边界。后端先补全 REST API 与集成测试，Web/Mobile 再接入同一套接口，最后更新需求追踪和测试报告。

**Tech Stack:** Fastify, React, Expo React Native, TypeScript, Zod, TanStack Query, Vitest, SQLite.

---

### Task 1: 账号与用户资料补齐

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/server/src/modules/auth/routes.ts`
- Create: `apps/server/src/modules/users/routes.ts`
- Modify: `apps/server/src/app.ts`
- Create: `apps/server/tests/profile.integration.test.ts`
- Modify: `apps/web/src/api.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/mobile/src/api.ts`
- Modify: `apps/mobile/App.tsx`

- [ ] **Step 1: Write failing profile tests**

Add tests for:

```ts
it('returns and updates current user profile')
it('changes password when old password is valid')
it('resets password with a reset_password verification code')
it('cancels account and blocks future login')
it('logs out the current session')
```

Run: `npm run test --workspace @course/server -- profile.integration.test.ts`
Expected: FAIL because `/api/v1/users/me`, `/auth/password/change`, `/auth/password/forgot`, `/auth/cancel-account`, and `/auth/logout` are missing.

- [ ] **Step 2: Add shared schemas**

Add Zod schemas for profile update, password change, forgot password, phone change, and account cancellation payloads.

- [ ] **Step 3: Implement auth routes**

Add:

```text
POST /auth/logout
POST /auth/password/forgot
POST /auth/password/change
POST /auth/phone/change
POST /auth/cancel-account
```

Reuse existing verification-code storage and password hashing helpers.

- [ ] **Step 4: Implement users routes**

Add:

```text
GET /users/me
PATCH /users/me
```

Only return and update the authenticated user.

- [ ] **Step 5: Verify backend**

Run:

```bash
npm run test --workspace @course/server -- profile.integration.test.ts
npm run test --workspace @course/server
npm run typecheck --workspace @course/server
```

Expected: all pass.

- [ ] **Step 6: Add Web and Mobile entry points**

Add API client methods and compact forms/buttons for profile update, password change, phone change, forgot password, logout, and cancellation.

### Task 2: 课程管理补齐

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/server/src/modules/courses/routes.ts`
- Modify: `apps/server/tests/courses.integration.test.ts`
- Modify: `apps/web/src/api.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/mobile/src/api.ts`
- Modify: `apps/mobile/App.tsx`

- [ ] Write failing tests for course detail, multi-filter query, update, and delete.
- [ ] Add update schema and query handling for `teacherId`, `semester`, `location`, `status`.
- [ ] Implement `GET /courses/:courseId`, `PATCH /courses/:courseId`, `DELETE /courses/:courseId`.
- [ ] Add Web/Mobile buttons for detail, update, and delete.
- [ ] Run course tests and typechecks.

### Task 3: 作业管理补齐

**Files:**
- Modify: `apps/server/src/modules/assignments/routes.ts`
- Modify: `apps/server/tests/assignments.integration.test.ts`
- Modify: `apps/web/src/api.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/mobile/src/api.ts`
- Modify: `apps/mobile/App.tsx`

- [ ] Write failing tests for assignment update and cancellation.
- [ ] Implement `PATCH /assignments/:assignmentId`.
- [ ] Implement `POST /assignments/:assignmentId/cancel` with required reason and submission cleanup.
- [ ] Add Web/Mobile controls.
- [ ] Run assignment tests and typechecks.

### Task 4: 提交与答案查询补齐

**Files:**
- Modify: `apps/server/src/modules/submissions/routes.ts`
- Modify: `apps/server/tests/submissions.integration.test.ts`
- Modify: `apps/web/src/api.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/mobile/src/api.ts`
- Modify: `apps/mobile/App.tsx`

- [ ] Write failing tests for submission detail, student access, answer update, and graded-update rejection.
- [ ] Implement `GET /submissions/:submissionId`.
- [ ] Implement `PATCH /submissions/:submissionId`.
- [ ] Ensure existing repeated POST does not allow overriding graded answers.
- [ ] Add Web/Mobile controls.
- [ ] Run submission tests and typechecks.

### Task 5: 问题/反馈与回答补齐

**Files:**
- Modify: `apps/server/src/modules/feedback/routes.ts`
- Modify: `apps/server/src/modules/responses/routes.ts`
- Modify: `apps/server/tests/feedback.integration.test.ts`
- Modify: `apps/web/src/api.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/mobile/src/api.ts`
- Modify: `apps/mobile/App.tsx`

- [ ] Write failing tests for feedback update/delete and response update/delete.
- [ ] Implement `PATCH /feedbacks/:feedbackId`.
- [ ] Implement `DELETE /feedbacks/:feedbackId`.
- [ ] Implement `PATCH /responses/:responseId`.
- [ ] Implement `DELETE /responses/:responseId`.
- [ ] Add Web/Mobile controls.
- [ ] Run feedback tests and typechecks.

### Task 5.5: 课程反馈补齐

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/server/src/lib/db/schema.ts`
- Create: `apps/server/src/modules/course-feedbacks/routes.ts`
- Modify: `apps/server/src/app.ts`
- Create: `apps/server/tests/course-feedbacks.integration.test.ts`
- Modify: `apps/web/src/api.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/mobile/src/api.ts`
- Modify: `apps/mobile/App.tsx`

- [ ] Write failing tests for course feedback create, update, list, delete, teacher view, and officer view.
- [ ] Add `course_feedbacks` table and `courseFeedbackSchema`.
- [ ] Implement `POST /courses/:courseId/course-feedbacks`.
- [ ] Implement `GET /course-feedbacks`.
- [ ] Implement `PATCH /course-feedbacks/:feedbackId`.
- [ ] Implement `DELETE /course-feedbacks/:feedbackId`.
- [ ] Add Web/Mobile controls.
- [ ] Run course feedback tests and typechecks.

### Task 6: 文档与全量验收

**Files:**
- Modify: `docs/API_SPEC.md`
- Modify: `docs/REQUIREMENTS_TRACEABILITY.md`
- Modify: `docs/TEST_REPORT.md`
- Create: `docs/ACCEPTANCE_SELF_CHECK.md`

- [ ] Update API list with all new endpoints.
- [ ] Convert planned requirement rows into completed rows with test locations.
- [ ] Add self-check table mapping 29 use cases to implementation and demo path.
- [ ] Run final verification:

```bash
npm run test --workspace @course/server
npm run typecheck --workspace @course/server
npm run typecheck --workspace @course/web
npm run typecheck --workspace @course/mobile
npm run build --workspace @course/server
npm run build --workspace @course/web
npm run lint --workspace @course/server
npm run lint --workspace @course/web
npm run lint --workspace @course/mobile
```

Expected: all pass.
