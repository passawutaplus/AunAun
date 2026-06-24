-- Document signatures: freelancer PNG + client online/wet sign via /sign/:token
-- Storage: reuse bucket brand-logos — {userId}/signature-*, {quotationId}/client-sign-*

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signature_url text,
  ADD COLUMN IF NOT EXISTS esign_acknowledged_at timestamptz;

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS signature_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS include_freelancer_signature boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sign_share_token uuid,
  ADD COLUMN IF NOT EXISTS client_signer_name text,
  ADD COLUMN IF NOT EXISTS client_signature_url text,
  ADD COLUMN IF NOT EXISTS client_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_sign_method text,
  ADD COLUMN IF NOT EXISTS client_signer_ip text,
  ADD COLUMN IF NOT EXISTS client_signer_user_agent text,
  ADD COLUMN IF NOT EXISTS signed_document_url text,
  ADD COLUMN IF NOT EXISTS signature_consent_version text;

ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_signature_mode_check;
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_signature_mode_check
  CHECK (signature_mode = ANY (ARRAY['none'::text, 'embedded'::text, 'online'::text, 'wet'::text]));

ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_client_sign_method_check;
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_client_sign_method_check
  CHECK (client_sign_method IS NULL OR client_sign_method = ANY (ARRAY['draw'::text, 'full_document'::text]));

CREATE UNIQUE INDEX IF NOT EXISTS quotations_sign_share_token_key ON public.quotations (sign_share_token)
  WHERE sign_share_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.resolve_quotation_id_by_sign_token(_token uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT id FROM public.quotations WHERE sign_share_token = _token LIMIT 1),
    (SELECT quotation_id FROM public.job_trackers WHERE share_token = _token AND quotation_id IS NOT NULL LIMIT 1)
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_quotation_sign_payload_by_token(_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  qid uuid;
  q public.quotations%ROWTYPE;
  prof public.profiles%ROWTYPE;
BEGIN
  qid := public.resolve_quotation_id_by_sign_token(_token);
  IF qid IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO q FROM public.quotations WHERE id = qid;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO prof FROM public.profiles WHERE user_id = q.user_id;
  RETURN jsonb_build_object(
    'quotation_id', q.id,
    'number', q.number,
    'project_name', q.project_name,
    'client_name', q.client_name,
    'status', q.status,
    'signature_mode', q.signature_mode,
    'include_freelancer_signature', q.include_freelancer_signature,
    'client_signed_at', q.client_signed_at,
    'client_signer_name', q.client_signer_name,
    'client_signature_url', q.client_signature_url,
    'signed_document_url', q.signed_document_url,
    'client_sign_method', q.client_sign_method,
    'items', q.items,
    'addons', q.addons,
    'difficulties', q.difficulties,
    'milestones', q.milestones,
    'hidden_cost', q.hidden_cost,
    'discount_value', q.discount_value,
    'discount_kind', q.discount_kind,
    'vat_enabled', q.vat_enabled,
    'vat_rate', q.vat_rate,
    'wht_enabled', q.wht_enabled,
    'wht_rate', q.wht_rate,
    'deposit_preset', q.deposit_preset,
    'payment_terms', q.payment_terms,
    'notes', q.notes,
    'revisions_count', q.revisions_count,
    'brand_name', COALESCE(prof.brand_name, prof.display_name, 'So1o Freelancer'),
    'logo_url', prof.logo_url,
    'freelancer_signature_url', CASE WHEN q.include_freelancer_signature THEN prof.signature_url ELSE NULL END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sign_quotation_by_token(
  _token uuid, _name text, _method text,
  _signature_url text DEFAULT NULL, _signed_document_url text DEFAULT NULL,
  _consent_version text DEFAULT NULL, _signer_ip text DEFAULT NULL, _signer_ua text DEFAULT NULL
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE qid uuid; q public.quotations%ROWTYPE;
BEGIN
  IF _name IS NULL OR length(trim(_name)) = 0 THEN RAISE EXCEPTION 'name required'; END IF;
  IF _method NOT IN ('draw', 'full_document') THEN RAISE EXCEPTION 'invalid sign method'; END IF;
  IF _method = 'draw' AND (_signature_url IS NULL OR length(trim(_signature_url)) = 0) THEN RAISE EXCEPTION 'signature image required'; END IF;
  IF _method = 'full_document' AND (_signed_document_url IS NULL OR length(trim(_signed_document_url)) = 0) THEN RAISE EXCEPTION 'signed document required'; END IF;
  qid := public.resolve_quotation_id_by_sign_token(_token);
  IF qid IS NULL THEN RETURN false; END IF;
  SELECT * INTO q FROM public.quotations WHERE id = qid FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF q.client_signed_at IS NOT NULL THEN RETURN false; END IF;
  IF q.signature_mode NOT IN ('online', 'wet') THEN RAISE EXCEPTION 'document does not accept online signing'; END IF;
  UPDATE public.quotations SET
    client_signer_name = left(trim(_name), 120),
    client_signature_url = CASE WHEN _method = 'draw' THEN left(trim(_signature_url), 2048) ELSE client_signature_url END,
    signed_document_url = CASE WHEN _method = 'full_document' THEN left(trim(_signed_document_url), 2048) ELSE signed_document_url END,
    client_signed_at = now(), client_sign_method = _method,
    client_signer_ip = left(coalesce(_signer_ip, ''), 64),
    client_signer_user_agent = left(coalesce(_signer_ua, ''), 512),
    signature_consent_version = left(coalesce(_consent_version, ''), 32),
    updated_at = now()
  WHERE id = qid;
  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_quotation_sign_payload_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_quotation_by_token(uuid, text, text, text, text, text, text, text) TO anon, authenticated;
