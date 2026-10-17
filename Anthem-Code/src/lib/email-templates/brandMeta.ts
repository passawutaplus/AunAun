import {
  BRAND_DOMAIN,
  BRAND_LINE_CONTACT_URL,
  BRAND_LINE_ID,
  BRAND_NAME,
  BRAND_PRIVACY_EMAIL,
  BRAND_SUPPORT_EMAIL,
  defaultSiteUrl,
} from '../brandConfig'

export const SITE_NAME = BRAND_NAME
export const SITE_URL = defaultSiteUrl()
export const CONTACT_EMAIL = BRAND_SUPPORT_EMAIL
export const PRIVACY_EMAIL = BRAND_PRIVACY_EMAIL
export const SITE_DOMAIN = BRAND_DOMAIN

/** SAMECOR LINE OA — contact / support */
export const LINE_URL = BRAND_LINE_CONTACT_URL
export const LINE_ID = BRAND_LINE_ID
