import {
  BRAND_DOMAIN,
  BRAND_NAME,
  BRAND_PRIVACY_EMAIL,
  BRAND_SUPPORT_EMAIL,
  APLUS1_PRODUCTION_URL,
} from '../brandConfig'

const configuredOrigin =
  (import.meta.env?.VITE_APLUS1_APP_URL as string | undefined) ||
  (import.meta.env?.VITE_ANTHEM_APP_URL as string | undefined)

export const SITE_NAME = BRAND_NAME
export const SITE_URL = configuredOrigin?.trim().replace(/\/$/, "") || APLUS1_PRODUCTION_URL
export const CONTACT_EMAIL = BRAND_SUPPORT_EMAIL
export const PRIVACY_EMAIL = BRAND_PRIVACY_EMAIL
export const SITE_DOMAIN = BRAND_DOMAIN

/** Shared ecosystem LINE (So1o + Aplus1) */
export const LINE_URL = 'https://lin.ee/q3W9Qds'
export const LINE_ID = '@solofreelancer'
