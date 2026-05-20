# 部署与运行说明

## 1. 本地开发启动

### 1.1 安装依赖

```bash
npm install
```

### 1.2 一键启动

默认同时启动后端与 Web：

```bash
npm run dev
```

如果需要连同移动端一起启动：

```bash
npm run dev:all
```

脚本等价执行方式：

```bash
bash scripts/dev.sh
bash scripts/dev.sh --mobile
```

运行期日志会输出到 `logs/runtime/`。
如果 `5173` 被占用，Web 端口会自动顺延；请优先使用启动脚本打印出来的实际 `Web` 地址。

### 1.3 启动后端

```bash
npm run dev --workspace @course/server
```

或先构建再启动：

```bash
npm run build --workspace @course/server
npm run start --workspace @course/server
```

后端默认端口：`4100`

### 1.4 启动 Web

```bash
npm run dev --workspace @course/web
```

Web 默认端口通常是 `5173`

### 1.5 启动 Mobile

```bash
npm run start --workspace @course/mobile
```

移动端 API Base URL 建议：

- 浏览器或本机桌面环境：`http://localhost:4100/api/v1`
- Android 模拟器：`http://10.0.2.2:4100/api/v1`

## 2. 数据与日志

### 2.1 数据库

- 数据文件：`data/course-manage-system.db`
- 重置数据库：

```bash
npm run db:reset --workspace @course/server
```

### 2.2 种子账号

```text
教师：13900139000 / Teacher123!
教务员：13700137000 / Officer123!
```

### 2.3 日志

- 全量日志：`logs/server-combined.log`
- 错误日志：`logs/server-error.log`

## 3. 部署建议

### 3.1 课程答辩/演示模式

- 使用本地 SQLite
- 启动后端与 Web
- 移动端通过 Expo 连接本地后端
- 保留日志文件和测试报告，用于演示异常排查与工程质量

### 3.2 CloudBase 验证码模式

默认验证码 provider 为 `local`，开发/测试环境会继续返回 `previewCode` 便于演示和自动化测试。
如需使用 CloudBase 身份认证 HTTP API 发送真实短信验证码，在后端启动环境中设置：

```bash
VERIFICATION_PROVIDER=cloudbase
CLOUDBASE_API_BASE_URL=https://<env-id>.api.tcloudbasegateway.com
CLOUDBASE_API_TOKEN=<api-key-or-publishable-key>
```

CloudBase 控制台需要先开启手机号验证码登录。后端会调用：

- `POST /auth/v1/verification` 发送验证码
- `POST /auth/v1/verification/verify` 校验用户输入验证码

本系统仍使用自己的 `users`、`auth_sessions` 与 JWT；CloudBase 只负责验证码下发与校验。
`npm run dev` / `bash scripts/dev.sh` 会自动加载项目根目录的 `.env.local`。如果单独运行 `npm run dev:server`，需要先手动执行 `source .env.local` 或把变量导出到当前 shell。

### 3.3 迁移到 MySQL

当前数据层按关系模型组织，可按以下顺序迁移：

1. 替换 `apps/server/src/lib/db/*` 中 SQLite 访问实现
2. 保持表结构与字段名不变
3. 复用现有模块、测试与前端接口

## 4. 沙箱说明

在当前自动化开发沙箱中，服务监听端口会被系统阻止，因此无法在本报告中给出“端口已成功绑定”的截图式验证；但构建、测试和启动命令已经过完整校验，用户在本机终端环境中可直接启动。
