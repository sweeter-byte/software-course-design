# 测试报告

测试日期：2026-05-18

## 1. 自动化测试结果

执行命令：

```bash
npm run test --workspace @course/server
```

结果：

- 10 个测试文件通过
- 42 个测试用例通过
- 覆盖链路：健康检查、认证、资料维护、双验证码改手机号、改密、找回密码、注销、课程 CRUD、多条件查询、选课、课程反馈新增/修改/查看/删除与仪表盘统计、作业发布/修改/取消、学生提交状态和个人提交摘要、截止/已提交后的作业修改保护、提交/修改/查询/批改、问题反馈发布/总览/修改/删除、回复新增/修改/删除、摘要
- 作业提交、作业修改和反馈链路中的可提交作业日期已改为相对当前日期生成，避免固定截止日期过期导致测试失效。

Web 客户端测试：

```bash
npm run test --workspace @course/web
```

结果：

- 7 个测试文件通过
- 15 个测试用例通过
- 覆盖链路：运行态会话恢复、展示文案、依赖解析、无请求体 API 写操作请求头、反馈线程总览 API 查询参数、日期转换、友好错误文案、演示默认作业日期保持在未来

## 2. 类型检查结果

执行命令：

```bash
npm run typecheck --workspace @course/server
npm run typecheck --workspace @course/web
npm run typecheck --workspace @course/mobile
npm run typecheck
```

结果：

- Server 通过
- Web 通过
- Mobile 通过
- Root workspace 聚合校验通过

## 3. 构建结果

执行命令：

```bash
npm run build --workspace @course/server
npm run build --workspace @course/web
```

结果：

- Server 构建成功
- Web 构建成功

## 4. 代码质量结果

执行命令：

```bash
npm run lint --workspace @course/web
npm run lint --workspace @course/server
npm run lint --workspace @course/mobile
```

结果：

- Web lint 通过
- Server lint/typecheck 通过
- Mobile lint/typecheck 通过

## 5. 运行验证

### 5.1 构建产物验证

- Server 构建产物已生成
- Web 构建产物已生成

### 5.2 沙箱限制说明

当前本地开发服务已启动并验证：

- API：`http://localhost:4100/health` 返回 `healthy`
- Web：`http://localhost:5173/` 返回 200

双端同步验证使用真实 HTTP 请求模拟 Web/Mobile 两端交替写入和读取，验证通过：

- Web 创建课程 -> Mobile 查询课程
- Mobile 修改课程 -> Web 查询课程详情
- Web 创建课程反馈 -> Mobile 教师查询课程反馈
- Mobile 修改课程反馈 -> Web 学生查询课程反馈
- Web 发布作业 -> Mobile 查询作业
- Web 查询学生作业提交状态 -> Mobile 提交后 Web 查询状态更新
- Mobile 修改作业 -> Web 查询作业
- Web 提交答案 -> Mobile 教师查询提交
- Mobile 批改答案 -> Web 学生查询成绩
- Web 发布问题/反馈 -> Mobile 教师查询线程
- Mobile 增加回答 -> Web 学生查询回答

同步验证样例课程代码：`SYNC-38039165`。

## 6. 当前残余风险

- Web 已补统一上下文、学生“我的作业”和教师任务工作台；后续可继续路由化拆分更细的业务页面。
- Mobile 当前为单屏工作台式交互，后续可以继续演进为更细的原生导航结构。
- SQLite 基于 Node 实验特性 `node:sqlite`；本地演示足够稳定，但正式答辩如需更保守方案，可迁移到 MySQL。
