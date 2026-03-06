# Plan: Rename `username` to `handle` across codebase

**Issue:** #87

The migration `20260304141015_rename_username_to_handle_add_trigger_and_rls_policies.sql` renamed `profiles.username` to `profiles.handle`. This plan updates the rest of the codebase (code, tests, docs, Postman) to match.

## Tasks

### Source Code — Interfaces & Types

- [ ] `src/users/users.service.ts` — `UserProfile.username` → `.handle`
- [ ] `src/auth/current-user.decorator.ts` — `CurrentUserPayload.username` → `.handle`
- [ ] `src/links/links.controller.ts` — `AuthUser.username` → `.handle`
- [ ] `src/api-keys/api-keys.controller.ts` — `AuthUser.username` → `.handle`

### Source Code — Services & Guards

- [ ] `src/users/users.service.ts` — `findByUsername()` → `findByHandle()`, Supabase `.select("id, handle")`, `.eq("handle", ...)`
- [ ] `src/auth/api-key.guard.ts` — `.select("handle")`, `profileRow.handle`, route param `:handle`, `request.user = { userId, handle }`
- [ ] `src/feed/feed.service.ts` — rename `username` parameter to `handle`

### Source Code — Controllers

- [ ] `src/links/links.controller.ts` — `@Controller(":handle/links")`, `@ApiParam({ name: "handle" })`, `@Param("handle")`
- [ ] `src/feed/feed.controller.ts` — same pattern
- [ ] `src/api-keys/api-keys.controller.ts` — same pattern

### Tests

- [ ] `src/users/users.service.spec.ts`
- [ ] `src/auth/current-user.decorator.spec.ts`
- [ ] `src/auth/api-key.guard.spec.ts`
- [ ] `src/links/links.controller.spec.ts`
- [ ] `src/feed/feed.service.spec.ts`
- [ ] `src/feed/feed.controller.spec.ts`

### Browser Extension

- [ ] `browser-extension/src/types/index.ts` — placeholder `{your-username}` → `{your-handle}`

### Documentation

- [ ] `CLAUDE.md`
- [ ] `github_pages/api.md`
- [ ] `github_pages/architecture.md`
- [ ] `github_pages/getting-started.md`
- [ ] `github_pages/browser-extension.md`
- [ ] `github_pages/edge-functions.md`

### Postman

- [ ] `postman/Linkblog API.postman_collection.json` — `{{username}}` → `{{handle}}`

### Not Changed

- Applied migrations (`20260225000001`, `20260225000002`) — leave as-is

### Verification

- [ ] `pnpm lint && pnpm fmt && pnpm test` all pass
