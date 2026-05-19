# 课程互动管理系统 API 规格

接口统一前缀：`/api/v1`

统一响应结构：

```json
{
  "success": true,
  "message": "ok",
  "data": {},
  "meta": {
    "requestId": "req_xxx"
  }
}
```

错误响应结构：

```json
{
  "success": false,
  "message": "validation_failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "path": ["phone"], "message": "手机号格式不正确" }
    ]
  },
  "meta": {
    "requestId": "req_xxx"
  }
}
```

`error.details` 由 Zod 校验产生，每项含 `path`（字段路径）与 `message`（中文文案）。Web 客户端会将其与字段中文标签拼接展示在通知条上，便于排错。

## 1. 认证与账号

### POST `/auth/register/student`

- 说明：学生手机号注册
- 请求体：`phone`, `password`, `confirmPassword`, `username`, `realName`, `studentId`, `verificationCode`

### POST `/auth/login`

- 说明：三角色登录
- 请求体：`phone`, `password`
- 返回：`accessToken`, `refreshToken`, `user`, `role`
- 错误码：
  - `401 INVALID_CREDENTIALS` 手机号不存在 / 已注销 / 密码错误
  - `403 ACCOUNT_DISABLED` 账号被教务员禁用（密码已通过校验，仅状态阻断）

### POST `/auth/logout`

- 说明：退出当前会话

### POST `/auth/verification-code`

- 说明：申请验证码
- 请求体：`phone`, `purpose`
- `purpose`: `register | reset_password | change_phone`

### POST `/auth/password/forgot`

- 说明：验证码重置密码
- 请求体：`phone`, `verificationCode`, `newPassword`, `confirmPassword`

### POST `/auth/password/change`

- 说明：登录态修改密码
- 请求体：`oldPassword`, `newPassword`, `confirmPassword`

### POST `/auth/cancel-account`

- 说明：注销当前账号

## 2. 用户资料

### GET `/users/me`

- 说明：获取当前用户资料

### PATCH `/users/me`

- 说明：修改当前用户资料
- 可更新：`username`, `realName`, `email`, `gender`, `college`, `major`, `className`

### GET `/users`

- 说明：教务员查询账号（教师/学生/教务员）
- 鉴权：`officer`，非教务员返回 `403 FORBIDDEN`
- 查询参数：`role`（可选，`student | teacher | officer`）
- 响应字段：`data.users[]`，每项含 `id`, `role`, `status`（`active | disabled | cancelled`）, `phone`, `username`, `realName`, `email`, `gender`, `studentNo`, `teacherNo`, `college`, `major`, `className`, `createdAt`, `updatedAt`
- 列表按 `created_at` 升序返回

### PATCH `/users/:userId/status`

- 说明：教务员禁用或恢复账号；禁用后该账号 `POST /auth/login` 在密码校验通过后会被 `ACCOUNT_DISABLED` 阻断
- 鉴权：`officer`，非教务员返回 `403 FORBIDDEN`
- 请求体：`{ "disabled": boolean }`
- 副作用：禁用时清理该账号在 `auth_sessions` 中的会话；恢复时不重发 token，由该账号下次登录获取
- 限制：
  - 不允许对自己执行（`400 CANNOT_MODIFY_SELF`）
  - 已注销账号不可启停（`409 ACCOUNT_CANCELLED`）
  - 状态未变化时返回 `200 user_status_unchanged`
- 成功响应 `message`：`user_disabled` 或 `user_enabled`，`data.user` 为更新后的资料（同 `GET /users/me` 的字段集合）

## 3. 课程

### POST `/courses`

- 说明：教务员创建课程
- 请求体：`courseCode`, `courseName`, `teacherId`, `semester`, `description`, `location`, `scheduleText`, `capacity`, `startDate`, `endDate`

### GET `/courses`

- 说明：多角色查询课程
- 查询参数：`keyword`, `teacherId`, `semester`, `location`, `status`, `enrolledOnly`
- `enrolledOnly=true` 仅对学生有效，返回学生已选课程
- 学生角色调用时，返回项额外携带 `enrolled: boolean`，标记该课程是否已加入；其他角色无此字段

### GET `/courses/:courseId`

- 说明：课程详情
- 学生角色调用时，返回的 `course` 额外携带 `enrolled: boolean`

### PATCH `/courses/:courseId`

- 说明：教务员修改课程

### DELETE `/courses/:courseId`

