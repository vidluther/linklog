# Linkblog Service

This is my personal linkblog app.

### What is this?

This is a service that allows me to do the following:

1. I want to be able to bookmark articles I find interesting with a summary or note of why I found it interesting.
1. I want to be able to look through those bookmarks based on my summary and notes.
1. I want to populate the [blogroll](https://luther.io/blogroll) section of my site with those articles. Because sharing is caring.

### Why does this exist?

[Here's my blog post explaining why this exists](https://luther.io/articles/linkblog/)

### Stack

My goal is to learn TypeScript, and NestJS along with Supabase. So..

- TypeScript
- NestJS
- Supabase
- AWS App Runner

### Local Development

To run the service locally, you'll need to have Docker installed. Follow these steps:

#### Start Supabase Locally

```
pnpx supabase start
```

Copy the .env.example to .env and update the values from the command above.

#### Start NestJS API

```
pnpm start:dev
```

#### Go To Postman

### Build

```bash
# API (NestJS)
pnpm build

# Browser extension (lint + typecheck + compile + copy assets)
pnpm --filter linkblog-extension build

# Clean build the browser extension (wipe dist/ first)
pnpm --filter linkblog-extension clean && pnpm --filter linkblog-extension build
```

### Edge Functions

- **[fetch-metadata](supabase/functions/fetch-metadata/README.md)** — Deno function that auto-fetches OpenGraph metadata (title, summary) for bookmarked links. Runs on-demand or automatically via a database trigger on insert.

### Supabase Migrations

Link the CLI to your Supabase project (one-time):

```bash
pnpx supabase link --project-ref <your-project-ref>
```

Apply pending migrations to the remote database:

```bash
pnpx supabase db push
```

Reset the remote database (destructive — drops all tables, re-runs migrations + seed):

```bash
pnpx supabase db reset --linked
```
