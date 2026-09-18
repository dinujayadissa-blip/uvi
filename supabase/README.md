# Uvi backend (Supabase) — Phase A setup

Phase A adds **accounts** to the static Uvi site using Supabase (Postgres +
Auth). Nothing here runs until you create a Supabase project and paste two
public keys into `js/config.js`. Until then the site works as a static site and
account features stay hidden.

## 1. Create the project
1. Sign up at <https://supabase.com> and create a new project (choose the
   Sydney region for AU users).
2. In **Settings → API**, copy the **Project URL** and the **anon public** key.

## 2. Wire up the front end
Edit `js/config.js` and replace the placeholders:

```js
window.UVI_CONFIG = {
  supabaseUrl: 'https://YOURPROJECT.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...'   // the anon/public key — safe to commit
};
```

> The **anon key is public by design** — row-level security protects the data.
> Never put the **service-role** key in front-end code.

## 3. Apply the database migration
Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:

```bash
supabase login
supabase link --project-ref YOURPROJECTREF
supabase db push        # applies supabase/migrations/0001_phase_a_foundation.sql
```

This creates `profiles` and `email_subscribers`, the `is_staff()` helper, and
all row-level-security policies and grants.

## 4. Configure Auth (Supabase dashboard)
- **Authentication → URL Configuration**
  - Site URL: your production URL (e.g. `https://uvi-uvi1.vercel.app`)
  - Redirect URLs: add your production URL and `http://localhost:*` for local dev.
- **Authentication → Providers**
  - Email: enabled, with **Confirm email** on.
  - Google: enable and paste your Google OAuth client ID/secret
    (create them in Google Cloud Console; set the Supabase callback URL as an
    authorised redirect URI).

## 5. Make yourself an admin (optional, for later moderation)
After you sign up and complete onboarding, run in the SQL editor:

```sql
update public.profiles set role = 'admin' where username = 'your_username';
```

## What Phase A delivers
- Email/password + Google sign-in, email verification, password reset.
- Username onboarding + profile edit (`profiles` table).
- The "notify me" form now persists to `email_subscribers` (staff-readable only).

## Phase B — places, reviews & bookmarks

`supabase db push` applies these automatically (they're plain migrations):

- `0002_phase_b_places.sql` — enables PostGIS; creates `places` (with a
  geography column + rating rollup), `reviews`, and `bookmarks`; adds the
  `nearby_places()` geo-search RPC; and RLS + grants for all three.
- `0003_seed_places.sql` — loads the 24 curated finder locations as
  **approved** places. Regenerate it after editing `data/places.json`:

  ```bash
  node tools/gen-seed.js && supabase db push
  ```

Once applied and keys are set, the map and list load **live** from Supabase
(including any user-submitted places you approve), each place gets a detail
view with **star ratings and reviews**, and signed-in users can **bookmark**
places. User-submitted places default to `pending` until a staff member sets
`status = 'approved'` (curated-first). Until Supabase is configured the site
uses the static `data/places.json` and shows reviews as "coming soon".

## Next phases
See `docs/backend-spec.md` for Phase C onward (media/photos, trips, social,
groups, moderation).
