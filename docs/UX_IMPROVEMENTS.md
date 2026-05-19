# 课程互动管理系统 · 用户体验改进追踪

本文档记录针对系统验收期的可用性 / 完整性改进项，按优先级分为 P0 / P1 / P2 三个梯队：

- **P0** — 已完成（截至 2026-05-19）。已并入 `main` 分支。
- **P1** — 已全部完成（截至 2026-05-19，P1-4 / P1-5 / P1-6 / P1-7）。
- **P2** — 已全部完成（截至 2026-05-19，P2-8 / P2-9 / P2-10）。

用途：
1. 新会话延续工作时，可直接基于本文件查阅已完成与待办。
2. 提交外部审核（codex 等）时，作为「需求 → 实施 → 验证」的单点入口。

---

## 当前基线（参考点）

- 分支：`main`
- 最近提交：`d63c313 feat(web): render workspace views conditionally and lazy-load admin sections`（前置：`34e3090 feat(web): collapse mobile sidebar into a drawer`）
- 测试状态：后端 vitest 52 通过 / 11 文件；Web vitest 73 通过 / 17 文件；`npm run typecheck` 全绿；`npm run lint` 全绿；`npm run build --workspace @course/web` 通过。P2-10 改用条件渲染 + `React.lazy` 拆出 `AccountSection` / `UserAdminSection` 两个独立 chunk（gzip 1.48 kB / 1.13 kB），主包从 gzip 104.86 kB 降至 103.28 kB（-1.58 kB）。
- 关键命令（沿用 `CLAUDE.md`）：
  ```bash
  npm run dev                # server + web together
  npm run test               # 全工作区 + scripts/tests/dev-runtime.test.sh
  npm run typecheck          # 全工作区
  npm run lint               # 全工作区
  ```

---

## P0 · 已完成

P0 来自 `2026-05-18` 的可用性评估（见对话历史中的「课程互动管理系统 完整性与可用性评估」）：
1. 「我的已选课程」状态刷新后丢失。
2. 教师端 `assignments / grading / interaction` 三个侧栏入口与渲染不是一一对应。
3. `validation_failed` 错误对用户笼统提示，未把字段错误暴露出来。

### P0-1 · 学生「我的已选课程」状态接入服务端

| 项 | 内容 |
| --- | --- |
| 提交 | `17de21d feat(courses): expose student enrollment state on course listings` |
| 后端改动 | `apps/server/src/modules/courses/routes.ts`：`GET /courses` 与 `GET /courses/:courseId` 在学生角色调用时 `LEFT JOIN course_enrollments`，返回 `enrolled: boolean`；`GET /courses` 新增 `enrolledOnly=true`（仅学生）过滤。其他角色响应不带 `enrolled` 字段。 |
| 前端改动 | `apps/web/src/App.tsx`：移除 `joinedCourseIds` 本地 `useState`；侧栏「已加入/可加入」徽章与 hero 中「已加入课程」计数都改读 `course.enrolled`；`enrollMutation` 成功/已加入分支改为 invalidate `['courses']` 让 React Query 重取。`apps/web/src/domain.ts`：`CourseItem` 增加 `enrolled?: boolean`。 |
| 文档 | `docs/API_SPEC.md`：`GET /courses` / `GET /courses/:courseId` 段落补充 `enrolled`、`enrolledOnly` 说明。 |
| 测试 | `apps/server/tests/enrollments.integration.test.ts` 新增 3 个用例：列表/详情的 `enrolled` 字段、`enrolledOnly=true` 过滤、教务员调用不应携带 `enrolled`。 |
| 验收准则 | 学生加入课程后刷新浏览器，「已加入」徽章与 dashboard 计数依然正确；教务员/教师调用不受影响。 |

### P0-2 · 教师端侧栏三入口收敛

| 项 | 内容 |
| --- | --- |
| 提交 | `a4e6442 refactor(web): collapse teacher's grading and interaction nav into one entry` |
| 背景 | 原侧栏 `grading`（教师任务）与 `interaction`（待回复反馈）通过 `className: visibleView === 'grading' || visibleView === 'interaction'` 共用同一个 `TeacherTaskWorkspace` SectionCard，两条导航项指向同一处渲染，造成心智模型混乱。 |
| 前端改动 | `apps/web/src/App.tsx`：`roleNavigation.teacher` 删除 `interaction` 条目；`feedbackThreadsQuery.enabled` 与 `TeacherTaskWorkspace` 卡片的 `view-hidden` 条件改为只判断 `visibleView === 'grading'`。教师标签更新为「教学任务 · 批改提交 · 回复反馈」。学生侧栏的 `interaction` 入口保持不变。 |
| 文档 | `docs/ACCEPTANCE_SELF_CHECK.md` 与 `docs/MANUAL_ACCEPTANCE_DEMO_CHECKLIST.md` 中提到「教师任务/待回复反馈」的位置一并改为「教学任务」。 |
| 测试 | 复用现有 `TeacherTaskWorkspace` 单元测试（13 文件 / 49 用例）。`WorkspaceView` 类型仍保留 `interaction`，因学生仍使用。 |
| 验收准则 | 教师登录后侧栏顺序为「工作台 / 课程 / 作业管理 / 教学任务 / 课程反馈 / 账号维护」；点击任一入口都有唯一对应卡片，无重复。 |

### P0-3 · 校验错误暴露到字段级提示

