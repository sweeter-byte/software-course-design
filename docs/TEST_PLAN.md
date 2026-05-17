# 测试计划

## 1. 目标

验证课程互动管理系统的核心业务链路、角色权限和工程可运行性，确保 Web、移动端和后端围绕同一数据事实源工作。

## 2. 覆盖范围

### 2.1 后端自动化测试

- `apps/server/tests/app.integration.test.ts`
  - `/health` 健康检查
- `apps/server/tests/auth.integration.test.ts`
  - 验证码申请
  - 学生注册
  - 学生登录
  - 教务员种子账号登录
- `apps/server/tests/courses.integration.test.ts`
  - 教务员创建课程
  - 已登录用户查询课程
- `apps/server/tests/enrollments.integration.test.ts`
  - 学生加入课程
- `apps/server/tests/assignments.integration.test.ts`
  - 教师发布作业
  - 课程作业列表查询
- `apps/server/tests/submissions.integration.test.ts`
  - 学生提交答案
  - 教师批改答案
  - 教师查看提交列表
- `apps/server/tests/feedback.integration.test.ts`
  - 学生发布问题/反馈
  - 教师回复
  - 带回复的线程查询
- `apps/server/tests/dashboard.integration.test.ts`
  - 教务员 dashboard 摘要

### 2.2 工程级校验

- Server typecheck / build
- Web typecheck / build / lint
- Mobile typecheck
- Root workspace test / typecheck

## 3. 手工测试清单

### 3.1 学生流

1. 打开 Web，申请验证码并注册学生账号
2. 登录学生账号
3. 在课程池加入课程
4. 查看课程作业
5. 提交作业答案
6. 在教师批改后，发布问题或反馈
7. 查看教师回复

### 3.2 教师流

1. 使用预置教师账号登录
2. 选择自己课程并发布作业
3. 查看学生提交列表
4. 录入分数和评语
5. 进入反馈线程并回复

### 3.3 教务员流

1. 使用预置教务员账号登录
2. 创建课程
3. 查看 dashboard 摘要
4. 搜索课程并验证课程详情信息

## 4. 通过标准

- 自动化测试全部通过
- Typecheck 全部通过
- Web 与 Server build 成功
- 手工主路径无阻塞性错误
- 关键失败场景返回明确错误信息，不出现静默失败
