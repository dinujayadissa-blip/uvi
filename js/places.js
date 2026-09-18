/**
 * Uvi — Phase B: live places, reviews & bookmarks (Stage 1).
 *
 * Exposes helpers used by main.js when Supabase is configured. If it isn't,
 * none of this defines anything and main.js falls back to the static
 * data/places.json (curated seed) with reviews shown as "coming soon".
 */
(function () {
  'use strict';

  var sb = window.uviSupabase;   // set by auth.js only when configured
  if (!sb) return;

  window.uviPlaces = {
    /* Approved places for the map + list. Returns [] on error. */
    fetch: function () {
      return sb.from('places')
        .select('id,name,type,state,lat,lng,description,rating_avg,rating_count')
        .eq('status', 'approved')
        .then(function (res) {
          if (res.error || !res.data) return [];
          return res.data.map(function (p) {
            return {
              id: p.id, name: p.name, type: p.type, state: p.state,
              lat: p.lat, lng: p.lng, desc: p.description || '',
              rating_avg: p.rating_avg, rating_count: p.rating_count
            };
          });
        });
    },

    /* Reviews for a place, newest first, with reviewer profile embedded. */
    getReviews: function (placeId) {
      return sb.from('reviews')
        .select('rating,body,visited_on,created_at,profiles(username,display_name)')
        .eq('place_id', placeId)
        .order('created_at', { ascending: false })
        .then(function (res) { return res.error ? [] : (res.data || []); });
    },

    /* Create or update the current user's review for a place. */
    saveReview: function (placeId, rating, body) {
      return sb.auth.getUser().then(function (u) {
        var user = u.data && u.data.user;
        if (!user) return { error: { message: 'Not signed in' } };
        return sb.from('reviews').upsert(
          { place_id: placeId, user_id: user.id, rating: rating, body: body || null },
          { onConflict: 'place_id,user_id' }
        );
      });
    },

    /* Bookmark helpers */
    getBookmarks: function () {
      return sb.from('bookmarks').select('place_id')
        .then(function (res) { return res.error ? [] : (res.data || []).map(function (b) { return b.place_id; }); });
    },
    setBookmark: function (placeId, on) {
      return sb.auth.getUser().then(function (u) {
        var user = u.data && u.data.user;
        if (!user) return { error: { message: 'Not signed in' } };
        return on
          ? sb.from('bookmarks').upsert({ user_id: user.id, place_id: placeId },
              { onConflict: 'user_id,place_id' })
          : sb.from('bookmarks').delete().eq('user_id', user.id).eq('place_id', placeId);
      });
    }
  };

  /* Current signed-in user (or null) — used by main.js to toggle UI. */
  window.uviGetUser = function () {
    return sb.auth.getUser().then(function (u) { return (u.data && u.data.user) || null; });
  };
})();