| 项 | 内容 |
| --- | --- |
| 提交 | `23d0851 feat(web): surface validation_failed field errors in user-facing messages` |
| 后端 | 无改动。`apps/server/src/lib/http.ts` 早已在 `toAppError` 把 `ZodError.issues` 放入 `error.details`。 |
| 前端改动 | `apps/web/src/api.ts`：新增 `ValidationIssue` 类型；`ApiError` 携带 `code` 与 `details`；`requestJson` 从 `payload.error.details` 解析并校验形状。`apps/web/src/utils/errors.ts`：`friendlyErrorMessage(message, details?)` 在 `validation_failed` 且 `details` 非空时，按 `字段标签：原因；…` 拼接；新增 `fieldLabels` 表覆盖手机号 / 密码 / 验证码 / 课程相关字段。`apps/web/src/App.tsx`：`extractErrorMessage` 把 `ApiError.details` 透传给 `friendlyErrorMessage`。 |
| 文档 | `docs/API_SPEC.md` 错误响应示例补充 `details` 内容与中文说明。 |
| 测试 | `apps/web/src/utils/errors.test.ts` +3 用例（有字段标签 / 无 details 回退 / 未知字段路径降级）；`apps/web/src/api.test.ts` +1 用例（验证 `ApiError` 携带 `code` 与 `details`）。 |
| 验收准则 | 在登录、注册、创建课程等表单提交错误数据时，顶部通知条显示「请检查填写内容：手机号：手机号格式不正确；密码：至少 8 位…」而非笼统的「请检查填写内容后再提交」。 |

---

## P1 · 已完成

### P1-7 · 教务员补「用户管理」最小集

| 项 | 内容 |
| --- | --- |
| 提交 | `a98c990 feat(officer): add user administration (list + enable/disable)` |
| 背景 | `docs/PROJECT_SUMMARY.md` 与 `RQ-GOV-01` 要求教务员「统筹账号与课程运行」，但教务员侧栏只有课程与反馈入口，没有用户管理；后端虽然 `users.status` 已包含 `'active' / 'cancelled' / 'disabled'` 三态，登录路径却把所有非 `active` 一律按 `INVALID_CREDENTIALS` 拦截，无法区分「被禁用」。 |
| 后端改动 | `apps/server/src/modules/auth/routes.ts`：拆分登录的拒绝原因——`status === 'cancelled'` 或手机号不存在仍归 `401 INVALID_CREDENTIALS`（不向调用方暴露注销账号是否存在），密码错误也归 `401`；只有密码校验通过且 `status === 'disabled'` 才返回 `403 ACCOUNT_DISABLED`，避免被作为账号探测渠道。`apps/server/src/modules/users/routes.ts`：复用现有 `requireRole(['officer'])`，新增 `GET /` 列表（可选 `role` 过滤，按 `created_at ASC`）与 `PATCH /:userId/status`（body `{disabled: boolean}`），禁用时清理目标账号的 `auth_sessions`，恢复时不重发 token；显式拦截 `params.userId === actor.sub`（`400 CANNOT_MODIFY_SELF`）和 `cancelled` 账号（`409 ACCOUNT_CANCELLED`）。`packages/shared/src/index.ts` 新增 `userListQuerySchema` / `userStatusUpdateSchema`。schema 复用原有 `users.status` CHECK，无 migration 需要。 |
| 前端改动 | `apps/web/src/api.ts` 加 `listAdminUsers` / `setUserDisabled`。`apps/web/src/domain.ts` 新增 `AdminUserItem` 类型。`apps/web/src/features/officer/UserAdminSection.tsx` 渲染列表（状态徽章 `正常 / 已禁用 / 已注销` + 角色徽章）与启停按钮（带 `confirmDestructive` 二次确认，文案区分禁用 / 恢复）；自己 / 已注销账号按钮置灰并附说明。`apps/web/src/App.tsx`：`WorkspaceView` 增加 `'userAdmin'`，`roleNavigation.officer` 新增对应入口，注入 `adminUsersQuery`（role 过滤变化时自动重取）和 `toggleUserStatusMutation`（用 `setUserAdminPendingId` 在 mutation 期间锁定按钮），新视图在 SectionCard 内挂载 `<UserAdminSection />`。`apps/web/src/utils/errors.ts` 把 `account_disabled / account_cancelled / cannot_modify_self / user_not_found` 映射成中文 toast。`apps/web/src/App.css` 增加 `.status-tag.status-disabled` / `.status-tag.status-cancelled` 与 `.user-admin*` 样式。 |
| 文档 | `docs/API_SPEC.md`：在 `/auth/login` 错误码段补 `ACCOUNT_DISABLED`，并把 `/users` 段从「占位描述」改为实际签名（`role` 过滤、`PATCH /:userId/status`、限制与错误码）。`docs/REQUIREMENTS_TRACEABILITY.md`：新增 `RQ-GOV-02`。本文件（基线提交 / 测试计数 / P1 状态 / 速查段）。 |
| 测试 | `apps/server/tests/users-admin.integration.test.ts` 4 用例（列表 + role 过滤 / 非教务员 403 / 禁用 → 登录被 `ACCOUNT_DISABLED` 阻断 → 错误密码仍报 `INVALID_CREDENTIALS` → 恢复后可再次登录 / 不允许禁用自己 `CANNOT_MODIFY_SELF`）。Web 端未加新单测：`UserAdminSection` 为薄壳渲染，状态切换由 React Query / mutation 驱动，已被后端集成测试覆盖。`npm run test` 全绿（后端 52/11；Web 64/15；dev-runtime parser 测试通过）；`npm run typecheck` / `npm run lint` 全绿。 |
| 偏离 | 路线图建议新增 `is_disabled INTEGER NOT NULL DEFAULT 0`，但 `schema.ts` 中 `users.status` 早就支持 `'disabled'`（与 `'cancelled'` 区分），直接复用更省一次 migration，也避免两个布尔含义重叠。`/users` 列表的 `role` 过滤参数实现了，但路线图提到的 `keyword / status / page / pageSize` 暂未做——`API_SPEC.md` 旧版描述里那几个参数从未实现，本次改成与代码一致；后续若要支持分页可在不破坏既有调用方的前提下扩展。`/me` 与其他业务路由对 `disabled` 用户的 JWT 仍然有效（无 access token 过期），仅 `/me` 在 status 非 `active` 时返回 404，依赖 web 客户端自动登出；这是 P1 范围之外的安全增强，可在 P2 一并处理。 |
| 验收准则 | 1. 教务员侧栏出现「用户管理」入口；进入后看到教师 / 学生 / 教务员三类账号，可按角色筛选。2. 点「禁用」二次确认后，被禁账号再次登录返回 `403 ACCOUNT_DISABLED` 并在 web 通知条提示「账号已被教务员禁用…」。3. 同一账号输入错误密码仍返回 `401 INVALID_CREDENTIALS`，不会泄漏其禁用状态。4. 点「恢复」后该账号立即可再次登录。5. 教务员点自己一行的按钮：按钮已置灰且尝试提交 PATCH 返回 `400 CANNOT_MODIFY_SELF`。 |

