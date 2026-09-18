-- ============================================================================
-- Uvi — Phase C: Trips, waypoints & media (photos)
-- Adds trip reports/routes, their waypoints, a media table, and Storage
-- buckets + policies for photos and avatars.
-- Apply with:  supabase db push
-- ============================================================================

-- ----------------------------------------------------------------------------
-- trips
-- ----------------------------------------------------------------------------
create table if not exists public.trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 3 and 140),
  slug        text not null,
  summary     text check (char_length(summary) <= 300),
  body        text check (char_length(body) <= 20000),
  distance_km integer check (distance_km is null or distance_km >= 0),
  days        integer check (days is null or days >= 0),
  cover_media uuid,                       -- FK added after media exists
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, slug)
);
create index if not exists trips_public_idx on public.trips (created_at desc) where is_public;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

create table if not exists public.trip_waypoints (
  id       uuid primary key default gen_random_uuid(),
  trip_id  uuid not null references public.trips(id) on delete cascade,
  seq      integer not null default 0,
  name     text,
  lat      double precision check (lat is null or lat between -90 and 90),
  lng      double precision check (lng is null or lng between -180 and 180),
  note     text
);
create index if not exists trip_waypoints_trip_idx on public.trip_waypoints (trip_id, seq);

-- ----------------------------------------------------------------------------
-- media (photos attachable to trips / places)
-- ----------------------------------------------------------------------------
create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,             -- path within the 'photos' bucket
  width        integer,
  height       integer,
  caption      text check (char_length(caption) <= 300),
  place_id     uuid references public.places(id) on delete set null,
  trip_id      uuid references public.trips(id) on delete set null,
  status       text not null default 'active' check (status in ('active', 'removed')),
  created_at   timestamptz not null default now()
);
create index if not exists media_trip_idx on public.media (trip_id);

alter table public.trips
  drop constraint if exists trips_cover_media_fk,
  add constraint trips_cover_media_fk
    foreign key (cover_media) references public.media(id) on delete set null;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.trips          enable row level security;
alter table public.trip_waypoints enable row level security;
alter table public.media          enable row level security;

-- trips: public reads published trips; authors manage their own
drop policy if exists "read public trips" on public.trips;
create policy "read public trips" on public.trips for select using (
  is_public or user_id = auth.uid() or public.is_staff()
);
drop policy if exists "insert own trip" on public.trips;
create policy "insert own trip" on public.trips for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "update own trip" on public.trips;
create policy "update own trip" on public.trips for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "delete own or staff trip" on public.trips;
create policy "delete own or staff trip" on public.trips for delete
  using (user_id = auth.uid() or public.is_staff());

-- waypoints: visible with their trip; managed by the trip owner
drop policy if exists "read waypoints" on public.trip_waypoints;
create policy "read waypoints" on public.trip_waypoints for select using (
  exists (select 1 from public.trips t where t.id = trip_waypoints.trip_id
          and (t.is_public or t.user_id = auth.uid() or public.is_staff()))
);
drop policy if exists "write own waypoints" on public.trip_waypoints;
create policy "write own waypoints" on public.trip_waypoints for all using (
  exists (select 1 from public.trips t where t.id = trip_waypoints.trip_id and t.user_id = auth.uid())
) with check (
  exists (select 1 from public.trips t where t.id = trip_waypoints.trip_id and t.user_id = auth.uid())
);

-- media: readable when active and attached to visible content; owner manages
drop policy if exists "read media" on public.media;
create policy "read media" on public.media for select using (
  status = 'active' and (
    owner_id = auth.uid()
    or place_id is not null
    or exists (select 1 from public.trips t where t.id = media.trip_id
               and (t.is_public or t.user_id = auth.uid()))
    or trip_id is null   -- freshly uploaded, not yet attached (owner still sees via first clause)
  )
);
drop policy if exists "insert own media" on public.media;
create policy "insert own media" on public.media for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists "update own media" on public.media;
create policy "update own media" on public.media for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "delete own media" on public.media;
create policy "delete own media" on public.media for delete using (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
grant select on public.trips to anon, authenticated;
grant insert, update, delete on public.trips to authenticated;
grant select on public.trip_waypoints to anon, authenticated;
grant insert, update, delete on public.trip_waypoints to authenticated;
grant select on public.media to anon, authenticated;
grant insert, update, delete on public.media to authenticated;

-- ----------------------------------------------------------------------------
-- Storage buckets + policies (photos, avatars) — public-read, owner-write
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('photos', 'photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true) on conflict (id) do nothing;

drop policy if exists "public read media files" on storage.objects;
create policy "public read media files" on storage.objects for select
  using (bucket_id in ('photos', 'avatars'));

-- Uploads must land in a folder named after the uploader's user id.
drop policy if exists "auth upload own media files" on storage.objects;
create policy "auth upload own media files" on storage.objects for insert to authenticated
  with check (bucket_id in ('photos', 'avatars')
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "owner update media files" on storage.objects;
create policy "owner update media files" on storage.objects for update to authenticated
  using (bucket_id in ('photos', 'avatars') and owner = auth.uid());

drop policy if exists "owner delete media files" on storage.objects;
create policy "owner delete media files" on storage.objects for delete to authenticated
  using (bucket_id in ('photos', 'avatars') and owner = auth.uid());
