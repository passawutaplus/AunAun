-- Fix _check_welcome_mission: do not require profiles row for like/follow/publish/visit missions

CREATE OR REPLACE FUNCTION public._check_welcome_mission(_uid uuid, _mission_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  pub_count int;
  follow_count int;
  like_count int;
BEGIN
  CASE _mission_id
    WHEN 'like' THEN
      SELECT COUNT(*)::int INTO like_count FROM anthem.project_likes WHERE user_id = _uid;
      RETURN like_count >= 1;
    WHEN 'follow' THEN
      SELECT COUNT(*)::int INTO follow_count FROM anthem.follows WHERE follower_id = _uid;
      RETURN follow_count >= 1;
    WHEN 'publish_project' THEN
      SELECT COUNT(*)::int INTO pub_count FROM anthem.projects
        WHERE owner_id = _uid AND status = 'Published';
      RETURN pub_count >= 1;
    WHEN 'explore_feed' THEN
      RETURN public._welcome_visit(_uid, 'explore_feed');
    WHEN 'jobs' THEN
      RETURN public._welcome_visit(_uid, 'jobs');
    WHEN 'share_profile' THEN
      RETURN public._welcome_visit(_uid, 'share_profile');
    WHEN 'profile', 'skills' THEN
      SELECT * INTO p FROM public.profiles WHERE user_id = _uid LIMIT 1;
      IF NOT FOUND THEN RETURN false; END IF;
      IF _mission_id = 'profile' THEN
        RETURN COALESCE(length(trim(p.avatar_url)), 0) > 0
          AND COALESCE(length(trim(p.username)), 0) > 0
          AND COALESCE(length(trim(p.bio)), 0) >= 20;
      END IF;
      RETURN COALESCE(array_length(p.skills, 1), 0) >= 1;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public._welcome_visit(_uid uuid, _key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (onboarding_visits ->> _key)::boolean
     FROM public.profiles
     WHERE user_id = _uid
     LIMIT 1),
    false
  );
$$;