- 说明：教务员删除课程

### POST `/courses/:courseId/enroll`

- 说明：学生加入课程

### DELETE `/courses/:courseId/enroll`

- 说明：学生退出课程

## 4. 作业

### POST `/courses/:courseId/assignments`

- 说明：教师发布作业
- 请求体：`title`, `description`, `requirement`, `startAt`, `dueAt`

### GET `/courses/:courseId/assignments`

- 说明：获取课程作业列表
- 查询参数：`status`, `mine`, `page`, `pageSize`
- 学生视角返回字段额外包含：`hasSubmitted`, `submissionId`

### GET `/assignments/:assignmentId`

- 说明：作业详情

### PATCH `/assignments/:assignmentId`

- 说明：教师修改作业
- 约束：仅允许在截止时间前且无学生提交记录时修改

### POST `/assignments/:assignmentId/cancel`

- 说明：教师取消作业
- 请求体：`reason`
- 约束：取消时记录原因并清理相关提交记录

## 5. 作业提交与批改

### POST `/assignments/:assignmentId/submissions`

- 说明：学生提交答案
- 请求体：`content`

### PATCH `/submissions/:submissionId`

- 说明：学生修改答案

### GET `/assignments/:assignmentId/submissions`

- 说明：教师查看提交列表
- 查询参数：`status`, `studentKeyword`

### GET `/submissions/:submissionId`

- 说明：提交详情

### POST `/submissions/:submissionId/grade`

- 说明：教师批改
- 请求体：`score`, `teacherFeedback`

## 6. 问题/反馈与答疑

### POST `/submissions/:submissionId/feedbacks`

- 说明：学生发布问题或反馈
- 请求体：`kind`, `content`
- `kind`: `question | feedback`

### GET `/feedbacks`

- 说明：按提交获取问题/反馈线程
- 查询参数：`submissionId`

### GET `/feedbacks/threads`

- 说明：按课程、作业或状态获取问题/反馈线程总览，用于教师待回复任务台
- 查询参数：`courseId`, `assignmentId`, `status`, `limit`, `offset`
- `status` 支持 `open | resolved | deleted`，大小写不敏感
- `limit` 默认 100，最小 1，最大 200；非法值会回退到默认值
- `offset` 默认 0，最小 0；非法值会回退到默认值
- 权限：学生仅查看自己的线程；教师仅查看自己授课课程线程；教务员可查看全部线程
- 返回字段包含：`items[]`（`courseId`, `courseCode`, `courseName`, `assignmentId`, `assignmentTitle`, `submissionId`, `submissionStatus`, `studentName`, `studentNo`, `responses`）以及 `pagination: { limit, offset, count }`

### PATCH `/feedbacks/:feedbackId`

- 说明：学生修改自己的问题/反馈

### DELETE `/feedbacks/:feedbackId`

- 说明：学生删除自己的问题/反馈

### POST `/feedbacks/:feedbackId/responses`

- 说明：教师回复
- 请求体：`content`

### PATCH `/responses/:responseId`

- 说明：教师修改回复

### DELETE `/responses/:responseId`

- 说明：教师删除回复

## 7. 课程反馈

### POST `/courses/:courseId/course-feedbacks`

- 说明：学生对已加入课程新增课程反馈
- 请求体：`dimension`, `content`
- `dimension`: `content | method | teaching | gain | other`

### GET `/course-feedbacks`

- 说明：学生查看自己的课程反馈；教师查看自己课程反馈；教务员查看全部课程反馈
- 查询参数：`courseId`

### PATCH `/course-feedbacks/:feedbackId`

- 说明：学生修改自己的课程反馈

### DELETE `/course-feedbacks/:feedbackId`

- 说明：学生删除自己的课程反馈

## 8. 仪表盘

### GET `/dashboard/student`

- 说明：学生首页摘要，包括已加入课程、待提交作业、已批改提交、作业互动反馈与课程反馈数

### GET `/dashboard/teacher`

- 说明：教师首页摘要，包括待批改数、作业互动反馈数、课程反馈数、课程分布

### GET `/dashboard/officer`

- 说明：教务员首页摘要，包括课程数、用户数、作业互动反馈数、课程反馈数

## 9. 日志与健康检查

### GET `/health`

- 说明：服务健康状态

### GET `/dev/verification-codes`

- 说明：开发态查看最近验证码
- 仅开发环境启用
