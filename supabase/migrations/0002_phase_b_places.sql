-- ============================================================================
-- Uvi — Phase B: Places, reviews & bookmarks
-- Adds PostGIS-backed places, a geo-search RPC, ratings, and bookmarks.
-- Apply with:  supabase db push
-- ============================================================================

create extension if not exists postgis;

-- ----------------------------------------------------------------------------
-- places
-- ----------------------------------------------------------------------------
create table if not exists public.places (
  id           uuid primary key default gen_random_uuid(),
  source_ref   text unique,                 -- e.g. 'seed:p01' → idempotent seeding
  name         text not null check (char_length(name) between 2 and 120),
  type         text not null check (type in
                 ('freecamp','park','caravan','track','fishing','dump','water','fuel')),
  state        text not null check (state in
                 ('NSW','VIC','QLD','SA','WA','TAS','NT','ACT')),
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  location     geography(Point,4326),        -- maintained from lat/lng by trigger
  description  text check (char_length(description) <= 2000),
  amenities    jsonb not null default '{}',
  status       text not null default 'pending'
                 check (status in ('pending','approved','rejected','archived')),
  created_by   uuid references public.profiles(id) on delete set null,
  rating_avg   numeric(2,1) not null default 0,
  rating_count integer      not null default 0,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);
create index if not exists places_location_gix on public.places using gist (location);
create index if not exists places_type_state_idx on public.places (type, state)
  where status = 'approved';

-- Keep location + updated_at in sync with lat/lng on write.
create or replace function public.places_set_location()
returns trigger language plpgsql as $$
begin
  new.location := ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists places_biu on public.places;
create trigger places_biu
  before insert or update on public.places
  for each row execute function public.places_set_location();

-- Non-staff submissions are forced to 'pending' and attributed to the caller.
-- When there is no auth context (migrations/seeds), values are left as provided,
-- so curated seed rows can be inserted as 'approved'.
create or replace function public.places_guard_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    new.status := 'pending';
    new.created_by := auth.uid();
  end if;
  return new;
end; $$;

drop trigger if exists places_guard on public.places;
create trigger places_guard
  before insert on public.places
  for each row execute function public.places_guard_status();

-- ----------------------------------------------------------------------------
-- reviews
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  place_id   uuid not null references public.places(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  body       text check (char_length(body) <= 2000),
  visited_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, user_id)            -- one review per user per place
);
create index if not exists reviews_place_idx on public.reviews (place_id);

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Denormalised rating rollup on places (security definer to bypass places RLS).
create or replace function public.refresh_place_rating(p uuid)
returns void language sql security definer set search_path = public as $$
  update public.places pl set
    rating_avg   = coalesce((select round(avg(rating)::numeric, 1)
                             from public.reviews where place_id = p), 0),
    rating_count = (select count(*) from public.reviews where place_id = p)
  where pl.id = p;
$$;

create or replace function public.reviews_after()
returns trigger language plpgsql as $$
begin
  perform public.refresh_place_rating(coalesce(new.place_id, old.place_id));
  return null;
end; $$;

drop trigger if exists reviews_aiud on public.reviews;
create trigger reviews_aiud
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_after();

-- ----------------------------------------------------------------------------
-- bookmarks
-- ----------------------------------------------------------------------------
create table if not exists public.bookmarks (
  user_id    uuid references public.profiles(id) on delete cascade,
  place_id   uuid references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

-- ----------------------------------------------------------------------------
-- Geo search RPC (powers the map + "near me")
-- ----------------------------------------------------------------------------
create or replace function public.nearby_places(
  lat double precision, lng double precision,
  radius_km double precision default 300,
  p_types text[] default null, p_state text default null
) returns table (
  id uuid, name text, type text, state text,
  lat double precision, lng double precision, description text,
  rating_avg numeric, rating_count integer, distance_km double precision
) language sql stable as $$
  select p.id, p.name, p.type, p.state, p.lat, p.lng, p.description,
         p.rating_avg, p.rating_count,
         round((ST_Distance(p.location,
                ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) / 1000)::numeric, 1)
           ::double precision as distance_km
  from public.places p
  where p.status = 'approved'
    and (p_types is null or p.type = any(p_types))
    and (p_state is null or p.state = p_state)
    and ST_DWithin(p.location,
                   ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
                   radius_km * 1000)
  order by p.location <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  limit 500;
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.places    enable row level security;
alter table public.reviews   enable row level security;
alter table public.bookmarks enable row level security;

-- places: public sees approved; authors see own; staff see all
drop policy if exists "read places" on public.places;
create policy "read places" on public.places for select using (
  status = 'approved' or created_by = auth.uid() or public.is_staff()
);
drop policy if exists "submit place" on public.places;
create policy "submit place" on public.places for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists "update own or staff place" on public.places;
create policy "update own or staff place" on public.places for update using (
  created_by = auth.uid() or public.is_staff()
) with check (created_by = auth.uid() or public.is_staff());

-- reviews: readable when the place is visible; authors manage their own
drop policy if exists "read reviews" on public.reviews;
create policy "read reviews" on public.reviews for select using (
  exists (select 1 from public.places p where p.id = reviews.place_id
          and (p.status = 'approved' or p.created_by = auth.uid() or public.is_staff()))
);
drop policy if exists "insert own review" on public.reviews;
create policy "insert own review" on public.reviews for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "update own review" on public.reviews;
create policy "update own review" on public.reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "delete own or staff review" on public.reviews;
create policy "delete own or staff review" on public.reviews for delete
  using (user_id = auth.uid() or public.is_staff());

-- bookmarks: strictly private to the owner
drop policy if exists "read own bookmarks" on public.bookmarks;
create policy "read own bookmarks" on public.bookmarks for select
  using (user_id = auth.uid());
drop policy if exists "insert own bookmark" on public.bookmarks;
create policy "insert own bookmark" on public.bookmarks for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "delete own bookmark" on public.bookmarks;
create policy "delete own bookmark" on public.bookmarks for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Grants (RLS still governs rows)
-- ----------------------------------------------------------------------------
grant select on public.places to anon, authenticated;
grant insert, update on public.places to authenticated;
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant select, insert, delete on public.bookmarks to authenticated;
grant execute on function public.nearby_places(double precision, double precision,
  double precision, text[], text) to anon, authenticated;
