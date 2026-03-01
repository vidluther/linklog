---
layout: single
title: Architecture
permalink: /architecture/
toc: true
---

## Overview

Linkblog is a multi-user bookmarking API. There is no frontend — it is designed to be called by scripts, browser extensions, shortcuts, or other services. The public RSS feed is consumed by [luther.io](https://luther.io) at build time.

```
                           ┌─────────────────────────────┐
                           │       Supabase (DB)          │
                           │  ┌───────────────────────┐   │
                           │  │  links table           │   │
                           │  │  profiles table        │   │
                           │  │  api_keys table        │   │
                           │  │  app_config table      │   │
                           │  │  (Postgres)            │   │
                           │  └───────────────────────┘   │
                           └──────────────▲──────────────┘
                                          │
                          @supabase/supabase-js
                                          │
┌──────────────────┐      ┌───────────────┴──────────────┐
│  curl / apps /   │─────▶│         NestJS API            │
│  browser ext.    │ HTTP  │                               │
└──────────────────┘      │  /:username/links  (CRUD)     │
                          │  /:username/feed   (RSS)      │
                          │  /:username/api-keys (mgmt)   │
                          │  /health           (public)   │
                          │  /docs             (Swagger)  │
                          └───────────────────────────────┘
                                          │
                                     Docker │
                                          ▼
                          ┌───────────────────────────────┐
                          │      AWS App Runner            │
                          └───────────────────────────────┘

                          ┌───────────────────────────────┐
  DB trigger (pg_net) ───▶│  Supabase Edge Function        │
                          │  fetch-metadata (Deno)         │
                          └───────────────────────────────┘
```

## NestJS Module Structure

```
AppModule
├── ConfigModule          (global, loads .env)
├── LoggerModule          (global, nestjs-pino structured logging)
├── SupabaseModule        (global, provides Supabase client)
├── AuthModule            (global ApiKeyGuard via APP_GUARD)
├── UsersModule           (username → user_id lookups)
├── ApiKeysModule         (per-user API key CRUD)
├── LinksModule           (link CRUD service + controller)
├── FeedModule            (per-user RSS feed generation)
└── HealthModule          (GET /health for App Runner)
```

### AppModule

The root module. Imports all feature modules and configures global middleware (validation pipe, exception filter, pino logger).

### ConfigModule

NestJS `ConfigModule.forRoot({ isGlobal: true })` — loads `.env` so environment variables are available everywhere via `ConfigService`.

### LoggerModule

`nestjs-pino` with structured JSON logging in production and `pino-pretty` single-line output in development. Custom log levels: 500+ → error, 400+ → warn, else → info.

### SupabaseModule

A `@Global()` module that creates and exports a configured `SupabaseClient`. It uses `ConfigService` to read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and disables `autoRefreshToken` and `persistSession` since this is a server-side app with no browser sessions.

The client is provided under the `SUPABASE_CLIENT` injection token.

### AuthModule

Registers the `ApiKeyGuard` as a global `APP_GUARD`. All routes are protected by default — use the `@Public()` decorator to opt out. The guard:

1. Extracts the `x-api-key` header
2. Hashes it with SHA-256
3. Looks up the hash in the `api_keys` table
4. Resolves the user's profile and attaches `{ userId, username }` to the request
5. Verifies the `:username` URL param matches the key owner (403 if not)

### UsersModule

Provides `UsersService.findByUsername(username)` to resolve a username to a user ID. Used by `LinksController` and `FeedController` for public (unauthenticated) routes that need to scope data by user.

### ApiKeysModule

CRUD for per-user API keys. Raw keys are generated as `lb_` + 32 random bytes (hex), hashed with SHA-256 before storage. The raw key is only returned at creation time.

### LinksModule

The core feature module. `LinksService` handles CRUD operations scoped by `user_id`. `LinksController` maps HTTP verbs to service methods at `/:username/links`.

### FeedModule

`FeedService` generates RSS 2.0 XML per user using the `feed` npm package. The feed title is `{username}'s Linkblog`. `FeedController` serves it at `GET /:username/feed` with `Content-Type: application/rss+xml`.

### HealthModule

Simple `GET /health` returning `{ status: "ok" }`. Used by App Runner for health checks.

## Key Design Decisions

### Multi-user with per-user API keys

Each user has a `profiles` row and can create multiple named API keys. Keys are SHA-256 hashed before storage — the raw key is never persisted. URL paths are scoped by `:username` so each user's data is isolated.

### Supabase as the data layer

Instead of running a Postgres instance, the service uses Supabase's hosted Postgres via the `@supabase/supabase-js` client. This provides:

- Managed database with automatic backups
- REST-like query API from the JS client
- Migrations managed via the Supabase CLI
- Edge Functions for server-side processing (metadata extraction)

### RSS as the output format

The primary consumer of link data is [luther.io](https://luther.io), which fetches the RSS feed at build time. RSS 2.0 was chosen because it is universally supported and simple to generate.

### Automatic metadata extraction

A Postgres trigger fires on `INSERT` to the `links` table when the title is empty. It calls the `fetch-metadata` Supabase Edge Function via `pg_net`, which fetches `og:title`, `<title>`, and `og:description` from the URL and updates the link. See [Edge Functions](edge-functions) for details.

### No frontend (yet)

The API is meant to be called from the [browser extension](browser-extension), scripts, iOS shortcuts, or CLI tools. OpenAPI documentation is available at `/docs` to support future frontend development.

## Request Flow (Protected Endpoints)

1. Client sends HTTP request with `x-api-key` header to `/:username/links`
2. `ApiKeyGuard` extracts and SHA-256 hashes the API key
3. Guard looks up `key_hash` in `api_keys` table → gets `user_id`
4. Guard looks up `user_id` in `profiles` table → gets `username`
5. Guard verifies URL `:username` param matches the key owner (403 if mismatch)
6. Guard attaches `{ userId, username }` to `request.user`
7. Controller delegates to service with the authenticated user's ID
8. Service calls Supabase, checks `{ data, error }`, throws NestJS exceptions on failure
9. Controller returns the response

## Request Flow (Public Endpoints)

1. Client sends HTTP request to `/:username/links` (GET)
2. `ApiKeyGuard` sees `@Public()` decorator → skips auth
3. Controller calls `UsersService.findByUsername(username)` → gets user ID
4. Controller delegates to service with the resolved user ID
5. Service returns scoped data

## Directory Structure

```
linkblog/
├── browser-extension/         # Chrome/Safari MV3 extension (workspace package)
│   ├── src/
│   │   ├── background/        # Service worker (context menu, shortcuts)
│   │   ├── popup/             # Popup UI (HTML, CSS, TS)
│   │   └── types/             # Shared types + browser shim
│   ├── manifest.json
│   └── package.json
├── github_pages/              # Jekyll docs site (docs.linkblog.in)
├── postman/
│   ├── Linkblog API.postman_collection.json
│   ├── environment.json
│   └── specs/
├── src/
│   ├── main.ts                # Bootstrap, Swagger setup, global pipes/filters
│   ├── app.module.ts          # Root module
│   ├── app.controller.ts      # Root endpoint
│   ├── app.service.ts         # App-level service
│   ├── auth/
│   │   ├── auth.module.ts     # Registers global APP_GUARD
│   │   ├── api-key.guard.ts   # SHA-256 key lookup + username verification
│   │   ├── public.decorator.ts    # @Public() to opt out of auth
│   │   └── current-user.decorator.ts  # @CurrentUser() param decorator
│   ├── users/
│   │   ├── users.module.ts
│   │   └── users.service.ts   # findByUsername()
│   ├── api-keys/
│   │   ├── api-keys.module.ts
│   │   ├── api-keys.service.ts    # Key generation, hashing, CRUD
│   │   ├── api-keys.controller.ts
│   │   └── dto/
│   │       └── create-api-key.dto.ts
│   ├── links/
│   │   ├── links.module.ts
│   │   ├── links.service.ts   # CRUD scoped by user_id
│   │   ├── links.controller.ts
│   │   └── dto/
│   │       ├── create-link.dto.ts
│   │       └── update-link.dto.ts
│   ├── feed/
│   │   ├── feed.module.ts
│   │   ├── feed.service.ts    # RSS 2.0 generation per user
│   │   └── feed.controller.ts
│   ├── health/
│   │   ├── health.module.ts
│   │   └── health.controller.ts
│   ├── common/
│   │   └── filters/
│   │       └── http-exception.filter.ts
│   └── supabase/
│       └── supabase.module.ts # SUPABASE_CLIENT provider
├── supabase/
│   ├── config.toml
│   ├── migrations/            # SQL migrations (links, profiles, api_keys, triggers)
│   ├── seed.sql               # Sample data + app_config
│   └── functions/
│       └── fetch-metadata/    # Deno edge function for URL metadata
├── package.json
├── nest-cli.json
├── tsconfig.json
└── CLAUDE.md
```

---

Next: [Deployment](deployment)
