# Web 端工作流重构设计

## 1. 背景

当前 Web 端已经具备课程、作业、提交、批改、作业互动和课程反馈等功能，但页面把“选择课程、选择作业、选择提交”拆散到不同视图。用户必须先记住隐藏顺序，再进入后续功能；一旦没有选中下游状态，页面就出现空状态、按钮禁用或笼统错误。

本次目标是按用户确认的 A 方案分阶段重构：先统一上下文，再修学生闭环，再修教师闭环，再补反馈总览接口，最后做展示和视觉打磨。每个阶段必须有独立测试、验证和 git 提交，便于回溯。

## 2. 参考产品逻辑

本设计只参考成熟 LMS 的信息架构，不复制外观。

- Canvas SpeedGrader：单个作业的提交、学生列表、评分、评论集中处理，教师不需要跨多个页面找提交。
- Google Classroom：教师可以在单一位置查看作业、成绩、缺交，并按提交状态筛选学生工作。
- Moodle Assignment：作业活动承载学生提交、教师评分、个人反馈和切换下一位学生的完整流程。

参考链接：

- https://community.instructure.com/en/kb/articles/661157-how-do-i-use-speedgrader
- https://support.google.com/edu/classroom/answer/16643267
- https://docs.moodle.org/502/en/Assignments

## 3. 范围

### 3.1 必须完成

- Web 端新增统一上下文栏，集中处理课程、作业、提交/学生的当前选择。
- 学生“作业提交”视图改为“我的作业”闭环：作业详情、提交答案、查看成绩、发起作业问题/反馈放在同一流程。
- 教师“提交批改”视图改为任务工作台：待批改提交、待回复反馈、课程反馈按任务呈现。
- 后端补作业反馈总览接口，使教师可以按课程、作业或自己所教课程查看反馈线程，不再依赖前端先选中 `submissionId`。
- 课程反馈和作业反馈展示学生真实姓名/学号，避免展示内部用户 ID。
- 日期输入和展示改为面向用户的本地日期时间格式。
- 错误提示改为业务可理解文案，例如“该提交尚未批改，批改后才能发起作业反馈”。
- 保持 Web-only 验收范围；Android 真机验收后续单独处理。

### 3.2 不做

- 不重写整个前端技术栈。
- 不引入新的 UI 组件库。
- 不新增附件上传、文档预览、音视频反馈等超出当前需求的能力。
- 不把临时可视化草图纳入 git 版本控制。

## 4. 分阶段方案

### 阶段 1：统一上下文栏

在主工作区顶部新增上下文栏，显示并允许切换当前课程、当前作业、当前提交/学生。选择课程时清空作业和提交；选择作业时清空提交；选择提交后自动驱动批改和互动区域。

上下文栏替代现在各页面底部/右侧的“当前进度”卡片。只有确实需要辅助说明的页面才保留局部状态说明。

### 阶段 2：学生“我的作业”闭环

学生作业页按课程列出作业。选中作业后在同一页展示：

- 作业描述、要求、开始时间、截止时间、状态。
- 学生自己的提交状态和提交内容。
- 未提交或可修改时显示提交/修改表单。
- 已批改时显示分数、教师评语、作业互动入口。
- 未批改时禁用作业互动，并显示明确原因。

学生不再需要进入“互动交流”页猜测自己是否满足发问条件。

### 阶段 3：教师任务工作台

教师工作台按任务组织：

- 待批改提交：按课程和作业聚合，点击后在同一屏查看学生提交、填写分数和评语。
- 待回复反馈：直接列出学生作业问题/反馈，展示课程、作业、学生、提交状态和线程内容。
- 课程反馈：展示学生课程维度反馈，支持按课程筛选。

教师仍可进入作业管理页发布和维护作业，但批改与回复不再要求先手动跨页选作业、选提交。

### 阶段 4：反馈总览接口

新增后端接口，例如：

```text
GET /api/v1/feedbacks/threads?courseId=&assignmentId=&status=
```

权限规则：

- 学生只能看自己的作业反馈线程。
- 教师只能看自己授课课程下的作业反馈线程。
- 教务员可按课程查看所有线程。

返回数据必须包含课程名、课程代码、作业标题、提交 ID、提交状态、学生 ID、学生真实姓名、学号、反馈内容和教师回复列表。

保留现有 `GET /feedbacks?submissionId=`，用于提交详情页的线程读取。

### 阶段 5：展示与视觉打磨

视觉方向为“教学管理后台”：信息密度适中、扫描效率高、颜色克制、清晰分组。避免营销式大卡片堆叠和过多空白。

必须改进：

