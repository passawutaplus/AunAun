-- Redesign: Event tab search ("อยากไปงานวาดรูปฟรีที่เชียงใหม่เสาร์นี้", owner 2026-11-28). Rule based, no outside service.
-- The browser turns the sentence into filters (Anthem-Code/src/redesign/main/eventIntent.ts); this ranks the events.
-- Searched: published, top-level (venues of a multi-venue event are left out) and not ended (Bangkok date).
--   _keywords   every item must match; one item = a word and its twins joined by '|' (เซรามิก|ceramic).
--               Matched in title, English name, description, place and organiser. Thai has no spaces, so a word
--               is found with strpos; pg_trgm word_similarity only forgives typos in latin words of 4+ letters.
--   _boost      soft words ("วาด", "paint"): move events up, never filter.
--   _categories any of these types.        _free  fee_type = 'free' only.
--   _places     any of these words in the place / title (the browser sends a province's names, towns and venues).
--               Open calls held online or nationwide count for every place (unless another type was asked for).
--   _from/_to   the event must be on at least one of these days.
-- When nothing matches everything, the nearest events come back instead (exact = false): the ones that
-- keep the most of the filters, then the soonest. No new table; reads go through RLS (SECURITY INVOKER).
-- Rollback: supabase/manual/rollback-20261129150000_redesign_event_search.sql

CREATE OR REPLACE FUNCTION public.event_search(
  _keywords text[] DEFAULT '{}',
  _boost text[] DEFAULT '{}',
  _categories text[] DEFAULT '{}',
  _places text[] DEFAULT '{}',
  _free boolean DEFAULT false,
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _limit integer DEFAULT 60
)
RETURNS TABLE (id uuid, score real, exact boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'anthem', 'public'
AS $function$
  WITH args AS (
    SELECT (now() AT TIME ZONE 'Asia/Bangkok')::date AS today,
           coalesce(_keywords, '{}') AS kws,
           coalesce(_boost, '{}') AS boosts,
           coalesce(_categories, '{}') AS cats,
           coalesce(_places, '{}') AS places,
           least(greatest(coalesce(_limit, 60), 1), 100) AS lim
  ),
  live AS (
    SELECT e.id, e.category, e.fee_type, e.starts_on,
           coalesce(e.ends_on, e.starts_on) AS last_day,
           lower(concat_ws(' ', e.title, e.name_en)) AS t,
           lower(concat_ws(' ', e.title, e.name_en, e.description, e.location_name, e.location_note, e.organizer_name)) AS hay,
           lower(concat_ws(' ', e.location_name, e.location_note, e.address, e.area, e.title, e.name_en)) AS place
      FROM anthem.events e, args a
     WHERE e.status = 'published'
       AND e.parent_id IS NULL
       AND e.starts_on IS NOT NULL
       AND coalesce(e.ends_on, e.starts_on) >= a.today
  ),
  kw AS (
    -- one row per event and keyword item: 2 = in the title, 1 = elsewhere, 0.6–1 = a near spelling, 0 = missing
    SELECT l.id, k.ord,
           max(CASE WHEN strpos(l.t, w) > 0 THEN 2
                    WHEN strpos(l.hay, w) > 0 THEN 1
                    WHEN w ~ '^[a-z0-9 ]{4,}$' AND word_similarity(w, l.hay) >= 0.6 THEN word_similarity(w, l.hay)
                    ELSE 0 END) AS s
      FROM live l
      CROSS JOIN args a
      CROSS JOIN LATERAL unnest(a.kws) WITH ORDINALITY AS k(item, ord)
      CROSS JOIN LATERAL unnest(string_to_array(lower(k.item), '|')) AS w
     WHERE w <> ''
     GROUP BY l.id, k.ord
  ),
  kw_sum AS (
    SELECT id, count(*) FILTER (WHERE s > 0) AS hits, sum(s) AS s FROM kw GROUP BY id
  ),
  scored AS (
    SELECT l.id, l.starts_on, l.last_day, a.today, a.lim,
           (cardinality(a.cats) = 0 OR l.category = ANY (a.cats)) AS cat_ok,
           (NOT coalesce(_free, false) OR l.fee_type = 'free') AS free_ok,
           (cardinality(a.places) = 0
             OR EXISTS (SELECT 1 FROM unnest(a.places) p WHERE p <> '' AND strpos(l.place, lower(p)) > 0)
             OR (l.category = 'open_call' AND (cardinality(a.cats) = 0 OR 'open_call' = ANY (a.cats))
                 AND l.place ~ '(ทั่วประเทศ|ออนไลน์|online)')) AS place_ok,
           ((_from IS NULL OR l.last_day >= _from) AND (_to IS NULL OR l.starts_on <= _to)) AS date_ok,
           coalesce(k.hits, 0) = cardinality(a.kws) AS kw_ok,
           coalesce(k.s, 0) AS kw_s,
           (SELECT count(*) FROM unnest(a.boosts) b WHERE b <> '' AND strpos(l.hay, lower(b)) > 0) AS boost_n
      FROM live l
      CROSS JOIN args a
      LEFT JOIN kw_sum k ON k.id = l.id
  ),
  ranked AS (
    SELECT s.*,
           (s.cat_ok AND s.free_ok AND s.place_ok AND s.date_ok AND s.kw_ok) AS is_exact,
           ((CASE WHEN s.place_ok THEN 3 ELSE 0 END) + (CASE WHEN s.date_ok THEN 2 ELSE 0 END)
             + (CASE WHEN s.cat_ok THEN 2 ELSE 0 END) + (CASE WHEN s.free_ok THEN 1 ELSE 0 END)
             + s.kw_s + 0.5 * s.boost_n)::real AS pts
      FROM scored s
  ),
  counted AS (
    SELECT r.*, count(*) FILTER (WHERE r.is_exact) OVER () AS n_exact FROM ranked r
  )
  SELECT c.id, c.pts, c.is_exact
    FROM counted c
   WHERE c.is_exact OR c.n_exact = 0
   ORDER BY c.is_exact DESC, c.pts DESC, greatest(c.starts_on, c.today), c.last_day, c.id
   LIMIT (SELECT CASE WHEN max(n_exact) > 0 THEN max(lim) ELSE least(max(lim), 12) END FROM counted);
$function$;

REVOKE ALL ON FUNCTION public.event_search(text[], text[], text[], text[], boolean, date, date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_search(text[], text[], text[], text[], boolean, date, date, integer) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
