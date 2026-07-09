export { SignupEmail } from './signup'
export { InviteEmail } from './invite'
export { MagicLinkEmail } from './magic-link'
export { RecoveryEmail } from './recovery'
export { EmailChangeEmail } from './email-change'
export { ReauthenticationEmail } from './reauthentication'
export { HireRequestEmail } from './hire-request'
export { ChatMessageEmail } from './chat-message'
export { JobMatchEmail } from './job-match'
export { CollabRequestEmail } from './collab-request'
export { GiftReceivedEmail } from './gift-received'
export { FollowEmail } from './follow'
export { JobApplicationEmail } from './job-application'
export { TopupSuccessEmail } from './topup-success'
export { CashoutStatusEmail } from './cashout-status'
export {
  NOTIFICATION_TEMPLATES,
  ANTHEM_NOTIFICATION_SUBJECTS,
  type NotificationTemplateEntry,
} from './registry'
export { SITE_NAME, SITE_URL, CONTACT_EMAIL } from './brandMeta'

import { BRAND_NAME } from '../brandConfig'

export const ANTHEM_AUTH_SUBJECTS: Record<string, string> = {
  signup: `ยืนยันอีเมลของคุณ — ${BRAND_NAME}`,
  invite: `คุณได้รับคำเชิญเข้าร่วม ${BRAND_NAME}`,
  magiclink: `ลิงก์เข้าสู่ระบบ ${BRAND_NAME}`,
  recovery: `รีเซ็ตรหัสผ่าน ${BRAND_NAME}`,
  email_change: `ยืนยันการเปลี่ยนอีเมล — ${BRAND_NAME}`,
  reauthentication: `รหัสยืนยันตัวตนของคุณ — ${BRAND_NAME}`,
}
