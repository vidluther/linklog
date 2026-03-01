---
layout: single
title: Getting Started
toc: true
---

## Prerequisites

- **Node.js** 22+ and **pnpm**
- A [Supabase](https://supabase.com/) project (free tier works)
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (for migrations and local dev)

## Clone and Install

```bash
git clone https://github.com/vidluther/linkblog.git
cd linkblog
pnpm install
```

## Environment Variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
API_URL=https://api.linkblog.in
PORT=3000
```

| Variable                    | Description                                          |
| --------------------------- | ---------------------------------------------------- |
| `SUPABASE_URL`              | Your Supabase project URL                            |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS)             |
| `API_URL`                   | Base URL for feed links (defaults to production URL) |
| `PORT`                      | Server port (defaults to `3000`)                     |

## Database Setup

The Supabase migrations create the `links`, `profiles`, `api_keys`, and `app_config` tables automatically.

```bash
# Link to your Supabase project
pnpx supabase link --project-ref your-project-ref

# Run migrations
pnpx supabase db push
```

To seed the database with sample data:

```bash
pnpx supabase db reset
```

This runs `supabase/seed.sql` which inserts example data and configures the `app_config` table.

## Create a User Profile and API Key

Before testing write endpoints, you need a user profile and API key. Insert a profile manually in the Supabase dashboard or via SQL:

```sql
INSERT INTO profiles (id, username) VALUES ('your-auth-user-id', 'alice');
```

Then create an API key via the API once the server is running (you'll need to insert an initial key hash manually, or use the Supabase dashboard to bootstrap).

## Run Locally

```bash
# Development (with hot reload)
pnpm start:dev

# Production build
pnpm build
pnpm start:prod
```

The API will be available at `http://localhost:3000`. Interactive API docs are at `http://localhost:3000/api-docs`.

## Run Tests

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov
```

## Lint and Format

```bash
# Lint
pnpm lint

# Lint with auto-fix
pnpm lint:fix

# Format check
pnpm fmt:check

# Format
pnpm fmt
```

## Verify It Works

Once the server is running:

```bash
# Health check
curl http://localhost:3000/health

# List links for a user (public)
curl http://localhost:3000/alice/links

# RSS feed for a user (public)
curl http://localhost:3000/alice/feed
```

### Using Postman

A Postman collection and environment are included in `postman/`:

1. Import `postman/Linkblog API.postman_collection.json` and `postman/environment.json` into Postman
2. Select the **Linkblog - Local** environment
3. Set the `apiKey` variable to your API key value
4. Run individual requests or use the **Collection Runner** on the "CRUD Workflow" folder for a full end-to-end lifecycle test

The collection auto-captures `linkId` from responses, so create/list → get → update → delete flows work without manual copy-paste.

---

Next: [API Reference](api)