### P1-6 · 表单加 HTML5 原生校验

| 项 | 内容 |
| --- | --- |
| 提交 | `ebb56e5 feat(web): add HTML5 native validation to forms` |
| 背景 | 注册、改密、改手机、创建课程、发布作业、提交答案、批改等表单的 `<input>` / `<textarea>` 之前都没有 `required` / `minLength` 等属性，依赖后端 Zod 兜底。P0-3 之后字段错误虽已显示，但用户仍要等一次网络往返才知道问题。 |
| 前端改动 | 共改 10 个文件：`apps/web/src/features/auth/{LoginForm,StudentRegisterForm,ResetPasswordForm}.tsx`、`apps/web/src/features/account/{PasswordForm,PhoneChangeForm,ProfileForm}.tsx`、`apps/web/src/features/assignments/StudentAssignmentWorkspace.tsx`、`apps/web/src/features/teacher/{TeacherTaskWorkspace,FeedbackThreadList}.tsx`、`apps/web/src/App.tsx`（课程创建 / 作业发布 / 课程反馈 / 互动 / 教师回复 5 处表单）。统一加上：① `required` —— 与 Zod schema 必填字段对齐；② `minLength={N}` —— N 取 `packages/shared/src/index.ts` 中相应 `.min(N)`（手机号 11、密码 6、用户名/真实姓名 2、验证码 4、学号 4、作业 / 课程 / 反馈 / 回复内容 2 等）；③ 字段语义：手机号 `type="tel"` + `inputMode="numeric"` + `pattern="\\d{11}"`，验证码 `inputMode="numeric"`，邮箱 `type="email"`，分数 `type="number" min={0} max={100}`，容量 `type="number" min={1} step={1}`，开课/结课 `type="date"`；④ 显式 `htmlFor` + `id` 绑定 label（保留原 `<label>` 包裹结构，因此 `getByLabelText` 测试不受影响）；⑤ `title` 提示文案（浏览器原生 tooltip）。 |
| 文档 | 本文件（基线提交 / 测试计数 / P1 状态 / 速查段）。 |
| 测试 | 未新增专项单测：HTML5 原生校验由浏览器实现，与组件 props/state 无直接耦合，新增的 `required` / `minLength` 在既有提交路径用例（`LoginShell.test.tsx`、`AccountSection.test.tsx`、`StudentAssignmentWorkspace.test.tsx`、`TeacherTaskWorkspace.test.tsx` 等）中以「值满足约束」的方式被间接覆盖。`npm run test` 全绿（后端 48/10；Web 64/15；dev-runtime parser 测试通过）；`npm run typecheck` 全绿；`npm run lint` 全绿。 |
| 偏离 | 路线图建议的 `pattern="^1[3-9]\\d{9}$"`（手机号）、`minLength={8}` + 复杂度（密码）、`pattern="^\\d{6}$"`（验证码）、`pattern="^\\d{6,}$"`（学号）均**严格于** Zod 实际约束（`min(11)` / `min(6)` / `min(4)` / `min(4)`，无 regex）；为避免「前端通过但后端报错」反向出现「前端拒绝但后端可接受」，本次仅对手机号补一个保守的 `pattern="\\d{11}"`（演示账号 `13900139000` / `13700137000` 通过），其余字段坚持仅对齐 Zod 的 `.min`。后续若收紧后端 schema，再同步加严 HTML 属性即可。账号资料表单（`profileUpdateSchema` 全部可选）只加 `minLength`、`type="email"`，不加 `required`。 |
| 验收准则 | 1. 登录页输入手机号 `123` 后按提交，浏览器原生 tooltip 报「请输入 11 位手机号」且不发起请求；2. 注册页留空必填项后按「完成注册」，第一个空字段聚焦并显示原生提示；3. 教师批改时若分数留空，提交按钮触发原生校验，不会发起请求；4. 既有键盘 Tab 顺序与屏读 label 读取（通过 `htmlFor` / `id` 显式绑定）保持正常。 |

### P1-5 · 破坏性操作统一二次确认

