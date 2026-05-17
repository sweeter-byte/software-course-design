# 课程互动管理系统

基于四份需求/设计文档完成的课程互动管理系统工程化实现，包含：

- `apps/server`：Fastify + TypeScript + SQLite 的统一后端
- `apps/web`：React Web 管理端/学习端
- `apps/mobile`：Expo React Native 移动工作台
- `packages/*`：共享配置、类型、校验与 UI tokens
- `docs/*`：需求追踪、架构、数据模型、测试计划、测试报告、部署说明

## 已实现核心能力

- 学生手机号注册、验证码申请、登录
- 教师/教务员预置账号登录
- 教务员创建课程与课程概览
- 学生加入课程
- 教师发布作业
- 学生提交作业
- 教师查看提交并批改
- 学生围绕已批改作业发布问题/反馈
- 教师回复反馈线程
- 三角色 dashboard 摘要
- 后端日志落盘到 `logs/server-combined.log` 与 `logs/server-error.log`

## 仓库结构

```text
apps/
  server/
  web/
  mobile/
packages/
  config/
  shared/
  types/
  ui/
docs/
data/
logs/
```

## 运行环境

- Node.js 22+
- npm 10+
- Python/conda 只用于辅助文档处理；本项目运行时不依赖在 `base` 环境安装 Python 包

## 安装

```bash
npm install
```

## 启动方式

### 一键启动

默认同时启动后端与 Web：

```bash
npm run dev
```

如果还要同时启动 Expo 移动端：

```bash
npm run dev:all
```

也可以直接执行脚本：

```bash
bash scripts/dev.sh
bash scripts/dev.sh --mobile
```

运行日志会落到 `logs/runtime/*.log`。
如果 `5173` 已被占用，Vite 会自动切换到下一个可用端口；请以脚本启动后终端打印出来的实际 `Web` 地址为准。

### 1. 启动后端

开发运行：

```bash
npm run dev --workspace @course/server
```

构建并启动：

```bash
npm run build --workspace @course/server
npm run start --workspace @course/server
```

默认地址：`http://localhost:4100`

### 2. 启动 Web

```bash
npm run dev --workspace @course/web
```

默认地址通常是 `http://localhost:5173`

### 3. 启动 Mobile

```bash
npm run start --workspace @course/mobile
```

默认 API 地址需要在 App 顶部输入框中设置：

- 本机浏览器：`http://localhost:4100/api/v1`
- Android 模拟器：`http://10.0.2.2:4100/api/v1`

## 演示账号

- 教师：`13900139000 / Teacher123!`
- 教务员：`13700137000 / Officer123!`
- 学生：通过 Web 或 Mobile 注册

## 质量验证

已执行的关键命令：

```bash
npm run test --workspace @course/server
npm run typecheck --workspace @course/server
npm run typecheck --workspace @course/web
npm run typecheck --workspace @course/mobile
npm run build --workspace @course/server
npm run build --workspace @course/web
npm run lint --workspace @course/web
npm run lint --workspace @course/server
npm run lint --workspace @course/mobile
npm run test
npm run typecheck
```

详细结果见：

- `docs/TEST_PLAN.md`
- `docs/TEST_REPORT.md`
- `docs/DEPLOYMENT.md`

## 说明

- 后端当前使用 SQLite 文件数据库以降低演示门槛，关系模型与仓库层按可迁移到 MySQL 的方式组织。
- 在本沙箱中直接绑定监听端口会触发 `EPERM`，因此运行级验证以构建、测试和可执行入口检查为主；在正常本机环境可直接启动服务。
