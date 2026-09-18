# Uvi — Backend Spec: Accounts & Community

Status: **Draft for review** · Last updated: 2026-09-18

This document specs the backend needed to turn Uvi from a static site into a
platform with **user accounts** and a **community** (reviews, photos, trip
routes/stories, groups, follows, notifications). It is a design, not an
implementation — it ends with a phased plan and the decisions we need to make
before writing code.

---

## 1. Goals & scope

**In scope**
- Accounts: sign-up / sign-in, profiles, password reset, OAuth, email verification.
- Contributed content: user-submitted **places** (camps, tracks, fuel, etc.),
  **reviews & ratings**, **photos**, **trip routes / travel stories**.
- Social graph: **follows**, **likes**, **comments**, **bookmarks/saves**.
- **Groups** (interest/region groups) with membership and discussions.
- **Notifications** (in-app + email) and a transactional email pipeline.
- **Moderation & safety** for user-generated content (UGC).
- **Geo search** powering the existing map ("near me", filter by type/state).
- Privacy/compliance: Australian Privacy Principles (APP) + GDPR/CCPA basics.

**Out of scope (for now)**
- Payments / monetisation (affiliate gear links, premium tiers) — noted where
  it touches the data model, but not built.
- Real-time chat / live location sharing.
- Native mobile apps (the API should not preclude them).
- Third-party live data (weather, fire bans, closures) — separate integration.

**Non-functional targets (early stage)**
- Small team / near-solo maintenance → prefer **managed services over custom infra**.
- SEO matters for UGC pages (trip reports, place pages) → server-rendered public pages.
- Keep the current static marketing pages fast; add dynamic features incrementally.

---

## 2. Recommended architecture

### 2.1 Primary recommendation: Supabase + progressive Next.js migration