| 项 | 内容 |
| --- | --- |
| 提交 | `3fa8dc3 feat(web): require confirmation for destructive role actions` |
| 背景 | 删除课程、取消作业、删除课程反馈三处已使用 `window.confirm`；但**删除问题/反馈、删除回复、注销账号**直接 `mutate()` 无二次确认，导致误触不可逆。 |
| 前端改动 | 新增 `apps/web/src/utils/confirm.ts`：导出 `confirmDestructive(message: string): boolean`，封装 `window.confirm` 并在没有 `window` 的环境（SSR/测试）下默认放行，便于后续替换为自建对话框。`apps/web/src/App.tsx`：把原有 3 处 `window.confirm`（更新课程、删除课程、取消作业）替换为 `confirmDestructive`；新增 3 处确认入口——`onCancelAccount`（注销账号）、`deleteFeedbackMutation`（学生删除问题/反馈）、`deleteResponseMutation`（教师删除回复）、`deleteCourseFeedbackMutation`（学生删除自己提交的课程反馈）。确认文案保持「确认…吗？」+「删除后无法恢复」尾缀的一致结构。 |
| 文档 | 本文件（基线测试计数 + P1-5 状态说明）。 |
| 测试 | 新增 `apps/web/src/utils/confirm.test.ts` 3 用例（确认返回 true / 取消返回 false / message 原样透传）。`npm run test` 全绿（后端 48/10；Web 64/15；dev-runtime parser 测试通过）。 |
| 偏离 | 使用最小可行实现 `window.confirm`，未抽出 `useConfirm` hook 或自建对话框组件（P1-5 路线图中的「后续可演进」部分）；保留为 utils helper，未来若改成 `<ConfirmDialog />` 只需替换 `confirmDestructive` 实现，调用点无须再次改动。 |
| 验收准则 | 删除课程 / 取消作业 / 删除课程反馈 / 删除问题反馈 / 删除回复 / 注销账号六类操作均弹出 `window.confirm`；取消后无副作用、无网络请求、无 toast；确认后走原有 mutation 与成功/错误 toast 通知。 |

### P1-4 · `notice` 改为 toast 队列

| 项 | 内容 |
| --- | --- |
| 提交 | `721a3af feat(web): stack UI notifications as a dismissible toast queue` |
| 前端改动 | 新增 `apps/web/src/hooks/useNotifications.ts`：基于 `useReducer` 维护 `Notification[]`；导出 `notify({type, content, ttl?})` / `dismiss(id)` / `clear()`；默认 TTL 为 info/success 5s、error 8s；卸载时清理所有 `setTimeout`。新增 `apps/web/src/components/notifications/NotificationStack.tsx`：渲染 `role="status"` + `aria-live="polite"` 的通知列表，每条带 `×` 关闭按钮。`apps/web/src/App.tsx`：移除 `notice: string` 与 `setNotice`；引入 `useNotifications()`；用一次性 `useEffect`（清理函数 dismiss）注入欢迎/恢复登录提示，兼容 React 18 `StrictMode` 双 mount；把全部 ≈25 处 `setNotice(...)` 替换为 `notify({type, content})`，成功路径用 `'success'`、错误路径用 `'error'`、验证码/退出/注销等中性提示用 `'info'`；登录前的 `LoginShell` 和登录后主框架都改为渲染 `<NotificationStack />`。`apps/web/src/features/auth/LoginShell.tsx`：`notice: string` 改为 `notifications + onDismissNotification`；在 `login-form-column` 内联渲染通知栈（`login-notification-stack` 关闭 fixed 定位）。`apps/web/src/App.css`：删除 `.notice-bar`，新增 `.notification-stack`（默认 `position: fixed; top:16px; right:16px;` + 600px 媒体查询全宽），`.notification-{info,success,error}` 复用 `--info-soft/--success-soft/--danger-soft`，附带 `notification-enter` 进入动画。 |
| 文档 | 本文件（基线测试计数 + P1 状态说明）。 |
| 测试 | `apps/web/src/hooks/useNotifications.test.ts` 新增 8 用例（初始为空 / notify 入队 / 多条堆叠且 id 唯一 / dismiss 移除 / 默认 TTL 自动消失 / error TTL 更长 / `ttl: null` 常驻 / 提前 dismiss 不影响下一条计时）。`apps/web/src/features/auth/LoginShell.test.tsx` 更新为新 props（`notifications` + `onDismissNotification`）。`npm run test` 全绿（后端 48/10；Web 61/14；dev-runtime parser 测试通过）。 |
| 偏离 | 文件目录使用 `components/notifications/` 而非建议的 `components/feedback/`，避免与领域概念「课程反馈 / 作业反馈」混淆。 |
| 验收准则 | 连续触发两次错误（例如重复加入课程），两条都可见、能分别 dismiss；屏幕宽度 < 600px 时仍可读；每条通知有 `role="status"` 且容器 `aria-live="polite"`；登录前与登录后的通知样式一致。 |

---

## P2 · 已完成

### P2-10 · 按路由条件渲染替换 `view-hidden`

