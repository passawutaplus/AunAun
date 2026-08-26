-- Fix: submit_kyc_verification INSERT ... ON CONFLICT (request_id, doc_type)
-- failed because shared.kyc_documents had no matching unique constraint.
-- Apply via: node scripts/ecosystem/apply-kyc-migration.mjs kyc-documents-unique.sql

DELETE FROM shared.kyc_documents d
WHERE d.ctid NOT IN (
  SELECT min(ctid)
  FROM shared.kyc_documents
  GROUP BY request_id, doc_type
);

CREATE UNIQUE INDEX IF NOT EXISTS kyc_documents_request_id_doc_type_key
  ON shared.kyc_documents (request_id, doc_type);

-- admin_approve_kyc uses ON CONFLICT (user_id) on payout_profiles.
DO $$
BEGIN
  ALTER TABLE shared.payout_profiles
    ADD CONSTRAINT payout_profiles_pkey PRIMARY KEY (user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN invalid_table_definition THEN
    CREATE UNIQUE INDEX IF NOT EXISTS payout_profiles_user_id_key
      ON shared.payout_profiles (user_id);
END $$;
