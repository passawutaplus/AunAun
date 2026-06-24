/**
 * Re-exports 1PX auth email templates from the Anthem-Code package (monorepo sibling).
 * Used by the shared Supabase auth email webhook.
 */
import type { ComponentType } from "react";
import {
  SignupEmail as AnthemSignupEmail,
  InviteEmail as AnthemInviteEmail,
  MagicLinkEmail as AnthemMagicLinkEmail,
  RecoveryEmail as AnthemRecoveryEmail,
  EmailChangeEmail as AnthemEmailChangeEmail,
  ReauthenticationEmail as AnthemReauthenticationEmail,
  ANTHEM_AUTH_SUBJECTS,
  SITE_NAME as ANTHEM_SITE_NAME,
  SITE_URL as ANTHEM_SITE_URL,
} from "./anthem-vendor/templates/index.ts";

export const ANTHEM_EMAIL_TEMPLATES: Record<string, ComponentType<any>> = {
  signup: AnthemSignupEmail,
  invite: AnthemInviteEmail,
  magiclink: AnthemMagicLinkEmail,
  recovery: AnthemRecoveryEmail,
  email_change: AnthemEmailChangeEmail,
  reauthentication: AnthemReauthenticationEmail,
};

export { ANTHEM_AUTH_SUBJECTS, ANTHEM_SITE_NAME, ANTHEM_SITE_URL };