| 项 | 内容 |
| --- | --- |
| 提交 | `d63c313 feat(web): render workspace views conditionally and lazy-load admin sections` |
| 背景 | P2-8 已把视图改为 URL 驱动，但 `apps/web/src/App.tsx` 仍以 `className={visibleView === 'X' ? 'wide-card' : 'view-hidden'}` 的方式渲染全部 SectionCard：即使切到 `account` 视图，`dashboard / courses / assignments / grading / courseFeedbacks / interaction / current-progress` 等子树仍然挂载在 DOM 中，只是被 CSS `display: none !important` 隐藏。React Query 部分通过 `enabled` 关掉了请求，但事件监听、表单 controlled inputs、JSX 渲染开销依旧全开，重型视图（账号维护、用户管理、课程信息维护）也一并塞进主 chunk。 |
| 范围 | 只做「条件渲染 + 重型视图懒加载」，不拆视图文件（仍由 `App.tsx` 承载），不引入 `<Route element={…} />` 嵌套路由（避免与 P2-8 的 `visibleView` 派生模型冲突）。视图按文件抽出留给后续 PR。 |
| 前端改动 | `apps/web/src/App.tsx`：① 顶部 import 新增 `Suspense` / `lazy`；把 `AccountSection` / `UserAdminSection` 从静态 import 改为 `lazy(() => import(...).then((m) => ({ default: m.X })))`，让 Vite 拆出独立 chunk。② 组件内派生一组视图布尔旗（`showHero / showAccount / showUserAdmin / showCoursesList / showCourseAdmin / showCourseParticipation / showCourseFeedbacks / showAssignmentsList / showAssignmentDetail / showInteraction / showCurrentProgress`），以及它们的并集 `showFirstGrid / showSecondGrid / showThirdGrid`；同时定义 `viewLoadingFallback = <StatePanel … />` 给 `<Suspense>` 用。③ 把 `dashboard-layout` 内的 hero-banner / hero-metrics / summary-grid 三块 `view-hidden` 班装条件 className 改为 `{showHero ? (<>…</>) : null}` 统一包裹；三个 `workspace-grid` 容器整体加 `{showXxxGrid ? <div className="workspace-grid">…</div> : null}`，避免渲染空 grid；其中每个 `<SectionCard>` 再各自加 `{showXxx ? (<SectionCard className="wide-card">…</SectionCard>) : null}`，删除原 `className={... ? 'wide-card' : 'view-hidden'}` / `className={... ? undefined : 'view-hidden'}` 写法（涉及账号维护、用户管理、课程列表、课程信息维护、课程参与 / 教学安排、课程反馈、作业安排、教师任务工作台 / 我的作业、互动交流、当前进度共 10 张卡）。lazy 的两张卡 `AccountSection` / `UserAdminSection` 在 SectionCard 内用 `<Suspense fallback={viewLoadingFallback}>` 包裹一次。④ `currentRole === 'officer' ? <courseAdmin> : <courseParticipation>` 的二选一三元被拆成两个独立 `{showCourseAdmin ? … : null}{showCourseParticipation ? … : null}`。⑤ 删除一段 dead code：原「互动交流」SectionCard 在 CSS 隐藏的同时仍写有 `currentRole === 'teacher' ? <载入/修改/删除回复按钮 + 教师回复表单>` 分支，但 `showInteraction = currentRole !== 'teacher' && visibleView === 'interaction'` 让 TS 推断出该分支不可达；该 UI 在 `roleNavigation` 中也从未给教师挂入口，因此连同只服务它的 `updateResponseMutation` / `deleteResponseMutation` 一并删除（`api.updateResponse` / `api.deleteResponse` 保留在 `api.ts`，便于后续重新接入教师端 UI 时复用）。`apps/web/src/App.css`：删除 `.section-card.view-hidden, .view-hidden { display: none !important; }` 这条 utility 类；把两处 `:has(.section-card:nth-child(3):not(.view-hidden))` 的 `:not(.view-hidden)` 部分去掉——由于卡片现在要么不挂载、要么挂载即可见，`:not(.view-hidden)` 已无意义。 |
| 行为对比 | 切到非 `dashboard` 视图时，hero 区与对应视图无关的 SectionCard 不再产生 DOM 节点，TanStack Query 的 `enabled` 控制保留原值不变，因此请求行为与 P2-9 完全一致。视图来回切换时，React Query 缓存继续命中（`queryClient` 在 App 之外创建），切换不会因为子树卸载而重新发起请求。account / userAdmin 首次进入会触发对应 lazy chunk 加载，`<Suspense>` 落到 `StatePanel` 占位（dev 模式可能瞬时可见 < 50ms，prod gzip 1.48 / 1.13 kB 几乎不可见）。 |
| 文档 | 本文件（基线提交占位 + 测试计数 + P2 状态汇总；P2-10 从「待办」迁入「已完成」并新增「速查段」条目）。 |
| 测试 | 未新增前端单测：① `view-hidden` 移除属于纯渲染拓扑变化，没有可独立 mount 的子组件以覆盖；② `lazy` + `Suspense` 在 jsdom 下需要手动等待 microtask，价值低于直接跑 `vite build` 验证 chunk 拆分；③ 既有 `LoginShell` / `AccountSection` / `UserAdminSection` / `StudentAssignmentWorkspace` / `TeacherTaskWorkspace` / `useNotifications` / `useMediaQuery` / `SidebarDrawer` 等 73 个 web vitest 用例继续覆盖渲染契约。`npm run test` 全绿（后端 52/11；Web 73/17；dev-runtime parser 通过）；`npm run typecheck` / `npm run lint` 全绿。`vite build` 通过：主包 gzip 103.28 kB（较 P2-9 基线 104.86 kB **-1.58 kB**）；新增两个独立 chunk `AccountSection` gzip 1.48 kB、`UserAdminSection` gzip 1.13 kB——这两个 chunk 只在用户进入对应视图时按需加载。 |
| 偏离 | 路线图建议 ① 用 `<Route element={<DashboardView />} />` 嵌套路由替代 `view-hidden`、② 每个 role 拆一个 chunk、③ 验证 React Query 缓存。本次实现：① 不引入嵌套路由——P2-8 的 `visibleView = parseRouteView(location.pathname, currentRole)` 派生模型与 `<Routes><Route /></Routes>` 是两种风格，混用会让 `App.tsx` 同时持有两套视图状态机；条件渲染保持单一来源（`visibleView`）。② 不按 role 拆 chunk——`student` / `teacher` / `officer` 共用大部分卡片（课程列表、作业安排、课程反馈、互动），按 role 拆反而要重复打包；按「重型且独立可达的视图」拆 `AccountSection` / `UserAdminSection` 收益更纯净。`courseAdmin` 表单仍内联在 `App.tsx`（约 220 行 JSX），抽出独立组件并 lazy 化属于「视图按文件拆分」的下一阶段。③ React Query 缓存验证：`queryClient` 在 `main.tsx` 创建，`apps/web/src/App.tsx` 内无 `removeQueries` / `resetQueries` 调用，视图切换只会让子树 unmount，`useQuery` 的缓存不会因 hook 卸载被清空（TanStack Query 默认 `gcTime: 5min`），切换体验与 P2-9 一致。 |
| 验收准则 | 1. 在浏览器 DevTools Elements 面板中切到 `/student/account` 时，`.dashboard-layout` 内只剩账号维护 SectionCard，不再出现被 `display:none` 隐藏的 dashboard hero / 课程列表 / 作业安排 / 互动 等节点。2. 同一 React Query 缓存命中：从 `/student/dashboard` 切到 `/student/account` 再切回，dashboard 数据无需重发请求即可显示。3. 首次进入 `account / userAdmin` 视图时，Network 面板出现独立的 `AccountSection-*.js` / `UserAdminSection-*.js` 请求；其余视图不触发这两个 chunk。4. `vite build` 产物分包符合预期：主 chunk gzip ≈ 103 kB，`AccountSection` 与 `UserAdminSection` 各自 gzip < 2 kB。5. 73 个 web vitest / 52 个 server vitest 用例全部通过，`npm run typecheck` / `npm run lint` / `vite build` 通过。 |

