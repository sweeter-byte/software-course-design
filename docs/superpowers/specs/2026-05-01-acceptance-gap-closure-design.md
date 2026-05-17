# 课设验收功能补齐设计

## 1. 背景

教师明确要求验收时以《需求获取报告》中的每个功能为准，不能只达到 80% 的整体完成度。当前系统已经具备注册、登录、课程创建/查询、选课、作业发布/查询、答案提交/批改、问题反馈发布/查看、教师回复等核心链路，但仍缺少大量“修改、删除、账号资料”类功能。

本次补齐目标是让需求获取报告中的 29 个用例都有可验证实现：后端 API、自动化测试、Web 入口、移动端主路径入口和文档追踪。

## 2. 范围

### 2.1 必须补齐

- 用户信息管理：退出登录、修改资料、修改密码、验证码找回密码、注销账号。
- 用户信息管理补充：修改手机号需旧手机号验证码和新手机号验证码均通过。
- 课程管理：课程详情、多条件课程查询、修改课程、删除课程。
- 作业管理：修改作业、取消/删除作业并记录原因。
- 答案提交：学生查询自己的提交与批改结果、独立修改答案接口、已批改后禁止修改。
- 问题/反馈：学生修改、删除自己的问题或反馈。
- 回答：教师修改、删除自己的回答。
- 课程反馈：学生新增、修改、查看、删除课程反馈；教师查看自己课程反馈；教务员查看所有课程反馈。
- 文档：同步 API 规格、需求追踪矩阵、测试报告。

### 2.2 不作为阻塞项

- 真实短信网关：验证码继续使用开发态 previewCode，答辩时说明为模拟验证码。
- 复杂审计后台：保留日志和关键状态即可，不新增完整审计页面。
- 附件上传：需求获取报告未把附件作为验收必需功能。

## 3. 方案

采用“后端接口完整性优先”的补齐方案：

1. 先按需求用例写后端集成测试，确认现有实现缺口。
2. 在现有 Fastify 模块中补最小可用 API。
3. 补 Web 和 Mobile 调用入口，优先保证老师演示时能点击到每个功能。
4. 更新文档和自查表。

该方案比页面优先更稳，因为老师可能直接问数据库状态和接口逻辑；只要后端规则清楚，前端只是操作入口。

## 4. 数据与权限规则

- 账号注销：将 `users.status` 更新为 `cancelled`，同时删除该用户会话；登录时已有 `status = active` 校验。
- 修改密码：登录态用户必须提供旧密码，新密码和确认密码一致后更新 `password_hash`。
- 找回密码：使用 `verification_codes.purpose = reset_password`，校验最近验证码后更新密码并标记验证码已使用。
- 修改资料：只允许用户修改自己的 `username`、`real_name`、`email`、`gender`、`college`、`major`、`class_name`。
- 修改手机号：登录态用户必须提供旧手机号验证码和新手机号验证码，新手机号未被占用后更新 `users.phone`。
- 课程修改/删除：仅教务员可操作；删除依赖数据库级 `ON DELETE CASCADE` 清理作业、提交、反馈和回复。
- 作业修改：仅任课教师可操作；作业被取消后不能修改。
- 作业取消：仅任课教师可操作，必须填写原因，将作业状态置为 `cancelled`，删除关联提交。
- 答案修改：仅提交学生可操作；截止后、作业取消后、已批改后均禁止修改。
- 问题/反馈修改/删除：仅创建该反馈的学生可操作；删除采用状态置为 `deleted` 并隐藏于普通线程查询。
- 回答修改/删除：仅创建该回答的教师可操作；删除采用物理删除，便于演示“删除后不显示”。
- 课程反馈：学生必须已加入课程才能新增课程反馈；学生只能修改/删除自己的课程反馈；教师只能查看自己所教课程的反馈；教务员可查看全部课程反馈。

## 5. API 设计

- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/password/forgot`
- `POST /api/v1/auth/password/change`
- `POST /api/v1/auth/cancel-account`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `GET /api/v1/courses/:courseId`
- `PATCH /api/v1/courses/:courseId`
- `DELETE /api/v1/courses/:courseId`
- `PATCH /api/v1/assignments/:assignmentId`
- `POST /api/v1/assignments/:assignmentId/cancel`
- `GET /api/v1/submissions/:submissionId`
- `PATCH /api/v1/submissions/:submissionId`
- `PATCH /api/v1/feedbacks/:feedbackId`
- `DELETE /api/v1/feedbacks/:feedbackId`
- `PATCH /api/v1/responses/:responseId`
- `DELETE /api/v1/responses/:responseId`
- `POST /api/v1/auth/phone/change`
- `POST /api/v1/courses/:courseId/course-feedbacks`
- `GET /api/v1/course-feedbacks`
- `PATCH /api/v1/course-feedbacks/:feedbackId`
- `DELETE /api/v1/course-feedbacks/:feedbackId`

## 6. 前端设计

Web 继续使用当前单页工作台，不引入新路由。新增操作尽量放在现有卡片中：

- 登录卡片增加找回密码。
- 账号区增加资料修改、修改密码、注销。
- 账号区增加双验证码修改手机号。
- 课程列表卡片增加详情、修改、删除。
- 作业卡片增加修改、取消。
- 作业提交区增加查看提交详情和修改答案。
- 反馈线程卡片增加编辑/删除反馈、编辑/删除回复。
- 课程区域增加课程反馈提交、查看、修改和删除。

Mobile 保持单屏工作台，只补关键按钮和输入框，避免引入复杂导航。

## 7. 测试策略

后端每一类补齐功能写集成测试：

- `profile.integration.test.ts`：资料、改密、双验证码改手机号、找回密码、注销、退出。
- `courses.integration.test.ts`：详情、筛选、修改、删除。
- `assignments.integration.test.ts`：修改、取消。
- `submissions.integration.test.ts`：详情、修改、已批改后禁止修改。
- `feedback.integration.test.ts`：反馈修改/删除、回复修改/删除。
- `course-feedbacks.integration.test.ts`：课程反馈新增、修改、查看、删除。

每批完成后执行对应测试和类型检查。全部补齐后执行全量测试、三端 typecheck、Server/Web build 和 lint。

## 8. 风险

- 当前项目不是 git 仓库，无法按计划文档要求提交中间版本；使用文档和测试结果记录进度。
- Web 当前为大单文件，继续在 `App.tsx` 中补入口会变大；为了验收效率先保持现有结构，后续再拆分。
- `node:sqlite` 是 Node 实验能力；当前测试已稳定，答辩时重点说明本地演示数据库可迁移到 MySQL。
