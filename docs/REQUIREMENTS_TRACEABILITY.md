# 需求追踪矩阵

| ID | 需求摘要 | 来源文档 | 实现位置 | 测试位置 |
| --- | --- | --- | --- | --- |
| RQ-AUTH-01 | 学生使用手机号注册，校验唯一性、验证码与密码确认 | 需求获取 3.1.1；系统设计 Student 登录/注册逻辑 | `apps/server/src/modules/auth` `apps/web/src/features/auth` `apps/mobile/src/features/auth` | `apps/server/tests/auth.integration.test.ts` |
| RQ-AUTH-02 | 学生/教师/教务员登录并按角色进入对应界面 | 需求获取 3.1.1；需求分析行为模型 | `apps/server/src/modules/auth` `apps/web/src/features/auth` `apps/mobile/src/features/auth` | `apps/server/tests/auth.integration.test.ts` |
| RQ-AUTH-03 | 修改资料、双验证码修改手机号、修改密码、找回密码、注销账号 | 需求获取 3.1.1；系统设计 Student 事务逻辑 | `apps/server/src/modules/users` `apps/server/src/modules/auth` `apps/web/src/App.tsx` `apps/mobile/App.tsx` | `apps/server/tests/profile.integration.test.ts` |
| RQ-COURSE-01 | 教务员添加、查询、修改、删除课程，修改/删除前确认 | 需求获取 3.1.2；系统设计 CourseInfo | `apps/server/src/modules/courses` `apps/web/src/features/officer/courses` `apps/mobile/src/features/officer/courses` | `apps/server/tests/courses.integration.test.ts` |
| RQ-COURSE-02 | 三角色按条件检索课程并查看详情 | 需求获取 3.1.2；系统设计 CourseInfo 查询流程 | `apps/server/src/modules/courses` `apps/web/src/features/courses` `apps/mobile/src/features/courses` | `apps/server/tests/courses.integration.test.ts` |
| RQ-COURSE-03 | 学生查看自己已选课程与课程作业 | 需求获取 2.2、3.1.3；假设 A4 | `apps/server/src/modules/enrollments` `apps/web/src/features/student/courses` `apps/mobile/src/features/student/courses` | `apps/server/tests/enrollments.integration.test.ts` |
| RQ-ASSIGN-01 | 教师发布作业，包含标题、描述、要求、截止时间 | 需求获取 3.1.3；需求分析 AssignmentInfo | `apps/server/src/modules/assignments` `apps/web/src/features/teacher/assignments` `apps/mobile/src/features/teacher/assignments` | `apps/server/tests/assignments.integration.test.ts` |
| RQ-ASSIGN-02 | 教师在截止前且无学生提交时修改作业 | 需求获取 3.1.3；系统设计 modifyAssignment | `apps/server/src/modules/assignments` `apps/web/src/features/teacher/assignments` `apps/mobile/App.tsx` | `apps/server/tests/assignments.integration.test.ts` |
| RQ-ASSIGN-03 | 教师取消/删除作业并记录原因，操作前确认 | 需求获取 3.1.3 | `apps/server/src/modules/assignments` `apps/web/src/features/teacher/assignments` `apps/mobile/App.tsx` | `apps/server/tests/assignments.integration.test.ts` |
| RQ-SUBMIT-01 | 学生截止前提交答案 | 需求获取 3.1.4；系统设计 submitAssignmentAnswer | `apps/server/src/modules/submissions` `apps/web/src/features/student/submissions` `apps/mobile/src/features/student/submissions` | `apps/server/tests/submissions.integration.test.ts` |
| RQ-SUBMIT-02 | 学生在截止前且未批改前修改答案 | 需求获取 3.1.4 | `apps/server/src/modules/submissions` `apps/web/src/features/student/submissions` `apps/mobile/src/features/student/submissions` | `apps/server/tests/submissions.integration.test.ts` |
| RQ-SUBMIT-03 | 教师批改答案并给出评价与分数 | 需求获取 3.1.4；系统设计 correctAssignmentAnswer | `apps/server/src/modules/submissions` `apps/web/src/features/teacher/grading` `apps/mobile/src/features/teacher/grading` | `apps/server/tests/submissions.integration.test.ts` |
| RQ-SUBMIT-04 | 学生查询提交状态与批改结果 | 需求获取 3.1.4；需求分析状态模型 | `apps/server/src/modules/submissions` `apps/web/src/features/student/submissions` `apps/mobile/src/features/student/submissions` | `apps/server/tests/submissions.integration.test.ts` |
| RQ-QA-01 | 学生在作业批改后发布问题或反馈 | 需求获取 3.1.5；需求分析 Feedback 类 | `apps/server/src/modules/feedback` `apps/web/src/features/student/feedback` `apps/mobile/src/features/student/feedback` | `apps/server/tests/feedback.integration.test.ts` |
| RQ-QA-02 | 学生查看、修改、删除自己的问题或反馈 | 需求获取 3.1.5 | `apps/server/src/modules/feedback` `apps/web/src/features/student/feedback` `apps/mobile/src/features/student/feedback` | `apps/server/tests/feedback.integration.test.ts` |
| RQ-QA-03 | 教师增加、查看、修改、删除回答 | 需求获取 3.1.6；需求分析 Response 类 | `apps/server/src/modules/responses` `apps/web/src/App.tsx` `apps/mobile/App.tsx` | `apps/server/tests/feedback.integration.test.ts` |
| RQ-COURSE-FB-01 | 学生对课程增加、修改、查看、删除反馈；教师查看自己课程反馈；教务员查看全部课程反馈 | 需求获取 3.1.7 | `apps/server/src/modules/course-feedbacks` `apps/web/src/App.tsx` `apps/mobile/App.tsx` | `apps/server/tests/course-feedbacks.integration.test.ts` |
| RQ-GOV-01 | 教务员查看课程运行、用户、作业互动反馈与课程反馈总览 | 开题报告目标；需求获取 2.1、2.2、3.1.7 | `apps/server/src/modules/dashboard` `apps/web/src/features/officer/dashboard` `apps/mobile/src/features/officer/dashboard` | `apps/server/tests/dashboard.integration.test.ts` |
| RQ-GOV-02 | 教务员账号管理最小集：查看全部账号（可按角色筛选）、禁用/恢复账号，禁用账号登录被拒，不可对自己执行 | 开题报告目标；需求获取 2.1；UX 改进 P1-7 | `apps/server/src/modules/users/routes.ts` `apps/server/src/modules/auth/routes.ts` `apps/web/src/features/officer/UserAdminSection.tsx` `apps/web/src/App.tsx` | `apps/server/tests/users-admin.integration.test.ts` |
| RQ-NFR-01 | 响应时间目标：多数操作小于 1 秒，整体不超过 1.5 秒 | 需求获取 3.2.2 | `apps/server/src/lib/perf` `docs/TEST_PLAN.md` | `docs/TEST_REPORT.md` |
| RQ-NFR-02 | 数据一致性、异常恢复、输入校验 | 需求获取 3.5；宪章 8/9/10/13 | `apps/server/src/lib/errors` `apps/server/src/lib/validation` `apps/server/src/lib/logging` | `apps/server/tests/*.test.ts` |
| RQ-NFR-03 | Web 与移动端共享单一后端、保持同步 | 宪章 4.2、9；开题报告移动端复用后端 API | `packages/shared` `packages/types` `apps/web` `apps/mobile` `apps/server` | `apps/server/tests/sync.integration.test.ts` |
| RQ-NFR-04 | 记录日志，便于排错和后续审计 | 宪章 8.1；用户追加要求 | `apps/server/src/lib/logging` `logs/` | `apps/server/tests/logging.unit.test.ts` |

当前已完成并具备自动化测试覆盖的模块：

- 认证与验证码
- 资料修改、修改密码、找回密码、注销账号、退出登录
- 双验证码修改手机号
- 课程创建、详情、修改、删除与多条件查询
- 选课
- 作业发布、修改、取消与作业列表
- 作业提交、修改、查询、批改、提交列表、已批改保护
- 问题/反馈发布、修改、删除、线程查询
- 教师回复、修改回复、删除回复
- 课程反馈新增、修改、查看、删除
- 三角色 dashboard 摘要
- 教务员账号列表、按角色筛选、禁用 / 恢复（含登录阻断与不能禁用自己）

验收自查详见 `docs/ACCEPTANCE_SELF_CHECK.md`。