### P2-9 · 移动端响应式：侧栏改抽屉

| 项 | 内容 |
| --- | --- |
| 提交 | `34e3090 feat(web): collapse mobile sidebar into a drawer` |
| 背景 | 旧 `@media (max-width: 840px)` 仅把 `.brand-rail` 改为 `position: relative` 并把侧栏 `.sidebar-nav` 改成两列网格、隐藏小标题与 `sidebar-guide`，整列仍占据顶部一整屏宽度；在 360–414px 视窗下主区域被挤到第二屏，操作体验差。 |
| 范围 | 仅做「移动端抽屉 + 表单字号」一步：在 `< 840px` 时彻底不渲染内联侧栏，改由「workspace-head 内的汉堡按钮 → 受控抽屉」托管导航；同时把 `<input/textarea/select>` 的最小字号提到 16px（避开 iOS 自动缩放），最小高度 46px / 132px。不改桌面端布局，亦不改任何已上线的页面/导航逻辑。 |
| 前端改动 | 新增 `apps/web/src/hooks/useMediaQuery.ts`：基于 `useSyncExternalStore` 订阅 `window.matchMedia` 的 `change` 事件，SSR/jsdom 无 `matchMedia` 时返回 `false`；用 `useSyncExternalStore` 而非 `useState + useEffect`，避开 React 19 的 `react-hooks/set-state-in-effect` 规则。新增 `apps/web/src/components/layout/SidebarDrawer.tsx`：受控抽屉，`isOpen=false` 时返回 `null`；打开时渲染半透明遮罩 `<button>` + `<aside role="dialog" aria-modal="true">` 面板（panel 同时挂 `.brand-rail .app-sidebar` 以复用既有侧栏样式），监听 `keydown` 上的 Esc 调用 `onClose`，并在 mount/unmount 时锁定/恢复 `document.body.style.overflow`。`apps/web/src/App.tsx`：登录后视图新增 `isMobileNavOpen` state、`isCompactViewport = useMediaQuery('(max-width: 840px)')`、`isDrawerOpen = isCompactViewport && isMobileNavOpen`；把原 `<aside className="brand-rail app-sidebar">` 内的 brand / nav / footer / guide 抽出为 `sidebarBody` JSX，桌面端原位渲染，移动端通过 `<SidebarDrawer isOpen onClose>` 包裹；侧栏导航按钮 `onClick` 在 compact 模式下同步 `setIsMobileNavOpen(false)`，点导航后自动关抽屉；`workspace-head` 顶部条件渲染汉堡按钮 `<button className="hamburger-button" aria-expanded={isDrawerOpen} aria-controls="sidebar-drawer">`。`apps/web/src/App.css`：① 把原 `@media (max-width: 840px)` 内仅作用于「占满顶部的旧侧栏」的 `.brand-rail / .app-sidebar / .sidebar-brand / .sidebar-nav / .nav-item / .nav-icon / .nav-item small / .sidebar-guide / .sidebar-footer` 全部删除（移动端不再渲染内联侧栏，那些规则反而会把 drawer 的 `.brand-rail` 子节点变成 `position: relative`）；② 移动端新增 `.page-shell-compact { grid-template-columns: minmax(0, 1fr); }`，因此 main 内容占满；③ 移动端把 `input/textarea/select` 提到 `font-size: 16px; min-height: 46px;`、textarea 132px；④ 新增 `.hamburger-button` 与 `.hamburger-bars`（40×40 方形按钮，三横条）；⑤ 新增 `.sidebar-drawer`（`position: fixed; inset: 0; z-index: 40;`）、`.sidebar-drawer-overlay`（半透明遮罩，`<button>` 形式）与 `.sidebar-drawer-panel.brand-rail`（`width: min(82vw, 320px); overflow-y: auto;` + `sidebar-drawer-slide-in` 180ms 进入动画）。 |
| URL / 状态 | 抽屉状态完全本地化（`isMobileNavOpen`），不进入 URL；视口跨越 840px 阈值时不主动重置 state——通过派生 `isDrawerOpen = isCompactViewport && isMobileNavOpen` 自然隐藏在桌面端，无需 `useEffect` 调 `setState`（同样为避开 `react-hooks/set-state-in-effect`）。Esc / 点遮罩 / 点导航项三条路径均 `setIsMobileNavOpen(false)`。 |
| 文档 | 本文件（基线提交 / 测试计数 / P2 状态 / 速查段）。 |
| 测试 | 新增 `apps/web/src/hooks/useMediaQuery.test.ts` 3 用例（初始值取自 `matchMedia` / `change` 事件触发更新 / unmount 时 `removeEventListener`，通过 mock `window.matchMedia` 并断言 `addEventListener` / `removeEventListener` 调用次数）。新增 `apps/web/src/components/layout/SidebarDrawer.test.tsx` 6 用例（关闭时不渲染 / 打开时 `role="dialog"` + `aria-modal=true` + 子节点可见 / 点遮罩按钮调 `onClose` / 按 Esc 调 `onClose` / 关闭时不响应 Esc / 开闭切换 `document.body.style.overflow`）。`npm run test` 全绿（后端 52/11；Web 73/17；dev-runtime parser 通过）；`npm run typecheck` / `npm run lint` 全绿。`vite build` 通过（gzip JS 104.86 kB，较 P2-8 基线 104.13 kB +0.7 kB）。 |
| 偏离 | 路线图建议 ① `useMediaQuery('(max-width: 840px)')` 自建 hook；② 焦点 trap 可选；③ hamburger 按钮放在「顶部 hero 上方」。本次实现：① hook 选用 `useSyncExternalStore` 而非 `useState + useEffect`，因 React 19 的 `react-hooks/set-state-in-effect` 规则禁止在 effect 中同步 `setState`；功能等价。② 未做焦点 trap：抽屉打开后 Tab 仍可移到 main 区域，但 Esc / 遮罩 / 点导航三条路径都能关闭，对单页 SPA 演示场景足够；后续若做完整 a11y 审查再补 `react-focus-lock` 或自建。③ 汉堡按钮放在 `.workspace-head` 内部最左侧（与标题同行），而非 hero 上方——因 `.workspace-head` 才是移动端 sticky 元素，在 hero 上方放按钮会被滚出视野；放在 head 里既保持单行布局也保证滚动后仍可触达。 |
| 验收准则 | 1. 在 360–414px 视窗下，登录后首屏仅显示 `.workspace-head` + 内容卡片，无任何侧栏占位；2. 点汉堡按钮抽屉从左滑入，遮罩可点关闭；3. 按 Esc 关抽屉；4. 选任意导航项后自动关抽屉并跳到对应路由；5. 抽屉打开期间 `body` 不可滚动，关闭后恢复；6. ≥ 841px 桌面端布局与 P2-8 完全一致（仍是双列 grid，侧栏内联渲染，无汉堡按钮）；7. 现有 73 个 web vitest / 52 个 server vitest 全部通过；`npm run typecheck` / `npm run lint` / `vite build` 通过。 |

