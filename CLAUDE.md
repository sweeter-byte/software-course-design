# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project shape

Single npm workspace monorepo (`npm@10.9.4`, Node 22+) implementing a 课程互动管理系统 (course interaction management system) for three roles: `student`, `teacher`, `officer`.

- `apps/server` — Fastify + TypeScript REST API on port `4100`, using `node:sqlite` (`DatabaseSync`). All routes are mounted under `/api/v1/*` from `apps/server/src/app.ts`.
- `apps/web` — Vite + React 19 SPA on port `5173` (Vite auto-shifts ports when occupied; `scripts/dev.sh` parses the real URL out of the Vite log).
- `apps/mobile` — Expo React Native client; API base URL is entered in-app at runtime.
- `packages/config|shared|types|ui` — pure-source TS packages with no build step (consumers import directly via deep relative paths, e.g. `../../../../../packages/shared/src/index`). There is no path-alias setup; do not introduce one without updating every consumer.

## Common commands

Root (workspace-wide):

```bash
npm install                # bootstrap once
npm run dev                # server + web together (scripts/dev.sh)
npm run dev:all            # server + web + mobile
npm run build              # build all workspaces with --if-present
npm run typecheck          # all workspaces
npm run lint               # all workspaces (server/mobile "lint" is `tsc --noEmit`)
npm run test               # runs vitest in each workspace + scripts/tests/dev-runtime.test.sh
npm run seed               # @course/server seed CLI
npm run db:reset           # wipes data/course-manage-system.db
```

Per-workspace (use these when iterating on a single app):

```bash
npm run dev --workspace @course/server
npm run dev --workspace @course/web
npm run start --workspace @course/mobile

npm run test --workspace @course/server     # vitest integration suites in apps/server/tests
npm run test --workspace @course/web        # vitest unit specs alongside sources
npm run typecheck --workspace @course/web   # tsc -b (project references)
npm run lint --workspace @course/web        # ESLint flat config (only @course/web has real ESLint)
```

Run a single server integration test:

```bash
npx vitest run tests/auth.integration.test.ts --workspace apps/server
# or inside apps/server:
npx vitest run tests/auth.integration.test.ts -t "registers a student"
```

Server tests use `buildApp({ databasePath: ':memory:', env: 'test' })` and drive routes via `app.inject(...)` — no network, no port binding. Sandbox/CI environments may block `app.listen()`; prefer `inject` in tests.

## Architecture

### Backend request lifecycle (`apps/server/src/app.ts`)

`buildApp(options)` is the composition root. It:

1. Resolves `AppConfig` (`apps/server/src/lib/config.ts`) — `databasePath` defaults to `data/course-manage-system.db`, JWT secret is hardcoded for the demo.
2. Opens SQLite via `createDatabase()` which runs `applyMigrations()` from `apps/server/src/lib/db/schema.ts` — **all schema lives in one `database.exec` block**; add new tables there, not in ad-hoc migrations.
3. Optionally seeds demo data (`seedDemoData`) when `options.seedDemoData` is true. Seed is idempotent (skips if users exist).
4. Registers CORS, `@fastify/jwt`, request timing/logging hooks, a 404 handler, and `setErrorHandler` that funnels everything through `toAppError` → `errorResponse`.
5. Mounts module routers under `/api/v1/...`. Module folders live in `apps/server/src/modules/{auth,courses,users,assignments,submissions,feedback,responses,course-feedbacks,dashboard}` — each exports a `register*Routes(api, ctx)` function taking `{ database, logger, config? }`.

When adding endpoints, follow this pattern: validate with a Zod schema imported from `packages/shared/src/index.ts`, authorize via `requireAuth` / `requireRole` from `apps/server/src/lib/guards.ts`, wrap responses with `successResponse` / `sendCreated` / `errorResponse` from `apps/server/src/lib/http.ts`. Throw `AppError(message, statusCode, code, details?)` for business errors — the global error handler maps it to the standard envelope.

### Response envelope

Every API response (success or failure) is:

```ts
{ success: boolean, message: string, data?, error?: { code, details? }, meta: { requestId } }
```

The web client (`apps/web/src/api.ts`) unwraps `payload.data` and throws `ApiError(payload.message, status)` on non-2xx — keep that contract intact when changing responses.

### Auth & sessions

- Login/registration issues a JWT via `reply.jwtSign` plus a refresh token stored as a bcrypt hash in `auth_sessions`.
- `requireAuth` calls `request.jwtVerify<AuthTokenPayload>()`; `requireRole` adds an allowlist check and throws `AppError('forbidden', 403, 'FORBIDDEN')`.
- Verification codes (`verification_codes` table) are 6-digit random strings. In non-production `config.allowVerificationPreview` is `true`, so `POST /auth/verification-code` returns the code in `data.previewCode` — tests rely on this; do not gate it behind extra flags.
- Demo accounts (seeded): teacher `13900139000 / Teacher123!`, officer `13700137000 / Officer123!`. Students self-register.

### Data model

Schema (single source: `apps/server/src/lib/db/schema.ts`):

`users → courses → course_enrollments → assignments → submissions → feedbacks → responses`, plus `course_feedbacks`, `verification_codes`, `auth_sessions`, `audit_logs`. Enum values are enforced via SQLite `CHECK` constraints — if you add a new status/role/dimension, update the CHECK alongside the Zod schema in `packages/shared/src/index.ts`.

### Web app

- Single-bundle SPA: `apps/web/src/App.tsx` is ~2.3k lines and contains all role workspaces (`dashboard | courses | courseAdmin | assignments | grading | courseFeedbacks | interaction | account`). Be deliberate when adding features here — prefer extending the existing view state machine over inventing parallel routing.
- Data layer: TanStack Query + the `api` object in `apps/web/src/api.ts`. The API base URL is configured at runtime (default `http://localhost:4100/api/v1`); persisted bits are read by `runtime-state.ts`.
- React/ReactDOM are deduped via Vite aliases in `apps/web/vite.config.ts` to survive workspace hoisting quirks — don't remove the `createRequire` resolve block unless you know why it's there.

### Build/output specifics

- Server build: `tsc -p tsconfig.build.json` emits to `apps/server/dist/`; a post-build `scripts/write-dist-package-json.mjs` writes `dist/package.json` with `{ "type": "commonjs" }` so Node loads the compiled output as CJS (sources are ESM). The `start` script points at `dist/apps/server/src/index.js`.
- Web build: `tsc -b && vite build` (project references in `tsconfig.app.json` / `tsconfig.node.json`).

### Logging

`createLogWriter(logsDir)` writes structured JSON lines to `logs/server-combined.log` and `logs/server-error.log` at the repo root. Dev script logs go to `logs/runtime/{server,web,mobile}-dev.log`. Don't log secrets or full request bodies.

## Conventions worth knowing

- **No path aliases.** Cross-package imports use long relative paths; mirror the existing style rather than introducing tsconfig `paths`.
- **No ORM.** Routes call `database.prepare(...).run/get/all(...)` directly. Bind parameters; never interpolate.
- **Zod schemas in `packages/shared`** are reused by web/mobile/server — change them in one place and verify all three typecheck.
- **`scripts/dev.sh`** is the supported way to run server+web together; it tails the Vite log to surface the actual port if 5173 is taken. There is a regression test (`scripts/tests/dev-runtime.test.sh`) covering that parser — keep it green.
- Docs in `docs/` (especially `ARCHITECTURE.md`, `API_SPEC.md`, `DATA_MODEL.md`, `REQUIREMENTS_TRACEABILITY.md`) are authoritative for the academic-deliverable framing; consult them before changing role permissions or response shapes.
