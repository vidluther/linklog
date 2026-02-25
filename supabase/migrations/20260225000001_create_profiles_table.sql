-- Migration: create profiles table
-- Issue: https://github.com/vidluther/linkblog/issues/54
--
-- Stores the public-facing username for each Supabase Auth user.
-- profiles.id is a 1:1 FK to auth.users.id (standard Supabase pattern).

create table public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  username   text        not null,
  created_at timestamptz not null default now()
);

-- Enforce unique usernames
create unique index profiles_username_idx on public.profiles (username);

-- RLS: enable and allow public reads (username → user_id lookups on public endpoints)
alter table public.profiles enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles
  for select
  using (true);

-- Note: no INSERT/UPDATE policies — backend uses service role key (bypasses RLS).
-- Profiles are provisioned via admin tooling or Supabase Studio.
