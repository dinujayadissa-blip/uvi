-- ============================================================================
-- Uvi — Phase A: Foundation (accounts baseline)
-- Tables: profiles, email_subscribers
-- Plus: is_staff() helper, RLS policies, grants
-- Apply with the Supabase CLI:  supabase db push
-- ============================================================================

create extension if not exists citext;

-- ----------------------------------------------------------------------------
-- Staff helper (security definer so it can read profiles without RLS recursion)
-- ----------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

-- ----------------------------------------------------------------------------
-- profiles  (1:1 with auth.users; created during onboarding)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  username     citext unique not null
                 check ((username)::text ~ '^[a-z0-9_]{3,20}$'),
  display_name text   not null check (char_length(display_name) between 1 and 50),
  bio          text   check (char_length(bio) <= 500),
  avatar_url   text,
  home_state   text   check (home_state in
                 ('NSW','VIC','QLD','SA','WA','TAS','NT','ACT')),
  rig          text   check (char_length(rig) <= 120),
  role         text   not null default 'member'
                 check (role in ('member','moderator','admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public"
  on public.profiles for select
  using (true);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Staff may update any profile (e.g. to grant roles / moderate)
drop policy if exists "staff update any profile" on public.profiles;
create policy "staff update any profile"
  on public.profiles for update
  using (public.is_staff())
  with check (public.is_staff());

-- ----------------------------------------------------------------------------
-- email_subscribers  (the "notify me" launch list)
-- ----------------------------------------------------------------------------
create table if not exists public.email_subscribers (
  email      citext primary key check (position('@' in (email)::text) > 1),
  source     text,
  user_id    uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.email_subscribers enable row level security;

-- Anyone (incl. anonymous visitors) may subscribe...
drop policy if exists "anyone can subscribe" on public.email_subscribers;
create policy "anyone can subscribe"
  on public.email_subscribers for insert
  with check (true);

-- ...but only staff can read the list.
drop policy if exists "staff read subscribers" on public.email_subscribers;
create policy "staff read subscribers"
  on public.email_subscribers for select
  using (public.is_staff());

-- ----------------------------------------------------------------------------
-- Grants (RLS still governs row access; these grant table-level privileges)
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

grant insert on public.email_subscribers to anon, authenticated;
grant select on public.email_subscribers to authenticated;  -- restricted by RLS
