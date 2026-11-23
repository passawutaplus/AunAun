-- Sign in with Apple refresh tokens, kept only so a deleted account's access can be revoked at Apple
-- (App Store Review Guideline 5.1.1(v)). Written by the apple-signin-token edge function right after an Apple
-- sign-in in the iOS app; account-purge revokes the token and the row goes with the auth user.
-- Service role only: RLS is on with no policies, and anon/authenticated have no grants.

CREATE TABLE IF NOT EXISTS anthem.apple_signin_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  apple_sub text NOT NULL,
  refresh_token text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE anthem.apple_signin_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE anthem.apple_signin_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE anthem.apple_signin_tokens TO service_role;
