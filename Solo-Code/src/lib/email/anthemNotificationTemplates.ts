/**
 * Re-exports 1PX notification email templates from Aplus1-Code (monorepo sibling).
 */
import type { ComponentType } from "react";
import {
  NOTIFICATION_TEMPLATES,
  ANTHEM_NOTIFICATION_SUBJECTS,
  SITE_NAME as ANTHEM_SITE_NAME,
  SITE_URL as ANTHEM_SITE_URL,
} from "./anthem-vendor/templates/index.ts";

export const ANTHEM_NOTIFICATION_EMAIL_TEMPLATES: Record<
  string,
  ComponentType<Record<string, unknown>>
> = Object.fromEntries(
  Object.entries(NOTIFICATION_TEMPLATES).map(([key, entry]) => [key, entry.component]),
);

export { NOTIFICATION_TEMPLATES, ANTHEM_NOTIFICATION_SUBJECTS, ANTHEM_SITE_NAME, ANTHEM_SITE_URL };