**Backend platform: [Supabase](https://supabase.com)** — managed **Postgres**
with **PostGIS**, built-in **Auth**, **Storage**, **Row-Level Security (RLS)**,
auto-generated REST/GraphQL, Edge Functions, and Realtime.

Why it fits Uvi specifically:
- **PostGIS** gives first-class geo queries (`ST_DWithin`) for "near me" and
  bounding-box map loads — central to this product.
- **Relational** data (places → reviews → photos → users → groups) is a natural
  fit for Postgres, not a document store.
- **Auth + Storage + RLS** out of the box means most CRUD needs **no custom
  server code** — security lives in database policies, close to the data.
- Clear upgrade path: SQL migrations in the repo, standard Postgres underneath
  (portable if we ever leave Supabase).

**Frontend path (two stages):**
1. **Stage 1 (fastest MVP):** keep today's static site and add the
   **`@supabase/supabase-js`** client for auth + data. Login/signup modal,
   reviews, bookmarks, the dynamic map — all client-side against Supabase with
   RLS. Minimal rewrite; ships quickly.
2. **Stage 2 (when UGC SEO matters):** migrate the site into **Next.js on
   Vercel** so public UGC pages (a place, a trip report, a profile) are
   **server-rendered** and indexable, with Next API routes / Server Actions for
   any server-only logic. The Supabase schema and policies carry over unchanged.

The `build.js` + JSON pipeline stays useful: seed the `places` table from
`data/places.json`, and optionally export approved public data back to static
JSON at build time for cache/no-JS fallback.

### 2.2 Alternative (self-assembled) stack

If we want to avoid Supabase lock-in from day one:

| Concern | Self-assembled choice |
|---|---|
| Runtime | Next.js on Vercel (API routes / Server Actions) |
| Database | Neon or Vercel Postgres (Postgres + PostGIS) |
| Auth | Auth.js (NextAuth) with email + OAuth providers |
| File storage | Cloudflare R2 or AWS S3 + CloudFront |
| Images | Cloudflare Images / imgix for transforms |
| Email | Resend or Postmark |
| Rate limit / cache | Upstash Redis |

Trade-off: more moving parts and more glue code (auth, storage rules, RLS
equivalent enforced in app code) for less platform lock-in. **Recommendation:
start with Supabase; the schema is standard Postgres, so migrating out later is
feasible.** The rest of this spec assumes the Supabase model but the data model
and API surface apply to either.

### 2.3 Component diagram

```
              ┌──────────────────────────────────────────────┐
  Browser ──► │  Frontend (static now → Next.js on Vercel)    │
              │   - supabase-js client (auth, queries)        │
              │   - map (Leaflet), forms, feeds               │
              └───────────────┬───────────────┬──────────────┘
                              │ HTTPS          │ signed uploads
                              ▼                ▼
        ┌─────────────────────────────┐  ┌───────────────────┐
        │  Supabase                    │  │  Supabase Storage │
        │  - Postgres + PostGIS        │  │  (photos, avatars)│
        │  - Auth (JWT)                │  └───────────────────┘
        │  - RLS policies              │
        │  - RPC (SQL functions)       │  ┌───────────────────┐
        │  - Edge Functions            │─►│ Email (Resend/SES)│
        │  - Realtime (optional)       │  └───────────────────┘
        └─────────────────────────────┘
                              ▲
                              │ Turnstile verify, webhooks
              ┌───────────────┴──────────────┐
              │  Abuse control (CAPTCHA),     │
              │  moderation, cron/digests     │
              └──────────────────────────────┘
```

---

## 3. Data model

Postgres. `auth.users` is Supabase-managed; everything else lives in `public`.
Geo columns use `geography(Point,4326)`. Timestamps are `timestamptz default now()`.

### 3.1 Core tables (DDL sketch)

```sql
-- Public profile, 1:1 with auth.users
create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      citext unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name  text not null,
  bio           text,
  avatar_url    text,
  home_state    text,             -- NSW, VIC, ...
  rig           text,             -- vehicle / setup, freeform
  role          text not null default 'member',  -- member | moderator | admin
  created_at    timestamptz not null default now()
);

-- Places (finder locations); may be curated or user-contributed
create table places (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null,     -- freecamp|park|caravan|track|fishing|dump|water|fuel
  state         text not null,
  location      geography(Point,4326) not null,
  description   text,
  amenities     jsonb not null default '{}',   -- {toilets:true, dog_friendly:true,...}
  status        text not null default 'pending', -- pending|approved|rejected|archived
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  rating_avg    numeric(2,1) not null default 0,   -- denormalised, maintained by trigger
  rating_count  integer     not null default 0
);
create index places_location_gix on places using gist (location);
create index places_type_state_idx on places (type, state) where status = 'approved';

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references places(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  body        text,
  visited_on  date,
  created_at  timestamptz not null default now(),
  unique (place_id, user_id)   -- one review per user per place
);

-- Media (photos) attachable to places, reviews, trips
create table media (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references profiles(id) on delete cascade,
  storage_path text not null,          -- path in Storage bucket
  width        integer,
  height       integer,
  caption      text,
  place_id     uuid references places(id) on delete set null,
  trip_id      uuid,                    -- fk added after trips table
  status       text not null default 'active',  -- active|removed
  created_at   timestamptz not null default now()
);

-- Trip routes / travel stories
create table trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  slug        text not null,
  summary     text,
  body        text,                    -- markdown
  distance_km integer,
  days        integer,
  cover_media uuid references media(id) on delete set null,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (user_id, slug)
);
alter table media add constraint media_trip_fk
  foreign key (trip_id) references trips(id) on delete set null;

create table trip_waypoints (
  id       uuid primary key default gen_random_uuid(),
  trip_id  uuid not null references trips(id) on delete cascade,
  seq      integer not null,
  name     text,
  location geography(Point,4326),
  note     text
);
```

### 3.2 Social & groups

```sql
create table follows (
  follower_id uuid references profiles(id) on delete cascade,
  followee_id uuid references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

-- Generic comments & likes via (target_type, target_id)
create table comments (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null,   -- 'trip' | 'place' | 'group_post'
  target_id   uuid not null,
  user_id     uuid not null references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index comments_target_idx on comments (target_type, target_id);

create table likes (
  user_id     uuid references profiles(id) on delete cascade,
  target_type text not null,
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

create table bookmarks (
  user_id  uuid references profiles(id) on delete cascade,
  place_id uuid references places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table groups (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text,
  cover_media uuid references media(id) on delete set null,
  visibility  text not null default 'public',  -- public | private
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table group_members (
  group_id  uuid references groups(id) on delete cascade,
  user_id   uuid references profiles(id) on delete cascade,
  role      text not null default 'member',  -- owner | admin | member
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table group_posts (
  id        uuid primary key default gen_random_uuid(),
  group_id  uuid not null references groups(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  title     text,
  body      text not null,
  created_at timestamptz not null default now()
);
```

### 3.3 Platform tables

```sql
-- Replaces the current front-end "notify me" list
create table email_subscribers (
  email      citext primary key,
  source     text,
  user_id    uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null,     -- follow|comment|like|review|group_invite|...
  payload    jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create table reports (        -- moderation queue
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles(id) on delete set null,
  target_type text not null,
  target_id   uuid not null,
  reason      text not null,
  status      text not null default 'open',  -- open|actioned|dismissed
  created_at  timestamptz not null default now()
);
```

---

## 4. Authentication & authorization

**Authentication (Supabase Auth):**
- Email + password with **mandatory email verification**.
- **OAuth**: Google first (broadest AU coverage), Apple and Facebook next.
- **Magic links** as a passwordless option.
- Password reset flow, session refresh via JWT; tokens stored per Supabase SDK
  guidance (httpOnly cookies in the Next.js stage for SSR).
- A DB trigger creates a `profiles` row on first sign-in (username chosen in an
  onboarding step; enforce uniqueness).

**Authorization (Row-Level Security):** RLS is **on for every table**. Patterns:
- Public read of **approved/public** content; owners read their own drafts.
- Insert/update/delete gated to the owning `user_id = auth.uid()`.
- Moderator/admin override via the `role` column (checked in policy).

Example policies:

```sql
alter table reviews enable row level security;

create policy "read approved reviews" on reviews
  for select using (
    exists (select 1 from places p
            where p.id = reviews.place_id and p.status = 'approved')
  );

create policy "author writes own review" on reviews
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Places: public sees approved; author sees own; staff see all
create policy "read places" on places
  for select using (
    status = 'approved'
    or created_by = auth.uid()
    or exists (select 1 from profiles me
               where me.id = auth.uid() and me.role in ('moderator','admin'))
  );
```

A helper `is_staff()` SQL function keeps policies terse and consistent.

---

## 5. API surface

With Supabase, most reads/writes go through **PostGREST + the client SDK under
RLS** — little bespoke API code. Custom logic uses **RPC (SQL functions)** or
**Edge Functions**. Logical surface:

**Auth** — signUp, signIn, signInWithOAuth, signOut, resetPassword, verifyOtp.

**Profiles** — `GET /profiles/:username`, `PATCH /profiles/me`, avatar upload.

**Places & geo**
- `rpc nearby_places(lat, lng, radius_km, types[], state)` → geo search for the map.
- `GET /places?type=&state=` (approved), `GET /places/:id`, `POST /places` (→ pending).
- `POST /reviews`, `PATCH/DELETE /reviews/:id`, `GET /places/:id/reviews`.
- `POST /bookmarks`, `DELETE /bookmarks/:place_id`, `GET /me/bookmarks`.

**Trips** — CRUD on `/trips`, `GET /trips?public=true` (feed), `GET /:username/:slug`,
waypoints nested; `GET /me/feed` (from follows).

**Media** — request a **signed upload URL**, upload to Storage, then `POST /media`
to record metadata and attach to a place/review/trip.

**Social** — follow/unfollow, like/unlike, comments CRUD, notifications
list + mark-read.

**Groups** — CRUD, join/leave, members, group posts + comments.

**Moderation (staff)** — reports queue, approve/reject place, remove content,
ban/mute user. Behind `is_staff()`.

Example geo RPC:

```sql
create or replace function nearby_places(
  lat double precision, lng double precision,
  radius_km double precision default 100,
  p_types text[] default null, p_state text default null
) returns setof places language sql stable as $$
  select * from places
  where status = 'approved'
    and (p_types is null or type = any(p_types))
    and (p_state is null or state = p_state)
    and ST_DWithin(location,
                   ST_MakePoint(lng, lat)::geography,
                   radius_km * 1000)
  order by location <-> ST_MakePoint(lng, lat)::geography
  limit 500;
$$;
```

---

## 6. Media & photo handling

- **Storage**: Supabase Storage buckets — `avatars` (public), `photos`
  (public-read after moderation), `uploads-tmp` (private, pre-approval).
- **Upload flow**: client resizes/compresses (e.g. to ≤2560px) → requests signed
  URL → uploads → records `media` row. Enforce content-type allowlist
  (jpg/png/webp) and max size (e.g. 10 MB) in a Storage policy + edge check.
- **Thumbnails**: use Supabase image transformations (or Cloudflare Images at
  scale) — never ship full-res to feeds.
- **Privacy**: **strip GPS EXIF** by default (re-encode server-side or client
  canvas). Optionally offer "use photo location to tag the place" with explicit
  consent.
- **Cost note**: image **egress** is the scaling cost. If it grows, move the
  `photos` bucket behind a CDN, or to Cloudflare R2 + Images (cheap egress).

---

## 7. Community features — behaviour notes

- **Reviews/ratings**: one per user per place; `places.rating_avg/rating_count`
  maintained by an `after insert/update/delete` trigger. Show "visited on".
- **Trip routes**: waypoints render as a Leaflet polyline; a public trip gets an
  SSR page (`/@user/trip-slug`) for SEO and sharing.
- **Feed**: `me/feed` = recent public trips/photos from followed users; a global
  "Discover" feed for logged-out visitors (approved, popular).
- **Groups**: public (open join) and private (invite/approve). Roles
  owner/admin/member. Group posts + comments reuse the generic comments table.
- **Notifications**: DB rows + optional Realtime for in-app; batched **email
  digests** via a scheduled Edge Function for follows/comments/likes.

---

## 8. Moderation, safety & legal

UGC is the biggest risk surface. Plan:
- **New-user place submissions** are `pending` → staff approve before public
  (pre-moderation). Reviews/photos are post-moderated (visible, but reportable).
- **Reporting**: any user can report; reports land in the queue with a
  lightweight admin view; auto-hide content past a report threshold pending review.
- **Automated filters**: profanity/spam checks on submit; **CAPTCHA
  (Cloudflare Turnstile)** on signup and content creation; rate limits.
- **Account controls**: block/mute, ban, email-verified-before-posting.
- **Australian defamation** exposure in reviews → clear community guidelines, an
  easy takedown/right-of-reply process, and logged moderation actions.
- **Illegal content** (incl. CSAM) → documented removal + reporting procedure to
  authorities; retain minimal evidence per legal advice.
- **Location safety**: allow submitters to mark sensitive/private/First-Nations
  restricted sites; support obfuscating exact coordinates where appropriate.

---

## 9. Security

- **RLS on every table** — the primary authorization boundary. No table ships
  without a policy; add a CI check that fails if a public table has RLS off.
- **Secrets**: anon key is public by design; **service-role key is server-only**
  (never in the browser/bundle). Store in Vercel/Supabase env, not in git.
- **Input validation**: constraints + checks in the DB; Zod (or similar)
  validation at the app boundary in the Next.js stage.
- **Abuse**: Turnstile, per-user/per-IP rate limits (Edge Function + Upstash or
  Supabase), honeypot fields, email verification gate.
- **Transport/session**: HTTPS only; secure, httpOnly cookies for SSR sessions;
  CSRF protection on cookie-based mutations; strict CORS.
- **Storage**: bucket policies mirror table RLS; signed URLs for private objects;
  content-type + size enforcement.
- **Dependencies/CSP**: keep the existing tight external-origin discipline; add a
  Content-Security-Policy header once the app domains are fixed.

---

## 10. Privacy & compliance

- **Australian Privacy Principles (APP)**: collection notice at signup, purpose
  limitation, a real privacy policy (extend the existing `privacy.html`).
- **Data subject rights**: self-serve **export** and **account deletion**
  (cascade or anonymise authored content); honour access/correction requests.
- **GDPR/CCPA** for overseas visitors: lawful basis, consent for non-essential
  cookies/analytics, deletion rights (largely covered by the above).
- **Location & EXIF**: treat precise location as sensitive; strip GPS EXIF by
  default; consent before using it.
- **Minors**: set a minimum age (e.g. 15/16) in the terms; no targeted data
  collection from children.
- **Email**: subscribers get clear opt-in + one-click unsubscribe.

---

## 11. Environments, migrations & ops

- **Three Supabase projects**: dev, staging, prod. Schema changes as **SQL
  migrations in the repo** (`supabase/migrations/`) via the Supabase CLI —
  reviewable and replayable.
- **Seed**: script to load `data/places.json` into `places` (status `approved`)
  and move the current email signups into `email_subscribers`.
- **Frontend**: Vercel projects per environment, wired to the matching Supabase
  keys via env vars.
- **CI**: run migrations against an ephemeral DB, lint, typecheck, and the
  "RLS-on" check on every PR.
- **Backups/observability**: Supabase daily backups (verify restore); log Edge
  Functions; basic error tracking (Sentry) once dynamic.

---

## 12. Phased delivery plan

| Phase | Delivers | Notes |
|---|---|---|
| **A — Foundation** | Supabase project, Auth (email + Google), `profiles`, onboarding, migrate "notify me" → `email_subscribers`, RLS baseline | Ships login without changing much UI |
| **B — Places + reviews** | `places` table seeded from JSON, `nearby_places` RPC powering the live map, reviews/ratings, bookmarks | Map becomes dynamic + user-driven |
| **C — Media + trips** | Photo uploads (Storage + EXIF strip), trip routes/stories, public trip pages | Start Next.js migration here for SSR/SEO |
| **D — Social** | Follows, likes, comments, notifications + email digests | Feed goes live |
| **E — Groups** | Groups, membership, group discussions | |
| **F — Moderation & scale** | Reports queue + admin view, Turnstile, rate limits, search (pg_trgm/tsvector), image CDN | Harden before growth |

Each phase is shippable and guarded by feature flags.

---

## 13. Rough cost (early stage)

- **Supabase**: free tier for dev; **Pro ~US$25/mo** for prod (DB + auth +
  storage baseline). Photo egress is the variable — plan a CDN/R2 move if it grows.
- **Email**: Resend/Postmark free tiers cover early volume.
- **Vercel**: Hobby/Pro depending on traffic.
- **Turnstile**: free.

Order-of-magnitude: **~US$25–75/mo** until meaningful photo/traffic volume.

---

## 14. Open decisions (need your call)

1. **Platform**: Supabase (recommended) vs. self-assembled (Next.js + Neon +
   Auth.js + R2)? Lock-in vs. glue-code trade-off.
2. **Frontend timing**: add Supabase to the current static site first (Stage 1),
   or jump straight to a Next.js rewrite? (Recommended: Stage 1, migrate at Phase C.)
3. **Places**: curated-only at launch, or open user submissions immediately
   (with pre-moderation)?
4. **Moderation capacity**: who reviews the queue, and what's the target
   turnaround? This sizes pre- vs. post-moderation.
5. **Photo location**: strip GPS EXIF always, or offer opt-in location tagging?
6. **First OAuth providers**: Google only to start, or Google + Apple + Facebook?
7. **Monetisation intent** (affiliate gear links / premium) — even a "maybe"
   affects whether we add product/affiliate tables early.

Once 1–4 are settled I can turn Phase A into concrete migrations, RLS policies,
and the auth UI.
```
