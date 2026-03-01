# CLAUDE.md

# Project

Linkblog Service - This the API for Linkblog, a linkblog service.  

## Key Conventions

- **Endpoints:** `/:username/links` (CRUD; reads public, writes protected), `/:username/feed` (public RSS 2.0), `/:username/api-keys` (key management, protected), `/health` (public), `/api-docs` (Swagger UI)
- **Auth:** Multi-user, global `ApiKeyGuard` via `APP_GUARD`. Write endpoints require `x-api-key` header (per-user keys stored as SHA-256 hashes in `api_keys` table). Public routes use `@Public()` decorator to opt out. See `src/auth/`.
- **Data model:** Supabase tables: `links` (id, url, title, summary, user_id, created_at, updated_at), `profiles` (id, username), `api_keys` (id, user_id, name, key_hash, created_at, last_used_at), `app_config` (key, value)
- **Deploy:** AWS App Runner (manual console config; `apprunner.yaml` is reference only). Production URL: `api.linkblog.in`

## Commands

- `pnpm start:dev` — dev server with hot reload
- `pnpm build` — production build
- `pnpm test` — run all tests. `pnpm test <pattern>` to filter (e.g. `pnpm test auth`).
- `pnpm lint` / `pnpm lint:fix` — oxlint
- `pnpm fmt` / `pnpm fmt:check` — oxfmt
- `pnpm build:extension` / `pnpm clean:extension` — build or clean the browser extension

## Environment Variables

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (bypasses RLS)
- `API_URL` - Base URL for feed links (defaults to production URL)
- `PORT` - Server port (set by App Runner in production)

## Supabase JS Client (`@supabase/supabase-js`)

- v2.x via `@supabase/supabase-js`. Use Context7 for query API reference.
- **Type generation:** `pnpx supabase gen types typescript --project-id <ref> > database.types.ts`
- **Init:** disable `autoRefreshToken` and `persistSession` (server-side, no browser sessions). See `src/supabase/supabase.module.ts`.
- **Error handling:** All queries return `{ data, error }` — always check `error` before using `data`.

## Module Structure

```
AppModule
├── ConfigModule       (global, loads .env)
├── LoggerModule       (global, nestjs-pino structured logging)
├── SupabaseModule     (global, provides SUPABASE_CLIENT token)
├── AuthModule         (global ApiKeyGuard via APP_GUARD)
├── UsersModule        (username → user_id lookups)
├── ApiKeysModule      (per-user API key CRUD)
├── LinksModule        (CRUD service + controller)
├── FeedModule         (RSS feed generation)
└── HealthModule       (GET /health for App Runner)
```

## GitHub Pages

- `github_pages/` — Jekyll site using Minimal Mistakes (air skin), deployed via GitHub Actions to `docs.linkblog.in`

## Workflow

- All code changes must reference a GitHub issue. Check `gh issue list` before starting work.
- CI runs on PRs to `main` (`.github/workflows/ci.yml`): install, lint, fmt:check, build, test, plus extension lint/typecheck/build.

## Testing (Vitest)

- Vitest with `globals: true` provides `describe`, `it`, `expect`, `beforeEach` globally
- Mock Supabase with a chainable object (`from/select/insert/update/delete/eq/order/single` all return `this`)
- Use `vi.fn()` and `vi.spyOn()` (not Jest's `jest.fn()`)
- Use `vi.mocked(service.method)` to type-spy on mocked methods
- Use `Reflect.getMetadata(KEY, handler)` to verify decorator presence on controller methods
- **Controller tests:** Due to Vitest + esbuild incompatibility with NestJS decorator metadata, instantiate controllers manually with mocked services instead of using `Test.createTestingModule()`:

```typescript
// Instead of Test.createTestingModule:
const service = { method: vi.fn() } as unknown as SomeService;
const controller = new SomeController(service);
```

## Testing (Postman)

- `postman/Linkblog API.postman_collection.json` — API collection (folders: Health, Links, Feed, CRUD Workflow)
- `postman/environment.json` — "Linkblog - Local" env (vars: `baseUrl`, `apiKey`, `linkId`)
- `postman/specs/` — reserved for API specs
- Auth edge case tests (no key, wrong key) live in the Health folder, not a separate folder
- Links and CRUD Workflow folders use folder-level `x-api-key` auth via `{{apiKey}}`
- Test scripts auto-capture `linkId` from create/list responses for downstream requests

## Browser Extension

`browser-extension/` — Chrome/Safari MV3 extension (workspace package `linkblog-extension`).
Build: `pnpm build:extension`. Clean build: `pnpm clean:extension`. Source in `browser-extension/src/`.

- Uses `browser.*` namespace with a `globalThis.browser ?? globalThis.chrome` shim for cross-browser compat.
- Safari: `notifications` API is unsupported; notification calls silently no-op.
- Root `tsconfig.json` and `tsconfig.build.json` both exclude `browser-extension/` and `supabase/` to avoid NestJS compilation conflicts (Deno/non-Node code).

## Supabase Edge Functions

`supabase/functions/` — Deno Edge Functions (NOT Node). Run via `pnpx supabase functions serve <name> --env-file supabase/.env.local`.

- **Auth:** `verify_jwt = false` in `config.toml` for functions using custom auth. Configure per-function under `[functions.<name>]`.
- **Secrets:** `SUPABASE_URL` is auto-injected. New keys (`sb_secret_*`, `sb_publishable_*`) are NOT auto-injected yet — set via `.env.local` (local) or `supabase secrets set` (hosted). Cannot use `SUPABASE_` prefix for custom secrets.
- **pg_net + Docker:** Triggers using `pg_net` run inside the Postgres container. Use `http://kong:8000` (internal Docker network), not `http://127.0.0.1:54321`, for local edge function calls.
- **DB config:** `ALTER DATABASE SET app.settings.*` requires superuser (not available locally). Use the `app_config` table instead.
- **Trigger config:** `app_config` table stores `supabase_url` for the `notify_fetch_metadata()` trigger. Seeded via `supabase/seed.sql`.
- **Deploy:** `pnpx supabase functions deploy <name> --linked` + `pnpx supabase db push --linked` for migrations.

## Gotchas

- App Runner "config from repository" mode hides the env var UI in console. Use manual config to set secrets.
- `but` may fail with "index is locked" due to GitButler's own `background-refresh.lock` / `project.lock` — wait a few seconds and retry; do not delete these files.
- Use `pnpx` (not `npx`) for one-off package execution — matches `pnpm` package manager.
- `but commit` uses `-p <cli-id>` (or `--changes`) to commit specific files, not `--files` or `-F`.
- GitHub repo: `vidluther/linkblog` - use with `gh` commands.

## Tool Preferences

- Use `rg` (ripgrep) for searching file contents and finding files, not `find` or `grep`
- Use `but` (GitButler CLI) instead of `git` for all version control operations, including PRs (`but pr new <branch>` instead of `gh pr create`)
- Use `pnpm` instead of `npm`, `yarn`, or `bun` for package management