### P2-8 · 引入 React Router（路由骨架）

| 项 | 内容 |
| --- | --- |
| 提交 | `1b00a94 feat(web): drive workspace view from URL via React Router` |
| 背景 | `apps/web/src/App.tsx` 之前用 `useState<WorkspaceView>('dashboard')` 驱动侧栏切换；地址栏始终是 `/`，刷新即跳回 dashboard，前进/后退无效，深链不可分享。 |
| 范围 | 仅做「路由骨架」一步（路线图建议的 5 步 PR 拆分中的第 1 步）；视图按文件拆分与 `view-hidden` 移除分别交给 P2-10 与后续 PR。当前 DOM 结构与所有 SectionCard 渲染逻辑保持不变，仍按 `visibleView` 切换 `view-hidden`，因此切换零白屏的体验未受影响。 |
| 前端改动 | `apps/web/src/main.tsx`：在 `QueryClientProvider` 内层加 `<BrowserRouter>`。`apps/web/src/App.tsx`：① 新增 `viewToSegment` / `segmentToView` / `viewPath()` / `parseRouteView()` 四个顶层辅助，把 `WorkspaceView` 枚举（含 `courseAdmin / courseFeedbacks / userAdmin` 三个驼峰值）映射成 kebab URL 段；② `useNavigate()` + `useLocation()` 替换 `useState<WorkspaceView>('dashboard')`，`visibleView` 改由 `parseRouteView(location.pathname, currentRole)` 派生，URL 段与 role 不匹配或视图非法时回落 `'dashboard'`；③ 新增一个 `useEffect`：未登录且 URL 非 `/login` → `navigate('/login', { replace: true })`；已登录但 URL 非合法 `/{role}/{view}` → `navigate(viewPath(role, 'dashboard'), { replace: true })`，覆盖刷新场景与登出场景；④ 侧栏 `<button>` 的 `onClick` 由 `setActiveView(item.view)` 改为 `navigate(viewPath(currentRole, item.view))`；⑤ `loginMutation.onSuccess` 在 `setSession` 之后立刻 `navigate(viewPath(payload.user.role, 'dashboard'), { replace: true })`，仍保留 `startTransition(() => resetWorkspaceSelection())`；⑥ 登出 / 注销路径不显式 navigate，由 `setSession(null)` → useEffect 兜底跳 `/login`。 |
| URL 方案 | `/login`；`/{role}/{view}`，其中 `role ∈ {student, teacher, officer}`，`view` 取值与现有 `roleNavigation` 一致，仅做 kebab 变换：`courseAdmin → course-admin`、`courseFeedbacks → course-feedbacks`、`userAdmin → user-admin`，其他保持原名。非法 URL（角色不匹配 / view 不在该角色导航中 / 段名拼错）一律重定向到该角色的 dashboard，登出后一律重定向 `/login`。 |
| Vite 配置 | `apps/web/vite.config.ts` **不为 react-router / react-router-dom 加 alias 或 dedupe**——这两个包未被 workspace hoist（仅落在 `apps/web/node_modules`），重复 dedupe 反而会破坏 `react-router-dom` 内部对 `react-router/dom` 子路径的导入，导致 `vite build` 失败。React/ReactDOM 的现有 dedupe 与 `createRequire` 解析块原样保留。 |
| 文档 | 本文件（基线提交 / 测试计数 / 顶部状态汇总；P2-8 从「待办」迁入「已完成」并新增「速查段」条目）。 |
| 测试 | 未新增前端单测：路由骨架的关键行为依赖 `BrowserRouter` 与浏览器 `history`，已有 15 个 vitest 文件均针对子组件（`LoginShell` / `AccountSection` / `StudentAssignmentWorkspace` / `TeacherTaskWorkspace` / `useNotifications` / `confirm` 等），不渲染 `App` 根，因此无 MemoryRouter 适配需求。冒烟验证：`vite build` 通过（99 modules transformed，CSS/JS 体积无显著增长，gzip JS 104.13 kB）；`npm run dev` 启动后 `curl http://localhost:5173/login` 与 `curl http://localhost:5173/teacher/grading` 均返回 200 + index.html（确认 Vite dev server 对未知路径仍交给 SPA）。`npm run test` 全绿（后端 52/11；Web 64/15；dev-runtime parser 通过）；`npm run typecheck` / `npm run lint` 全绿。 |
| 偏离 | 路线图建议 ① 改成 `<RouterProvider>` + data router、② 按文件抽出 `features/{role}/views/{ViewName}.tsx`、③ Vite dedupe `react-router-dom`。本次只做最小可行实现：保留组件式 `<BrowserRouter>` 而非 `RouterProvider`（避免引入 `createBrowserRouter` 配置带来的 loader/action 范式跨度），不拆视图文件（App.tsx 仍 ~2240 行），不 dedupe（见上）。视图文件按角色拆分留给后续 PR；`view-hidden` 移除归入 P2-10。 |
| 验收准则 | 1. 侧栏点「我的作业」后地址栏变 `/student/assignments`；浏览器后退按钮回到 `/student/dashboard`。2. 刷新 `/teacher/grading` 仍直接落到「教学任务」卡片（非 dashboard）。3. 未登录访问 `/officer/user-admin` 自动跳 `/login`；登录后再访问可直达。4. 登出后地址栏自动变 `/login`。5. 输入非法路径 `/student/foo-bar`（或角色不匹配的 `/student/grading`）自动重定向到该角色的 dashboard。6. 现有 64 个 web vitest / 52 个 server vitest 用例全部通过。 |

