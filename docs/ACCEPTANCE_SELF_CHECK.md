# 课程互动管理系统验收功能自查

自查日期：2026-05-18

依据：`doc/001 B 课程互动管理系统 需求获取报告 5.docx` 中 3.1 功能规定和 29 个用例。

| 序号 | 需求功能 | 状态 | 后端实现 | 演示入口 |
| --- | --- | --- | --- | --- |
| 1 | 用户注册 | 已实现 | `POST /api/v1/auth/register/student` | Web/Mobile 学生注册 |
| 2 | 用户登录 | 已实现 | `POST /api/v1/auth/login` | Web/Mobile 登录 |
| 3 | 修改用户信息 | 已实现 | `PATCH /api/v1/users/me` | Web/Mobile 账号维护 |
| 4 | 注销账号 | 已实现 | `POST /api/v1/auth/cancel-account` | Web/Mobile 账号维护 |
| 5 | 找回密码 | 已实现 | `POST /api/v1/auth/password/forgot` | Web/Mobile 登录页找回密码 |
| 6 | 添加课程信息 | 已实现 | `POST /api/v1/courses` | 教务员课程维护 |
| 7 | 查询课程信息 | 已实现 | `GET /api/v1/courses`, `GET /api/v1/courses/:courseId` | 课程列表、筛选、选中课程 |
| 8 | 修改课程信息 | 已实现 | `PATCH /api/v1/courses/:courseId` | 教务员课程维护，Web/Mobile 操作前确认 |
| 9 | 删除课程信息 | 已实现 | `DELETE /api/v1/courses/:courseId` | 教务员课程维护，Web/Mobile 操作前确认 |
| 10 | 发布作业信息 | 已实现 | `POST /api/v1/courses/:courseId/assignments` | 教师教学安排 |
| 11 | 修改作业信息 | 已实现 | `PATCH /api/v1/assignments/:assignmentId` | 截止前且无人提交时允许修改 |
| 12 | 删除/取消作业信息 | 已实现 | `POST /api/v1/assignments/:assignmentId/cancel` | 教师教学安排，Web/Mobile 操作前确认 |
| 13 | 查询作业信息 | 已实现 | `GET /api/v1/courses/:courseId/assignments` | 学生列表返回是否已提交 |
| 14 | 提交答案 | 已实现 | `POST /api/v1/assignments/:assignmentId/submissions` | 学生学习提交 |
| 15 | 修改答案 | 已实现 | `PATCH /api/v1/submissions/:submissionId` | 学生学习提交 |
| 16 | 批改答案 | 已实现 | `POST /api/v1/submissions/:submissionId/grade` | 教师提交与批改 |
| 17 | 查询答案 | 已实现 | `GET /api/v1/submissions/:submissionId` | 学生查看提交/成绩 |
| 18 | 发布问题或反馈 | 已实现 | `POST /api/v1/submissions/:submissionId/feedbacks` | 学生互动交流 |
| 19 | 查看问题或反馈 | 已实现 | `GET /api/v1/feedbacks?submissionId=...`, `GET /api/v1/feedbacks/threads` | 学生作业互动、教师待回复任务 |
| 20 | 修改问题或反馈 | 已实现 | `PATCH /api/v1/feedbacks/:feedbackId` | 学生互动交流 |
| 21 | 删除问题或反馈 | 已实现 | `DELETE /api/v1/feedbacks/:feedbackId` | 学生互动交流 |
| 22 | 增加回答 | 已实现 | `POST /api/v1/feedbacks/:feedbackId/responses` | 教师互动交流 |
| 23 | 查看回答 | 已实现 | `GET /api/v1/feedbacks?submissionId=...`, `GET /api/v1/feedbacks/threads` | 学生作业互动、教师待回复任务 |
| 24 | 修改回答 | 已实现 | `PATCH /api/v1/responses/:responseId` | 教师互动交流 |
| 25 | 删除回答 | 已实现 | `DELETE /api/v1/responses/:responseId` | 教师互动交流 |
| 26 | 增加反馈信息 | 已实现 | `POST /api/v1/courses/:courseId/course-feedbacks` | Web/Mobile 课程反馈 |
| 27 | 修改反馈信息 | 已实现 | `PATCH /api/v1/course-feedbacks/:feedbackId` | Web/Mobile 课程反馈 |
| 28 | 查看反馈信息 | 已实现 | `GET /api/v1/course-feedbacks?courseId=...` | Web/Mobile 课程反馈 |
| 29 | 删除反馈信息 | 已实现 | `DELETE /api/v1/course-feedbacks/:feedbackId` | Web/Mobile 课程反馈 |

## 自动化验证

- `apps/server/tests/profile.integration.test.ts`：账号资料、改密、双验证码改手机号、找回密码、注销、退出。
- `apps/server/tests/courses.integration.test.ts`：课程创建、详情、筛选、修改、删除。
- `apps/server/tests/assignments.integration.test.ts`：作业发布、查询、学生提交状态、截止/已提交后的修改保护、取消和提交清理。
- `apps/server/tests/submissions.integration.test.ts`：提交、查询、修改、批改和已批改保护。
- `apps/server/tests/feedback.integration.test.ts`：反馈发布、查看、总览、修改、删除和回答新增、修改、删除。
- `apps/server/tests/course-feedbacks.integration.test.ts`：课程反馈新增、修改、查看、删除，以及教师/教务员查看。
- `apps/server/tests/dashboard.integration.test.ts`：教务员首页摘要含课程反馈统计。
- `apps/web/src/api.test.ts`：Web/Mobile 同源 API 客户端的无请求体写操作不会触发空 JSON body 错误，并覆盖反馈线程总览查询参数。

最新结果：后端 10 个测试文件、43 个测试用例通过；Web 10 个测试文件、19 个测试用例通过；根目录测试、全工作区类型检查、Server/Web 构建和全工作区 lint 均通过。

## Web 端工作流验收说明

- 顶部“当前工作上下文”统一选择课程、作业和提交；切换课程会重置作业和提交，切换作业会同步对应提交。
- 学生端在“我的作业”内完成作业查看、答案提交/修改、成绩查看和作业问题/反馈，不再依赖单独进入互动页。
- 教师端在“教师任务工作台”内集中处理待批改提交、待回复作业反馈和学生课程反馈；“待回复反馈”导航入口也进入同一任务台。
- 教师查看作业反馈时使用 `GET /api/v1/feedbacks/threads`，返回课程、作业、提交状态、学生姓名/学号和教师回复。

## Web/Mobile 数据一致性验证

运行级验证使用同一后端服务 `http://localhost:4100/api/v1`，模拟 Web 与 Mobile 双端客户端交替读写：

- Web 创建课程 -> Mobile 查询课程。
- Mobile 修改课程 -> Web 读取课程详情。
- Web 创建课程反馈 -> Mobile 教师查看课程反馈。
- Mobile 修改课程反馈 -> Web 学生查看课程反馈。
- Web 发布作业 -> Mobile 查询作业。
- Mobile 修改作业 -> Web 查询作业。
- Web 提交答案 -> Mobile 教师查看提交。
- Mobile 批改答案 -> Web 学生查看成绩。
- Web 发布问题/反馈 -> Mobile 教师查看线程。
- Mobile 增加回答 -> Web 学生查看回答。

最新同步验证课程代码：`SYNC-38039165`。
