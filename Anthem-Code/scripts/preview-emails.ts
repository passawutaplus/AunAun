/**
 * Renders Pixel100 auth + notification email templates to email-previews/.
 * Run: npx tsx scripts/preview-emails.ts
 */
import * as React from 'react'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@react-email/components'
import { SignupEmail } from '../src/lib/email-templates/signup.tsx'
import { InviteEmail } from '../src/lib/email-templates/invite.tsx'
import { MagicLinkEmail } from '../src/lib/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../src/lib/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../src/lib/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../src/lib/email-templates/reauthentication.tsx'
import { NOTIFICATION_TEMPLATES } from '../src/lib/email-templates/registry.ts'
import { SITE_NAME, SITE_URL } from '../src/lib/email-templates/brandMeta.ts'

const OUT = join(import.meta.dirname ?? '.', '..', 'email-previews')

const AUTH_TEMPLATES: Record<string, { component: React.ComponentType<any>; data: Record<string, unknown> }> = {
  signup: {
    component: SignupEmail,
    data: {
      siteName: SITE_NAME,
      siteUrl: SITE_URL,
      recipient: 'user@example.test',
      confirmationUrl: `${SITE_URL}/auth/callback`,
    },
  },
  invite: {
    component: InviteEmail,
    data: { siteName: SITE_NAME, siteUrl: SITE_URL, confirmationUrl: `${SITE_URL}/auth/callback` },
  },
  magiclink: {
    component: MagicLinkEmail,
    data: { siteName: SITE_NAME, confirmationUrl: `${SITE_URL}/auth/callback` },
  },
  recovery: {
    component: RecoveryEmail,
    data: { siteName: SITE_NAME, confirmationUrl: `${SITE_URL}/auth/callback` },
  },
  email_change: {
    component: EmailChangeEmail,
    data: {
      siteName: SITE_NAME,
      oldEmail: 'old@example.test',
      email: 'old@example.test',
      newEmail: 'new@example.test',
      confirmationUrl: `${SITE_URL}/auth/callback`,
    },
  },
  reauthentication: {
    component: ReauthenticationEmail,
    data: { token: '482910' },
  },
}

type PreviewItem = { id: string; group: string; label: string; subject: string; file: string }

mkdirSync(OUT, { recursive: true })

const items: PreviewItem[] = []

for (const [name, { component: Component, data }] of Object.entries(AUTH_TEMPLATES)) {
  const html = await render(React.createElement(Component, data))
  const file = `auth-${name}.html`
  writeFileSync(join(OUT, file), html)
  items.push({ id: name, group: 'Auth', label: name, subject: name, file })
  console.log(`✓ auth/${name}`)
}

for (const [name, entry] of Object.entries(NOTIFICATION_TEMPLATES)) {
  if (!entry.previewData) continue
  const html = await render(React.createElement(entry.component, entry.previewData))
  const subject =
    typeof entry.subject === 'function' ? entry.subject(entry.previewData) : entry.subject
  const file = `notify-${name}.html`
  writeFileSync(join(OUT, file), html)
  items.push({
    id: name,
    group: 'Notification',
    label: entry.displayName ?? name,
    subject,
    file,
  })
  console.log(`✓ notify/${name}`)
}

const authLinks = items.filter((i) => i.group === 'Auth').map((i) =>
  `<li><a href="${i.file}">${i.label}</a> <span style="color:#888">${i.subject}</span></li>`,
).join('')
const notifyLinks = items.filter((i) => i.group === 'Notification').map((i) =>
  `<li><a href="${i.file}">${i.label}</a> <span style="color:#888">${i.subject}</span></li>`,
).join('')

const index = `<!DOCTYPE html>
<html lang="th"><head><meta charset="utf-8"/><title>Pixel100 Email Previews</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;line-height:1.6}
h1{font-size:1.35rem;margin-bottom:0.25rem}h2{font-size:1rem;margin-top:1.5rem;color:#FF4F18}
ul{line-height:2;padding-left:1.25rem}span{font-size:0.85em}</style></head>
<body><h1>Pixel100 Email Previews</h1>
<p style="color:#666">Auth + แจ้งเตือน — flat icons, CI Pixel100</p>
<h2>Auth</h2><ul>${authLinks}</ul>
<h2>Notification</h2><ul>${notifyLinks}</ul></body></html>`
writeFileSync(join(OUT, 'index.html'), index)
console.log(`\n→ ${join(OUT, 'index.html')}`)
