-- 1. Rename the column (username is confusing, since we're not using this to let people login)
alter table public.profiles
  rename column username to handle;

-- 2. Rename the index to match (old one still works but naming matters for clarity)
alter index profiles_username_idx
  rename to profiles_handle_idx;

-- 3. Trigger function: auto-provisions a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, handle)
  values (
    new.id,
    'user_' || left(replace(new.id::text, '-', ''), 8)
  );
  return new;
end;
$$;

-- 4. Trigger: fires after every INSERT on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- 5. RLS: users can update their own profile (e.g. change their handle)
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
