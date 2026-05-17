# 课程互动管理系统数据模型

## 1. 用户 `users`

用途：统一承载学生、教师、教务员的认证主体。

关键字段：

- `id`
- `role`：`student | teacher | officer`
- `status`：`active | cancelled | disabled`
- `phone`
- `password_hash`
- `username`
- `real_name`
- `email`
- `gender`
- `id_number`
- `student_no`
- `teacher_no`
- `college`
- `major`
- `class_name`
- `created_at`
- `updated_at`

约束：

- `phone` 唯一
- `student_no` 对学生唯一
- `teacher_no` 对教师唯一

## 2. 验证码 `verification_codes`

用途：注册、改绑手机号、找回密码。

关键字段：

- `id`
- `phone`
- `purpose`
- `code`
- `expires_at`
- `used_at`
- `created_at`

## 3. 会话 `auth_sessions`

用途：刷新令牌、登录态控制、设备审计。

关键字段：

- `id`
- `user_id`
- `refresh_token_hash`
- `expires_at`
- `last_seen_at`
- `created_at`

## 4. 课程 `courses`

用途：承载课程基础信息与运行状态。

关键字段：

- `id`
- `course_code`
- `course_name`
- `description`
- `teacher_id`
- `created_by`
- `semester`
- `location`
- `schedule_text`
- `capacity`
- `start_date`
- `end_date`
- `status`：`not_started | active | completed | suspended`
- `created_at`
- `updated_at`

## 5. 选课/加入课程 `course_enrollments`

用途：补齐学生与课程的归属关系。

关键字段：

- `id`
- `course_id`
- `student_id`
- `status`：`enrolled | dropped`
- `created_at`
- `updated_at`

约束：

- `course_id + student_id` 唯一

## 6. 作业 `assignments`

用途：教师面向课程发布任务。

关键字段：

- `id`
- `course_id`
- `teacher_id`
- `title`
- `description`
- `requirement`
- `start_at`
- `due_at`
- `status`：`draft | published | cancelled | closed`
- `cancel_reason`
- `created_at`
- `updated_at`

## 7. 作业提交 `submissions`

用途：学生提交答案并承载批改结果。

关键字段：

- `id`
- `assignment_id`
- `student_id`
- `content`
- `status`：`draft | submitted | graded`
- `score`
- `teacher_feedback`
- `submitted_at`
- `graded_at`
- `created_at`
- `updated_at`

约束：

- `assignment_id + student_id` 唯一

## 8. 问题/反馈 `feedbacks`

用途：学生围绕已批改作业提出问题或反馈。

关键字段：

- `id`
- `assignment_id`
- `submission_id`
- `student_id`
- `kind`：`question | feedback`
- `content`
- `status`：`open | resolved | deleted`
- `created_at`
- `updated_at`

## 9. 答疑回复 `responses`

用途：教师回复学生问题或反馈。

关键字段：

- `id`
- `feedback_id`
- `teacher_id`
- `content`
- `created_at`
- `updated_at`
- `edited_at`

## 10. 课程反馈 `course_feedbacks`

用途：学生围绕课程内容、教学方法、教师授课、学习收获等维度提交课程反馈。

关键字段：

- `id`
- `course_id`
- `student_id`
- `dimension`：`content | method | teaching | gain | other`
- `content`
- `status`：`open | deleted`
- `created_at`
- `updated_at`

## 11. 审计/业务事件 `audit_logs`

用途：记录关键业务动作，便于排查与答辩说明。

关键字段：

- `id`
- `actor_user_id`
- `actor_role`
- `action`
- `entity_type`
- `entity_id`
- `summary`
- `created_at`

## 12. 生命周期说明

- 用户：`active -> cancelled/disabled`
- 课程：`not_started -> active -> completed`，异常时可进入 `suspended`
- 作业：`draft -> published -> closed/cancelled`
- 提交：`draft -> submitted -> graded`
- 课程反馈：`open -> deleted`
- 反馈：`open -> resolved`，删除采用软删除语义
