# 课程互动管理系统 · 用户体验改进追踪

本文档记录针对系统验收期的可用性 / 完整性改进项，按优先级分为 P0 / P1 / P2 三个梯队：

- **P0** — 已完成（截至 2026-05-19）。已并入 `main` 分支。
- **P1** — 部分完成。P1-4 / P1-5 已完成（2026-05-19），P1-6/7 待办。
- **P2** — 待办，架构与可扩展性优化。

用途：
1. 新会话延续工作时，可直接基于本文件查阅已完成与待办。
2. 提交外部审核（codex 等）时，作为「需求 → 实施 → 验证」的单点入口。

---

## 当前基线（参考点）

- 分支：`main`
- 最近提交：`3fa8dc3 feat(web): require confirmation for destructive role actions`（前置：`c3568ef docs: record P1-4 toast queue commit hash in UX tracker`）
- 测试状态：后端 vitest 48 通过 / 10 文件；Web vitest 64 通过 / 15 文件（含 P1-4 新增的 `useNotifications` 8 用例与 P1-5 新增的 `confirmDestructive` 3 用例）；`npm run typecheck` 全绿；`npm run lint` 全绿。
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

## P1 · 待办（影响体验）

> P1 实施建议每项独立 commit，便于代码审核。预计每项 1–2 小时工作量。

### P1-6 · 表单加 HTML5 原生校验

| 项 | 内容 |
| --- | --- |
| 现状 | 注册、改密、改手机、创建课程等表单的 `<input>` 都没有 `required` / `pattern` / `minLength` 等属性，依赖服务端 Zod 兜底。后端 400 → 经 P0-3 已能展示字段错误，但用户依然要等一次网络往返。 |
| 目标 | 常见错误（手机号格式、密码长度、必填）在浏览器侧立即提示，减少无谓的请求。 |
| 建议实施 | 1. 优先改动入口：`apps/web/src/features/auth/LoginForm.tsx`、`StudentRegisterForm.tsx`、`ResetPasswordForm.tsx`；`apps/web/src/features/account/{PasswordForm,PhoneChangeForm,ProfileForm}.tsx`；`apps/web/src/App.tsx` 中的课程/作业表单。2. 字段约束建议（与 `packages/shared/src/index.ts` 中的 Zod 保持一致）：手机号 `pattern="^1[3-9]\\d{9}$"`、密码 `minLength={8}` + `pattern` 匹配大小写+数字、验证码 `pattern="^\\d{6}$"`、学号 `pattern="^\\d{6,}$"` 等。3. 同时为 `<label>` 绑定 `htmlFor` / `id` 以提升可访问性。 |
| 验收准则 | 在登录页输入 `123`，浏览器原生 tooltip 报错且不发起请求；同时键盘 Tab 顺序正确、屏读能读出 label。 |
| 风险 | 须与后端 Zod 校验完全一致，否则会出现「前端通过但后端报错」的迷惑场景；改动前对照 `packages/shared/src/index.ts` 中各 schema 的 `.regex/.min/.max` 调用。 |

### P1-7 · 教务员补「用户管理」最小集

| 项 | 内容 |
| --- | --- |
| 现状 | `docs/PROJECT_SUMMARY.md` 描述教务员应「统筹账号与课程运行情况」，但目前教务员侧栏没有用户列表入口，也没有禁用/启用账号的接口。 |
| 目标 | 教务员可以查看全部用户、按角色筛选、禁用/恢复账号。先做「列表 + 启停」最小集，后续再加重置密码等。 |
| 建议实施 | 1. 后端：`apps/server/src/lib/db/schema.ts` 给 `users` 表加 `is_disabled INTEGER NOT NULL DEFAULT 0`（CHECK 0/1）；登录路径在 `apps/server/src/modules/auth/routes.ts` 增加禁用账号阻断（`AppError('account_disabled', 403, 'ACCOUNT_DISABLED')`）。2. 新增 `apps/server/src/modules/users/routes.ts` 中：`GET /users`（教务员，支持 `role` 过滤）与 `PATCH /users/:userId/status`（教务员，body `{disabled: boolean}`）。3. 前端：`apps/web/src/App.tsx` 给 `roleNavigation.officer` 增加 `{ view: 'userAdmin', label: '用户管理', hint: '账号列表与启停' }`；新建 `apps/web/src/features/officer/UserAdminSection.tsx` 完成列表 + 切换。4. 文档：`docs/API_SPEC.md` 与 `docs/REQUIREMENTS_TRACEABILITY.md` 补充。 |
| 验收准则 | 教务员能看到全部账号；点「禁用」后该用户登录被拒，错误码 `ACCOUNT_DISABLED` 被映射为中文文案；恢复后可再次登录；不允许禁用自己。 |
| 风险 | 数据库 migration：schema.ts 是单一 `database.exec`，新字段加上 `DEFAULT 0` 即兼容老数据；测试库是内存库每次重建，无迁移风险，但要更新 `apps/server/src/seedDemoData.ts` 不要插入 `is_disabled` 时报错（若用 INSERT 列名列表，DEFAULT 会自动填入）。 |

---

## P2 · 待办（架构与可扩展性）

> P2 改动跨度较大，建议各自独立分支 + PR；完成前可与本文件 P0/P1 解耦推进。

### P2-8 · 按视图拆分 `App.tsx` + 引入 React Router

