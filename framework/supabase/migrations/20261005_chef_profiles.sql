-- Chef role registry: customers promoted to Chef by an admin.
-- Read by the app on login/session restore to grant Chef Studio access.

create table if not exists public.chef_profiles (
  uid          text primary key,
  email        text,
  display_name text,
  approved_at  timestamptz not null default now(),
  approved_by  text,
  bio          text,
  speciality   text
);

create index if not exists chef_profiles_email_idx on public.chef_profiles (lower(email));

alter table public.chef_profiles enable row level security;

drop policy if exists "chef_profiles readable" on public.chef_profiles;
create policy "chef_profiles readable" on public.chef_profiles
  for select using (true);

drop policy if exists "chef_profiles writable" on public.chef_profiles;
create policy "chef_profiles writable" on public.chef_profiles
  for all using (true) with check (true);

alter publication supabase_realtime add table public.chef_profiles;
