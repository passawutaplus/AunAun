-- On KYC approve: sync identity fields into profiles billing / address (docs & tax).
-- Applied via Supabase MCP (kyc_approve_sync_billing).

CREATE OR REPLACE FUNCTION public.admin_approve_kyc(_request_id uuid, _note text DEFAULT ''::text)
RETURNS shared.kyc_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shared', 'public'
AS $function$
DECLARE
  req shared.kyc_requests;
  expires_at timestamptz := now() + interval '2 years';
  addr jsonb;
  line1 text;
  subdistrict text;
  district text;
  province text;
  postal text;
  full_address text;
  nid text;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  UPDATE shared.kyc_requests
     SET status = 'approved',
         admin_note = coalesce(_note, ''),
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         reject_reason_code = NULL,
         reject_reason_label = NULL,
         kyc_expires_at = expires_at
   WHERE id = _request_id AND status = 'pending'
   RETURNING * INTO req;

  IF req.id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบคำขอหรือสถานะไม่ถูกต้อง';
  END IF;

  INSERT INTO shared.payout_profiles (user_id, bank_name, account_number, account_name, verified_at, updated_at)
  VALUES (req.user_id, req.bank_name, req.account_number, req.account_name, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET bank_name = EXCLUDED.bank_name,
        account_number = EXCLUDED.account_number,
        account_name = EXCLUDED.account_name,
        verified_at = now(),
        updated_at = now();

  addr := coalesce(req.address_json, '{}'::jsonb);
  line1 := nullif(trim(coalesce(addr->>'line1', '')), '');
  subdistrict := nullif(trim(coalesce(addr->>'subdistrict', '')), '');
  district := nullif(trim(coalesce(addr->>'district', '')), '');
  province := nullif(trim(coalesce(addr->>'province', '')), '');
  postal := nullif(
    regexp_replace(
      coalesce(addr->>'postalCode', addr->>'postal_code', ''),
      '\D',
      '',
      'g'
    ),
    ''
  );
  full_address := nullif(
    trim(both ' ' from concat_ws(
      ' ',
      line1,
      subdistrict,
      district,
      province,
      postal
    )),
    ''
  );
  nid := nullif(regexp_replace(coalesce(req.national_id_number, ''), '\D', '', 'g'), '');

  UPDATE public.profiles
     SET is_verified = true,
         kyc_verified_at = now(),
         kyc_expires_at = expires_at,
         legal_name = coalesce(nullif(trim(req.legal_name), ''), legal_name),
         tax_id = coalesce(nid, tax_id),
         billing_address = coalesce(full_address, billing_address),
         address = coalesce(full_address, address),
         profile_address = CASE
           WHEN full_address IS NULL THEN profile_address
           ELSE jsonb_strip_nulls(jsonb_build_object(
             'line1', coalesce(line1, ''),
             'subdistrict', coalesce(subdistrict, ''),
             'district', coalesce(district, ''),
             'province', coalesce(province, ''),
             'postalCode', coalesce(left(postal, 5), '')
           ))
         END,
         location = coalesce(
           nullif(trim(both ' ' from concat_ws(', ', district, province)), ''),
           location
         ),
         billing_type = coalesce(nullif(billing_type, ''), 'individual'),
         phone = coalesce(nullif(trim(coalesce(req.phone, '')), ''), phone),
         email = coalesce(nullif(trim(coalesce(req.contact_email, '')), ''), email)
   WHERE user_id = req.user_id;

  PERFORM public.log_admin_audit(
    'kyc.approve', 'kyc_request', _request_id::text,
    jsonb_build_object('subject_user_id', req.user_id, 'kyc_expires_at', expires_at)
  );

  PERFORM public.notify_kyc_user(
    req.user_id,
    'kyc_approved',
    'ยืนยันตัวตนสำเร็จ',
    'คำขอยืนยันตัวตนของคุณได้รับการอนุมัติแล้ว — มีผล 2 ปี นับจากวันนี้',
    '/verify'
  );

  RETURN req;
END;
$function$;

-- Backfill: approved KYC is source of truth for individual billing identity fields.
UPDATE public.profiles p
SET
  legal_name = coalesce(nullif(trim(k.legal_name), ''), p.legal_name),
  tax_id = coalesce(
    nullif(regexp_replace(coalesce(k.national_id_number, ''), '\D', '', 'g'), ''),
    p.tax_id
  ),
  billing_address = coalesce(
    nullif(
      trim(both ' ' from concat_ws(
        ' ',
        nullif(trim(coalesce(k.address_json->>'line1', '')), ''),
        nullif(trim(coalesce(k.address_json->>'subdistrict', '')), ''),
        nullif(trim(coalesce(k.address_json->>'district', '')), ''),
        nullif(trim(coalesce(k.address_json->>'province', '')), ''),
        nullif(regexp_replace(coalesce(k.address_json->>'postalCode', k.address_json->>'postal_code', ''), '\D', '', 'g'), '')
      )),
      ''
    ),
    p.billing_address
  ),
  address = coalesce(
    nullif(
      trim(both ' ' from concat_ws(
        ' ',
        nullif(trim(coalesce(k.address_json->>'line1', '')), ''),
        nullif(trim(coalesce(k.address_json->>'subdistrict', '')), ''),
        nullif(trim(coalesce(k.address_json->>'district', '')), ''),
        nullif(trim(coalesce(k.address_json->>'province', '')), ''),
        nullif(regexp_replace(coalesce(k.address_json->>'postalCode', k.address_json->>'postal_code', ''), '\D', '', 'g'), '')
      )),
      ''
    ),
    p.address
  ),
  billing_type = coalesce(nullif(p.billing_type, ''), 'individual')
FROM shared.kyc_requests k
WHERE k.user_id = p.user_id
  AND k.status = 'approved'
  AND k.id = (
    SELECT k2.id
    FROM shared.kyc_requests k2
    WHERE k2.user_id = p.user_id AND k2.status = 'approved'
    ORDER BY k2.reviewed_at DESC NULLS LAST, k2.submitted_at DESC
    LIMIT 1
  );
