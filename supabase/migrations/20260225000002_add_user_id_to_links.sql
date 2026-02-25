-- Migration: add user_id to links table
-- Issue: https://github.com/vidluther/linkblog/issues/55
--
-- Associates each link with an owner (auth.users).
-- Column is nullable initially to preserve existing rows.
--
-- ONE-TIME DATA MIGRATION (run manually after creating the owner's account):
--
--   UPDATE public.links
--   SET user_id = '<your-supabase-auth-user-uuid>'
--   WHERE user_id IS NULL;
--
--   ALTER TABLE public.links
--   ALTER COLUMN user_id SET NOT NULL;
--

alter table public.links
  add column user_id uuid references auth.users (id) on delete cascade;

-- Index for efficient per-user queries
create index links_user_id_idx on public.links (user_id);

-- RLS: enable and define policies
alter table public.links enable row level security;

-- Public SELECT: anyone can read links.
-- The application layer (LinksService) always filters by user_id — this policy
-- is permissive to support public /:username/links endpoints.
create policy "Links are publicly readable"
  on public.links
  for select
  using (true);

-- Write policies: defense-in-depth for direct DB access.
-- The NestJS backend uses the service role key and bypasses RLS entirely.
create policy "Users can insert their own links"
  on public.links
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own links"
  on public.links
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own links"
  on public.links
  for delete
  using (auth.uid() = user_id);
