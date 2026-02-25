-- Migration: create api_keys table
-- Issue: https://github.com/vidluther/linkblog/issues/56
--
-- Per-user API keys stored as SHA-256 hashes.
-- Raw keys are never persisted — only shown to the user once at creation time.
-- Key format: lb_<64 hex chars> (67 chars total)

create table public.api_keys (
  id           uuid        not null default gen_random_uuid() primary key,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  name         text,
  key_hash     text        not null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

-- Unique index on key_hash for O(1) auth lookups
create unique index api_keys_key_hash_idx on public.api_keys (key_hash);

-- Index for listing a user's keys
create index api_keys_user_id_idx on public.api_keys (user_id);

-- RLS: enable and scope reads/writes to the owning user
alter table public.api_keys enable row level security;

-- Defense-in-depth: backend uses service role key and bypasses RLS,
-- but these policies protect against direct DB access.
create policy "Users can manage their own API keys"
  on public.api_keys
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
