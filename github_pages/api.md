---
layout: single
title: API Reference
permalink: /api/
toc: true
---

Base URL: `http://localhost:3000` (local) or `https://api.linkblog.in` (production).

> **Tip:** A ready-to-use Postman collection is available in `postman/Linkblog API.postman_collection.json` with pre-built requests, test scripts, and a CRUD workflow runner. See [Getting Started](getting-started#using-postman) for setup.

> **Interactive docs:** Visit [`/docs`](https://api.linkblog.in/docs) for the Swagger UI with all endpoints, schemas, and a "Try it out" feature.

## Authentication

Linkblog uses **per-user API keys** to protect write endpoints. Each user can create multiple named API keys via the [`/:handle/api-keys`](#api-key-management) endpoints.

Keys are passed as a request header:

```
x-api-key: lb_abc123...
```

When a request arrives:

1. The API hashes the key with SHA-256
2. Looks up the hash in the `api_keys` table to find the owning `user_id`
3. Resolves the user's `handle` from the `profiles` table
4. If the URL contains a `:handle` param, verifies the key owner matches — returns `403 Forbidden` if they don't

Read endpoints (`GET /:handle/links`, `GET /:handle/links/:id`), the RSS feed (`GET /:handle/feed`), and the health check (`GET /health`) are **public** — no API key required.

---

## Endpoints

### `GET /health`

Health check for load balancers and uptime monitors.

**Auth:** None

```bash
curl http://localhost:3000/health
```

**Response:** `200 OK`

```json
{ "status": "ok" }
```

---

### `POST /:handle/links`

Create a new link.

**Auth:** `x-api-key` header required

**Request body:**

```json
{
  "url": "https://example.com/article",
  "title": "Interesting Article",
  "summary": "A short note about why this is worth reading."
}
```

| Field     | Type   | Required | Description                   |
| --------- | ------ | -------- | ----------------------------- |
| `url`     | string | yes      | The URL being bookmarked      |
| `title`   | string | no       | Display title for the link    |
| `summary` | string | no       | Your notes or a brief summary |

> **Note:** If `title` is omitted, the [fetch-metadata edge function](edge-functions) will automatically populate it from the page's `<title>` or Open Graph tags.

**Example:**

```bash
curl -X POST http://localhost:3000/alice/links \
  -H "Content-Type: application/json" \
  -H "x-api-key: lb_your-api-key" \
  -d '{"url":"https://example.com","title":"Example","summary":"A test link"}'
```

**Response:** `201 Created`

```json
{
  "id": 1,
  "url": "https://example.com",
  "title": "Example",
  "summary": "A test link",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "created_at": "2026-02-08T05:24:36+00:00",
  "updated_at": "2026-02-08T05:24:36+00:00"
}
```

---

### `GET /:handle/links`

List all links for a user, sorted by newest first.

**Auth:** None

```bash
curl http://localhost:3000/alice/links
```

**Response:** `200 OK`

```json
[
  {
    "id": 2,
    "url": "https://example.com/newer",
    "title": "Newer Article",
    "summary": "...",
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2026-02-09T12:00:00+00:00",
    "updated_at": "2026-02-09T12:00:00+00:00"
  },
  {
    "id": 1,
    "url": "https://example.com/older",
    "title": "Older Article",
    "summary": "...",
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "created_at": "2026-02-08T05:24:36+00:00",
    "updated_at": "2026-02-08T05:24:36+00:00"
  }
]
```

---

### `GET /:handle/links/:id`

Get a single link by ID.

**Auth:** None

```bash
curl http://localhost:3000/alice/links/1
```

**Response:** `200 OK`

```json
{
  "id": 1,
  "url": "https://example.com",
  "title": "Example",
  "summary": "A test link",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "created_at": "2026-02-08T05:24:36+00:00",
  "updated_at": "2026-02-08T05:24:36+00:00"
}
```

**Error:** `404 Not Found` if the link does not exist.

---

### `PATCH /:handle/links/:id`

Update an existing link.

**Auth:** `x-api-key` header required

**Request body** (all fields optional):

```json
{
  "title": "Updated Title",
  "summary": "Updated notes"
}
```

| Field     | Type   | Required | Description           |
| --------- | ------ | -------- | --------------------- |
| `url`     | string | no       | Updated URL           |
| `title`   | string | no       | Updated title         |
| `summary` | string | no       | Updated summary/notes |

**Example:**

```bash
curl -X PATCH http://localhost:3000/alice/links/1 \
  -H "Content-Type: application/json" \
  -H "x-api-key: lb_your-api-key" \
  -d '{"title":"Better Title"}'
```

**Response:** `200 OK` with the updated link object.

**Error:** `404 Not Found` if the link does not exist.

---

### `DELETE /:handle/links/:id`

Delete a link.

**Auth:** `x-api-key` header required

```bash
curl -X DELETE http://localhost:3000/alice/links/1 \
  -H "x-api-key: lb_your-api-key"
```

**Response:** `200 OK`

**Error:** `404 Not Found` if the link does not exist.

---

### `GET /:handle/feed`

Public RSS 2.0 feed of all links for a user, newest first.

**Auth:** None

```bash
curl http://localhost:3000/alice/feed
```

**Response:** `200 OK` with `Content-Type: application/rss+xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>alice's Linkblog</title>
    <link>https://api.linkblog.in/alice/feed</link>
    <description>alice's Linkblog Feed</description>
    <item>
      <title>Interesting Article</title>
      <link>https://example.com/article</link>
      <description>A short note about why this is worth reading.</description>
      <pubDate>Sat, 08 Feb 2026 05:24:36 GMT</pubDate>
      <guid>https://example.com/article</guid>
    </item>
  </channel>
</rss>
```

---

## API Key Management

### `GET /:handle/api-keys`

List all API keys for the authenticated user. Returns metadata only (never the raw key).

**Auth:** `x-api-key` header required

```bash
curl http://localhost:3000/alice/api-keys \
  -H "x-api-key: lb_your-api-key"
```

**Response:** `200 OK`

```json
[
  {
    "id": "uuid-1234",
    "name": "CLI key",
    "created_at": "2026-02-08T05:24:36+00:00",
    "last_used_at": "2026-03-01T10:00:00+00:00"
  }
]
```

---

### `POST /:handle/api-keys`

Create a new API key. The raw key is returned **only once** in the response — store it securely.

**Auth:** `x-api-key` header required

**Request body:**

```json
{
  "name": "Browser Extension"
}
```

| Field  | Type   | Required | Description             |
| ------ | ------ | -------- | ----------------------- |
| `name` | string | yes      | A label for the API key |

**Example:**

```bash
curl -X POST http://localhost:3000/alice/api-keys \
  -H "Content-Type: application/json" \
  -H "x-api-key: lb_your-api-key" \
  -d '{"name":"Browser Extension"}'
```

**Response:** `201 Created`

```json
{
  "id": "uuid-5678",
  "name": "Browser Extension",
  "key": "lb_abc123def456..."
}
```

> **Important:** The `key` field is only returned at creation time. There is no way to retrieve it later.

---

### `DELETE /:handle/api-keys/:id`

Delete an API key by ID.

**Auth:** `x-api-key` header required

```bash
curl -X DELETE http://localhost:3000/alice/api-keys/uuid-5678 \
  -H "x-api-key: lb_your-api-key"
```

**Response:** `200 OK`

**Error:** `404 Not Found` if the key does not exist.

---

## Error Responses

All errors follow a consistent format:

```json
{
  "statusCode": 401,
  "message": "Missing x-api-key header"
}
```

| Status Code | Meaning                                           |
| ----------- | ------------------------------------------------- |
| `400`       | Bad Request (invalid body / validation error)     |
| `401`       | Unauthorized (missing or invalid API key)         |
| `403`       | Forbidden (API key does not match requested user) |
| `404`       | Not Found                                         |
| `500`       | Internal Server Error                             |

---

## Data Model

### `links` table

| Column       | Type         | Description                      |
| ------------ | ------------ | -------------------------------- |
| `id`         | integer (PK) | Auto-assigned identifier         |
| `url`        | text         | The bookmarked URL               |
| `title`      | text         | Display title                    |
| `summary`    | text         | Notes or brief description       |
| `user_id`    | uuid (FK)    | Owner — references `profiles.id` |
| `created_at` | timestamptz  | When the link was saved          |
| `updated_at` | timestamptz  | When the link was last changed   |

### `profiles` table

| Column   | Type      | Description                     |
| -------- | --------- | ------------------------------- |
| `id`     | uuid (PK) | User ID (matches Supabase auth) |
| `handle` | text      | Unique handle used in URL paths |

### `api_keys` table

| Column         | Type        | Description                         |
| -------------- | ----------- | ----------------------------------- |
| `id`           | uuid (PK)   | Key identifier                      |
| `user_id`      | uuid (FK)   | Owner — references `profiles.id`    |
| `name`         | text        | Human-readable label                |
| `key_hash`     | text        | SHA-256 hash of the raw API key     |
| `created_at`   | timestamptz | When the key was created            |
| `last_used_at` | timestamptz | Last time the key was used for auth |

---

Next: [Architecture](architecture)
