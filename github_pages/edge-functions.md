---
layout: single
title: Edge Functions
permalink: /edge-functions/
toc: true
---

Linkblog uses a Supabase Edge Function to automatically enrich links with metadata fetched from their URLs.

## Overview

The `fetch-metadata` function is a Deno Edge Function that:

1. Queries the `links` table for entries with missing or empty titles
2. Fetches each URL and extracts metadata from the HTML
3. Updates the link with the extracted title and description

## How It's Triggered

A PostgreSQL `AFTER INSERT` trigger on the `links` table fires automatically when a new link is inserted with a missing title:

```sql
CREATE TRIGGER on_link_insert_fetch_metadata
  AFTER INSERT ON public.links
  FOR EACH ROW
  WHEN (NEW.title IS NULL OR NEW.title = '')
  EXECUTE FUNCTION public.notify_fetch_metadata();
```

The `notify_fetch_metadata()` function uses `pg_net` to make a fire-and-forget HTTP POST to the edge function with `?link_id={id}`.

This means when you `POST /:username/links` with just a URL (no title), the metadata is fetched and populated automatically within a few seconds.

## Query Parameters

The function can also be called directly:

| Parameter | Default | Description                    |
| --------- | ------- | ------------------------------ |
| `limit`   | `20`    | Max number of links to process |
| `link_id` | —       | Process a single link by ID    |

Without `link_id`, the function processes up to `limit` links that have null or empty titles.

## Metadata Extraction

The function fetches each URL and extracts metadata with the following priority:

**Title:**

1. `og:title` meta tag
2. `<title>` element
3. URL hostname (fallback)

**Description:**

1. `og:description` meta tag
2. `<meta name="description">` tag
3. `null` (no fallback)

### Safety Limits

- **URL validation:** Blocks `localhost`, private IPs (`10.x`, `172.16-31.x`, `192.168.x`), and link-local addresses (`169.254.x`)
- **Response size:** Max 5 MB
- **Timeout:** 10 seconds per URL
- **Title length:** Max 500 characters
- **Description length:** Max 1,000 characters
- **Content type:** Only `text/html` and `application/xhtml` are processed

## Response Format

```json
{
  "processed": 3,
  "updated": 2,
  "errors": [
    {
      "id": 42,
      "url": "https://example.com/broken",
      "error": "HTTP 404 Not Found"
    }
  ],
  "details": [
    {
      "id": 40,
      "url": "https://example.com/article",
      "title": "Great Article",
      "summary": "An article about interesting things"
    },
    {
      "id": 41,
      "url": "https://example.com/post",
      "title": "Blog Post",
      "summary": null
    }
  ]
}
```

## Local Development

Start the function locally with the Supabase CLI:

```bash
pnpx supabase functions serve fetch-metadata --env-file supabase/.env.local
```

Create a `supabase/.env.local` with:

```env
SUPABASE_URL=http://127.0.0.1:54321
SB_PUBLISHABLE_KEY=your-local-service-role-key
```

> **Important:** When `pg_net` triggers call the edge function from inside the Postgres Docker container, they use the internal Docker network URL `http://kong:8000` — not `http://127.0.0.1:54321`. The `app_config` table's `supabase_url` value controls which URL the trigger uses.

Test manually:

```bash
# Process all links with missing titles
curl http://localhost:54321/functions/v1/fetch-metadata

# Process a specific link
curl http://localhost:54321/functions/v1/fetch-metadata?link_id=42
```

## Configuration

### `app_config` Table

The trigger function reads the Supabase URL from the `app_config` table:

```sql
INSERT INTO app_config (key, value) VALUES
  ('supabase_url', 'http://127.0.0.1:54321')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

This is seeded via `supabase/seed.sql`. For production, set the value to your Supabase project URL (e.g., `https://your-ref.supabase.co`).

### `config.toml`

JWT verification is disabled for this function since it uses the trigger's internal auth:

```toml
[functions.fetch-metadata]
verify_jwt = false
```

## Deployment

Deploy the function and its database migrations:

```bash
# Deploy the edge function
pnpx supabase functions deploy fetch-metadata --linked

# Push database migrations (trigger + app_config table)
pnpx supabase db push --linked

# Set secrets if needed
pnpx supabase secrets set SB_PUBLISHABLE_KEY=your-service-role-key --linked
```

## Project Structure

```
supabase/functions/fetch-metadata/
├── index.ts               # Main handler (query links, process, update)
├── metadata-extractor.ts  # URL fetching, HTML parsing, metadata extraction
├── deno.json              # Deno dependencies (linkedom, supabase-js)
└── README.md
```