- 左侧导航减少视觉占比，当前任务区域更突出。
- 表单按任务拆分，账户页区分资料、安全、手机号、注销。
- 主按钮只用于当前最关键动作，危险操作单独分组。
- 所有日期使用本地化展示和 `datetime-local` 编辑。
- 错误/成功提示按严重程度区分颜色和文案。

## 5. 数据与接口影响

- `SubmissionItem` 和 `FeedbackItem` 需要补充学生展示字段。可以通过 join `users` 获取 `realName`、`studentNo`、`className`。
- 学生自己的提交需要有稳定读取方式。当前学生端只在创建提交后保存 `selectedSubmissionId`，刷新或跨页后状态会丢失；应通过作业列表或新增接口返回自己的提交摘要。
- 反馈总览接口需要把 `feedbacks`、`responses`、`submissions`、`assignments`、`courses`、`users` 关联起来。
- Web API 客户端新增类型化方法，避免继续使用宽泛的 `Record<string, unknown>` 扩大维护成本。

## 6. 前端架构优化

当前 Web 端已经不是传统手写 HTML/CSS/JS，而是 React + TypeScript + Vite + TanStack Query。问题不在技术栈过旧，而在应用结构仍接近“单文件页面脚本”：`App.tsx` 同时承担登录、导航、数据请求、业务状态、所有表单和所有页面布局。

本轮不更换到 Next.js、Vue、Svelte、Flutter Web 或全新 UI 框架。原因：

- 当前系统是课程管理后台，前后端已分离，Vite SPA 能满足本地验收和后续部署。
- 更换框架会增加路由、构建、鉴权、样式迁移和测试迁移风险。
- 当前核心问题是业务流和信息架构，不是渲染框架能力不足。

本轮采用“保留 React/Vite，重构应用架构”的方案：

```text
apps/web/src/
  api.ts
  App.tsx
  components/
    layout/
    ui/
  features/
    courses/
    assignments/
    submissions/
    feedback/
    account/
  hooks/
  utils/
```

拆分原则：

- `components/ui` 只放按钮、提示、表单控件、状态标签、空状态等无业务组件。
- `components/layout` 放侧边栏、顶部栏、上下文栏、工作区布局。
- `features/*` 放各业务域组件、查询封装和视图逻辑。
- `api.ts` 保留 HTTP 基础能力，逐步补充类型化接口方法。
- 样式继续使用 CSS 变量和普通 CSS 文件，但按组件/功能拆分，避免一个大 CSS 文件继续膨胀。
- `react-router-dom` 已在依赖中，后续可把当前手写 `activeView` 逐步替换为路由；本轮先做最小可控拆分，不强制一次性路由迁移。

如果后续要进一步升级，可以在本轮稳定后评估：

- 引入 TanStack Router 或 React Router 路由化工作台。
- 引入轻量组件库或 headless 组件库，但需先确认网络安装和许可证风险。
- 引入 Tailwind CSS 或 CSS Modules，但只有在现有 CSS 拆分后仍难维护时再做。

## 7. 测试策略

遵循测试先行：

- 后端先写失败测试：教师按课程/作业列出待回复反馈；学生只能看到自己的线程；教师不能看非自己课程线程；返回学生展示字段。
- Web 先写失败测试：`App.tsx` 或抽出的展示逻辑必须包含统一上下文栏文案、待回复任务文案、已批改后反馈文案、友好的 `feedback_requires_grading` 错误。
- 每个阶段至少运行相关 workspace 测试和 typecheck。
- 最终运行 `npm run test`、`npm run typecheck --workspaces --if-present`、`npm run build --workspaces --if-present`、`npm run lint --workspaces --if-present`。

## 8. Git 策略

每个阶段一个提交：

1. `docs: specify web workflow redesign`
2. `feat(web): add workspace context selector`
3. `feat(web): streamline student assignment workflow`
4. `feat(server): add feedback thread overview`
5. `feat(web): add teacher task workflow`
6. `style(web): polish teaching workspace presentation`
7. `docs: update web acceptance workflow`

若某阶段变大，可拆成“测试/后端/前端/视觉”多个提交，但不把不相关文件混入同一提交。

## 9. 风险与约束

- `apps/web/src/App.tsx` 已经过大。阶段 1 开始应优先抽出小的纯函数、类型和轻量组件，避免继续把所有逻辑塞进单文件。
- 旧截图目录和 `CLAUDE.md` 当前为未跟踪文件。除非用户要求，本轮不纳入提交。
- 临时可视化文件在 `.superpowers/` 下，仅用于讨论，不进入版本库。
