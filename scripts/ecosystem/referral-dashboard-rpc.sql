-- Referral dashboard RPC (SECURITY DEFINER) — used by /referrals and profile share sheet.
-- Prereq: shared.referral_* tables + public.get_or_create_referral_code()

CREATE OR REPLACE FUNCTION public.get_referral_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shared', 'public', 'extensions'
AS $function$
DECLARE
  uid uuid := auth.uid();
  v_code text;
  v_signup_px int := 20;
  v_activation_px int := 100;
  v_referrer_px int := 50;
  v_my_referral shared.referrals%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  v_code := public.get_or_create_referral_code();

  SELECT signup_reward_px, activation_reward_px, referrer_reward_px
  INTO v_signup_px, v_activation_px, v_referrer_px
  FROM shared.referral_program_config
  WHERE id = 1;

  SELECT * INTO v_my_referral
  FROM shared.referrals
  WHERE referred_user_id = uid
  ORDER BY registered_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'code', v_code,
    'signup_reward_px', COALESCE(v_signup_px, 20),
    'activation_reward_px', COALESCE(v_activation_px, 100),
    'referrer_reward_px', COALESCE(v_referrer_px, 50),
    'invited_count', (
      SELECT count(*)::int FROM shared.referrals WHERE referrer_id = uid
    ),
    'qualified_count', (
      SELECT count(*)::int FROM shared.referrals WHERE referrer_id = uid AND status = 'qualified'
    ),
    'earned_px', COALESCE((
      SELECT sum(l.amount_px)::int
      FROM shared.referral_reward_ledger l
      JOIN shared.referrals r ON r.id = l.referral_id
      WHERE r.referrer_id = uid AND l.user_id = uid
    ), 0),
    'my_referral_status', v_my_referral.status,
    'my_signup_reward_px', COALESCE(v_my_referral.signup_reward_px, v_signup_px, 20),
    'my_activation_reward_px', COALESCE(v_my_referral.activation_reward_px, v_activation_px, 100),
    'recent', COALESCE((
      SELECT jsonb_agg(to_jsonb(t))
      FROM (
        SELECT
          r.id,
          r.status,
          r.registered_at,
          r.qualified_at,
          COALESCE(p.display_name, 'สมาชิกใหม่') AS display_name
        FROM shared.referrals r
        LEFT JOIN public.profiles p ON p.user_id = r.referred_user_id
        WHERE r.referrer_id = uid
        ORDER BY r.registered_at DESC
        LIMIT 20
      ) t
    ), '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_referral_dashboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_referral_dashboard() TO authenticated;