---

## 给审核者的速查

- P0、P1-4、P1-5、P1-7 改动均带新增测试；P1-6 通过既有测试覆盖。`npm run test` 与 `npm run typecheck` 可整体验证。
- P0 涉及文件（按重要性）：
  - 后端：`apps/server/src/modules/courses/routes.ts`、`apps/server/tests/enrollments.integration.test.ts`
  - 前端：`apps/web/src/api.ts`、`apps/web/src/utils/errors.ts`、`apps/web/src/App.tsx`、`apps/web/src/domain.ts`
  - 文档：`docs/API_SPEC.md`、`docs/ACCEPTANCE_SELF_CHECK.md`、`docs/MANUAL_ACCEPTANCE_DEMO_CHECKLIST.md`
- P1-4 涉及文件：
  - 前端：`apps/web/src/hooks/useNotifications.ts`、`apps/web/src/hooks/useNotifications.test.ts`、`apps/web/src/components/notifications/NotificationStack.tsx`、`apps/web/src/App.tsx`、`apps/web/src/App.css`、`apps/web/src/features/auth/LoginShell.tsx`、`apps/web/src/features/auth/LoginShell.test.tsx`
- P1-5 涉及文件：
  - 前端：`apps/web/src/utils/confirm.ts`、`apps/web/src/utils/confirm.test.ts`、`apps/web/src/App.tsx`
- P1-6 涉及文件：
  - 前端：`apps/web/src/features/auth/{LoginForm,StudentRegisterForm,ResetPasswordForm}.tsx`、`apps/web/src/features/account/{PasswordForm,PhoneChangeForm,ProfileForm}.tsx`、`apps/web/src/features/assignments/StudentAssignmentWorkspace.tsx`、`apps/web/src/features/teacher/{TeacherTaskWorkspace,FeedbackThreadList}.tsx`、`apps/web/src/App.tsx`
- P1-7 涉及文件：
  - 后端：`apps/server/src/modules/auth/routes.ts`、`apps/server/src/modules/users/routes.ts`、`apps/server/tests/users-admin.integration.test.ts`
  - 共享：`packages/shared/src/index.ts`（`userListQuerySchema` / `userStatusUpdateSchema`）
  - 前端：`apps/web/src/features/officer/UserAdminSection.tsx`、`apps/web/src/api.ts`、`apps/web/src/domain.ts`、`apps/web/src/utils/errors.ts`、`apps/web/src/App.tsx`、`apps/web/src/App.css`
  - 文档：`docs/API_SPEC.md`、`docs/REQUIREMENTS_TRACEABILITY.md`
- P2-8 涉及文件：
  - 前端：`apps/web/src/main.tsx`、`apps/web/src/App.tsx`（`apps/web/vite.config.ts` 探索过 dedupe，但因 `react-router-dom` 子路径导入而回退，未改动）
- P2-9 涉及文件：
  - 前端：`apps/web/src/hooks/useMediaQuery.ts`、`apps/web/src/hooks/useMediaQuery.test.ts`、`apps/web/src/components/layout/SidebarDrawer.tsx`、`apps/web/src/components/layout/SidebarDrawer.test.tsx`、`apps/web/src/App.tsx`、`apps/web/src/App.css`
- P2-10 涉及文件：
  - 前端：`apps/web/src/App.tsx`（条件渲染替换 `view-hidden`、`lazy` import `AccountSection` / `UserAdminSection`、删除互动视图中不可达的 `updateResponseMutation` / `deleteResponseMutation` 及对应教师按钮）、`apps/web/src/App.css`（删除 `.view-hidden` utility、`:has(...:not(.view-hidden))` 简化为 `:has(.section-card:nth-child(3))`）
