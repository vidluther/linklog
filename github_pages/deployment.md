---
layout: single
title: Deployment
toc: true
---

Linkblog is designed to run on **AWS App Runner** via Docker. This page covers building the image, configuring the environment, and deploying.

## Docker

### Dockerfile (planned)

A multi-stage build keeps the production image small:

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

### .dockerignore

```
node_modules
.git
.env
dist
coverage
github_pages
browser-extension
supabase/.temp
```

### Build and Run Locally

```bash
docker build -t linkblog .
docker run -p 3000:3000 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  -e API_URL=https://api.linkblog.in \
  linkblog
```

## AWS App Runner

### Environment Variables

Configure these in the App Runner service settings:

| Variable                    | Description                        |
| --------------------------- | ---------------------------------- |
| `SUPABASE_URL`              | Supabase project URL               |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key          |
| `API_URL`                   | Base URL for feed links            |
| `PORT`                      | App Runner sets this automatically |

### Health Check

App Runner uses `GET /health` to determine if the service is healthy. The endpoint returns `200 OK` with no authentication required.

Configure the health check in App Runner:

- **Path:** `/health`
- **Protocol:** HTTP
- **Interval:** 10 seconds
- **Timeout:** 5 seconds
- **Healthy threshold:** 1
- **Unhealthy threshold:** 3

### Deployment Steps

1. **Push image to ECR** (or connect App Runner to your GitHub repo for source-based deploys)
2. **Create App Runner service** with the container image
3. **Set environment variables** in the service configuration
4. **Configure health check** to use `/health`
5. App Runner assigns a public URL — use that or configure a custom domain

### Custom Domain

To use a custom domain with App Runner:

1. Go to the App Runner service in the AWS console
2. Under **Custom domains**, add your domain
3. Create the DNS records (CNAME) as instructed
4. Wait for certificate validation

The production API is at `api.linkblog.in`.

## CI/CD

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on PRs to `main`:

1. Install dependencies
2. Lint (`oxlint`)
3. Format check (`oxfmt --check`)
4. Build
5. Run tests
6. Browser extension lint, typecheck, and build

Branch protection on `main` requires the `ci` status check to pass before merge.

---

Next: [Implementation Plan](implementation-plan)
