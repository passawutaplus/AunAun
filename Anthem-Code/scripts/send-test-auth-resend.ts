/**
 * Send all Aplus1 auth email templates via Resend.
 * Usage: npx tsx scripts/send-test-auth-resend.ts you@example.com
 * Loads RESEND_API_KEY from Solo-Code/.env or Anthem-Code/.env
 */
import * as React from 'react'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@react-email/components'
import { SignupEmail } from '../src/lib/email-templates/signup.tsx'
import { InviteEmail } from '../src/lib/email-templates/invite.tsx'
import { MagicLinkEmail } from '../src/lib/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../src/lib/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../src/lib/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../src/lib/email-templates/reauthentication.tsx'
import { SITE_NAME, SITE_URL } from '../src/lib/email-templates/brandMeta.ts'

const root = join(import.meta.dirname ?? '.', '..', '..')

function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  const raw = readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}

loadEnvFile(join(root, 'Solo-Code', '.env'))
loadEnvFile(join(import.meta.dirname ?? '.', '..', '.env'))

const to = process.argv[2] || process.env.TEST_EMAIL
if (!to) {
  console.error('Usage: npx tsx scripts/send-test-auth-resend.ts <email>')
  process.exit(1)
}

const apiKey = process.env.RESEND_API_KEY
if (!apiKey) {
  console.error('RESEND_API_KEY not set (Solo-Code/.env or Anthem-Code/.env)')
  process.exit(1)
}

const from = process.env.APLUS1_EMAIL_FROM ?? 'Aplus1 <noreply@aplus1.app>'

const AUTH: Record<
  string,
  { component: React.ComponentType<Record<string, unknown>>; subject: string; data: Record<string, unknown> }
> = {
  signup: {
    component: SignupEmail as React.ComponentType<Record<string, unknown>>,
    subject: `ยืนยันอีเมลของคุณ — ${SITE_NAME}`,
    data: {
      siteName: SITE_NAME,
      siteUrl: SITE_URL,
      recipient: to,
      confirmationUrl: `${SITE_URL}/auth/callback`,
    },
  },
  invite: {
    component: InviteEmail as React.ComponentType<Record<string, unknown>>,
    subject: `คุณได้รับคำเชิญเข้าร่วม ${SITE_NAME}`,
    data: { siteName: SITE_NAME, siteUrl: SITE_URL, confirmationUrl: `${SITE_URL}/auth/callback` },
  },
  'magic-link': {
    component: MagicLinkEmail as React.ComponentType<Record<string, unknown>>,
    subject: `ลิงก์เข้าสู่ระบบ ${SITE_NAME}`,
    data: { siteName: SITE_NAME, confirmationUrl: `${SITE_URL}/auth/callback` },
  },
  recovery: {
    component: RecoveryEmail as React.ComponentType<Record<string, unknown>>,
    subject: `รีเซ็ตรหัสผ่าน ${SITE_NAME}`,
    data: { siteName: SITE_NAME, confirmationUrl: `${SITE_URL}/auth/callback` },
  },
  'email-change': {
    component: EmailChangeEmail as React.ComponentType<Record<string, unknown>>,
    subject: `ยืนยันการเปลี่ยนอีเมล — ${SITE_NAME}`,
    data: {
      siteName: SITE_NAME,
      oldEmail: to,
      email: to,
      newEmail: `new-${to}`,
      confirmationUrl: `${SITE_URL}/auth/callback`,
    },
  },
  reauthentication: {
    component: ReauthenticationEmail as React.ComponentType<Record<string, unknown>>,
    subject: `รหัสยืนยันตัวตนของคุณ — ${SITE_NAME}`,
    data: { token: '482910' },
  },
}

const onlyFilter = process.env.ONLY_AUTH?.split(',').map((s) => s.trim()).filter(Boolean)

async function send(label: string, subject: string, element: React.ReactElement) {
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `[ทดสอบ auth/${label}] ${subject}`,
      html,
      text,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`${label}: ${res.status} ${JSON.stringify(body)}`)
  }
  console.log(`✓ auth/${label} → ${(body as { id?: string }).id ?? 'ok'}`)
  await new Promise((r) => setTimeout(r, 600))
}

console.log(`Sending ${Object.keys(AUTH).length} auth templates to ${to}…\n`)

for (const [name, { component, subject, data }] of Object.entries(AUTH)) {
  if (onlyFilter?.length && !onlyFilter.includes(name)) continue
  await send(name, subject, React.createElement(component, data))
}

console.log(`\nDone — 6 auth templates sent to ${to}`)