| 项 | 内容 |
| --- | --- |
| 现状 | `apps/web/src/App.tsx` 仍约 2000 行；所有视图通过 `view-hidden` 类常驻 DOM，由 `visibleView` 切换。优点是切换无白屏，缺点是 DOM 庞大、状态全局共享、URL 无法分享、无前进/后退。 |
| 目标 | 按 `WorkspaceView` 把内容拆为路由组件，浏览器地址栏反映当前视图，支持分享与深链。 |
| 建议实施 | 1. 引入 `react-router-dom@^7` 并在 `apps/web/vite.config.ts` dedupe（保持现有 React/ReactDOM dedupe 风格）；2. 把 `apps/web/src/App.tsx` 改为 `<RouterProvider>` 容器；路由结构：`/login`、`/student/{dashboard,courses,assignments,interaction,course-feedbacks,account}`、`/teacher/{dashboard,courses,assignments,grading,course-feedbacks,account}`、`/officer/{dashboard,courses,course-admin,course-feedbacks,user-admin,account}`。3. 抽出 `apps/web/src/features/{role}/views/{ViewName}.tsx`，复用现有子组件（`StudentAssignmentWorkspace` 等）。4. 顶部「当前工作上下文」与 React Query 状态保持全局，通过 Context 或 url search params 持久化。 |
| 验收准则 | 浏览器前进/后退能在视图间切换；刷新 `/teacher/grading` 仍落地正确卡片；无任一现有用例 / 集成测试回归。 |
| 风险 | 单文件拆分量大；建议先完成 P0/P1 减少冲突再做。可分若干 PR：路由骨架 → 学生视图迁移 → 教师视图迁移 → 教务员视图迁移 → 删除 `view-hidden`。 |

### P2-9 · 移动端响应式：侧栏改抽屉

| 项 | 内容 |
| --- | --- |
| 现状 | `apps/web/src/App.css` 仅在 `1180px` 与 `840px` 两条媒体查询做基本两列 → 单列调整；小屏（手机）侧栏（`.app-sidebar`）依然横向占满，挤压主内容。 |
| 目标 | 在 `< 840px` 时侧栏改为抽屉（hamburger 触发），主区域占满；表单 `<input>` 字号增大。 |
| 建议实施 | 1. 新增 `apps/web/src/components/layout/SidebarDrawer.tsx`：受控的抽屉组件（`isOpen` + `onClose`，点击遮罩关闭，Esc 关闭，焦点 trap 可选）；2. 在 `App.tsx` 中根据 `useMediaQuery('(max-width: 840px)')`（自建 hook 或简单 `matchMedia`）切换渲染模式；3. CSS 在 `App.css` 增加 `.sidebar-drawer` 类，控制位置/动画；4. hamburger 按钮放在顶部 hero 上方。 |
| 验收准则 | 在 360–414px 视窗下可流畅操作；抽屉打开时遮罩 dismissable；不影响桌面端布局。 |
| 风险 | P2-8 拆路由完成后再做更顺；如先做需注意状态在 sidebar 与 drawer 间一致。 |

### P2-10 · 按路由条件渲染替换 `view-hidden`

| 项 | 内容 |
| --- | --- |
| 现状 | 即使切到 `account` 视图，`dashboard`、`courses`、`assignments` 等全部 DOM 子树仍然挂载（仅 CSS 隐藏），React Query 部分由 `enabled` 控制但 DOM/事件监听仍全开。 |
| 目标 | 仅渲染当前激活视图的 DOM，降低初始 / 切换成本，并便于代码分割。 |
| 建议实施 | 1. 依赖 P2-8 的路由化完成；2. 把 `view-hidden` 全部移除，用路由 `<Route element={<DashboardView />} />` 替代；3. 配合 `React.lazy` + `<Suspense fallback={<StatePanel … />}>` 做按需加载（每个 role 一个 chunk 即可，过度拆分反而增加请求数）；4. 验证 React Query 缓存（`queryClient`）跨视图切换无失效，`staleTime` 视情况调整。 |
| 验收准则 | DevTools Performance 显示视图切换时 DOM 节点变化合理；首屏 JS chunk 显著减小（用 `vite build --report` 查看）；用户感知无白屏（`<Suspense>` fallback 在 100ms 内消失）。 |
| 风险 | 同 P2-8。若想保留「不白屏」的现有体验，可只对 `account / userAdmin / courseAdmin` 这些重型视图做 lazy，其余保持同步加载。 |

---

## 给审核者的速查

- P0、P1-4、P1-5 改动均带新增测试，可通过 `npm run test` 与 `npm run typecheck` 整体验证。
- P0 涉及文件（按重要性）：
  - 后端：`apps/server/src/modules/courses/routes.ts`、`apps/server/tests/enrollments.integration.test.ts`
  - 前端：`apps/web/src/api.ts`、`apps/web/src/utils/errors.ts`、`apps/web/src/App.tsx`、`apps/web/src/domain.ts`
  - 文档：`docs/API_SPEC.md`、`docs/ACCEPTANCE_SELF_CHECK.md`、`docs/MANUAL_ACCEPTANCE_DEMO_CHECKLIST.md`
- P1-4 涉及文件：
  - 前端：`apps/web/src/hooks/useNotifications.ts`、`apps/web/src/hooks/useNotifications.test.ts`、`apps/web/src/components/notifications/NotificationStack.tsx`、`apps/web/src/App.tsx`、`apps/web/src/App.css`、`apps/web/src/features/auth/LoginShell.tsx`、`apps/web/src/features/auth/LoginShell.test.tsx`
- P1-5 涉及文件：
  - 前端：`apps/web/src/utils/confirm.ts`、`apps/web/src/utils/confirm.test.ts`、`apps/web/src/App.tsx`
- P1-6/7 与 P2 尚未实现，正文中的「建议实施」是路线图而非现状描述，审核时无须验证。
