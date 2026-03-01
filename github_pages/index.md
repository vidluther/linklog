---
layout: home
title: Linkblog
permalink: /
toc: false
---

A personal bookmarking service built with **NestJS**, **TypeScript**, and **Supabase**.

Example at: [Vid Luther](https://luther.io/)

## What It Does

- **Save links** with a title and summary via a simple REST API
- **Publish an RSS feed** per user that external sites can consume at build time
- **Multi-user API keys** — each user gets their own scoped API keys with SHA-256 hashing
- **Auto-enrich links** — a Supabase Edge Function fetches missing titles and descriptions from URLs
- **Browser extension** — save links from Chrome or Safari with one click

## Quick Links

- [Getting Started](getting-started) -- Set up the project locally
- [API Reference](api) -- Full endpoint documentation
- [Architecture](architecture) -- How the pieces fit together
- [Deployment](deployment) -- Ship to AWS App Runner
- [Browser Extension](browser-extension) -- Chrome/Safari extension docs
- [Edge Functions](edge-functions) -- Supabase Edge Function docs
- [API Docs (Swagger)](https://api.linkblog.in/docs) -- Interactive API documentation

## Tech Stack

| Layer          | Technology                                                                   |
| -------------- | ---------------------------------------------------------------------------- |
| Runtime        | [Node.js](https://nodejs.org/) 22+ / TypeScript                              |
| Framework      | [NestJS](https://nestjs.com/) 11.x                                           |
| Database       | [Supabase](https://supabase.com/) (Postgres)                                 |
| Edge Functions | [Supabase Edge Functions](https://supabase.com/docs/guides/functions) (Deno) |
| Hosting        | AWS App Runner                                                               |
| Feed Format    | RSS 2.0                                                                      |
| Linting        | [oxlint](https://oxc.rs/) + [oxfmt](https://oxc.rs/)                         |
| API Docs       | [Swagger/OpenAPI](https://swagger.io/) via `@nestjs/swagger`                 |
| Extension      | Chrome/Safari MV3                                                            |

## Source Code

[vidluther/linkblog](https://github.com/vidluther/linkblog) on GitHub.
