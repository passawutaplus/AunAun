/**
 * Generates flat PNG icons for 1PX email templates.
 * Run: node scripts/generate-email-icons.mjs
 */
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'email')
const ICONS = join(OUT, 'icons')

mkdirSync(ICONS, { recursive: true })

const ORANGE = '#FF4F18'
const INK = '#141517'
const BODY = '#4A4A4A'
const SUCCESS = '#059669'
const WARNING = '#DC2626'
const MUTE = '#9CA3AF'
const LINE_GREEN = '#06C755'

const icons = {
  payment: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <rect x="6" y="12" width="36" height="26" rx="4" fill="${ORANGE}" opacity="0.12"/>
    <rect x="6" y="12" width="36" height="26" rx="4" fill="none" stroke="${ORANGE}" stroke-width="2.5"/>
    <rect x="6" y="18" width="36" height="6" fill="${ORANGE}"/>
    <rect x="10" y="30" width="14" height="3" rx="1.5" fill="${INK}"/>
  </svg>`,
  celebration: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="18" fill="${ORANGE}" opacity="0.12"/>
    <path d="M24 10 L26 18 L34 18 L27.5 23 L30 31 L24 26 L18 31 L20.5 23 L14 18 L22 18 Z" fill="${ORANGE}"/>
  </svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <path d="M24 6 L42 38 H6 Z" fill="${WARNING}" opacity="0.12"/>
    <path d="M24 6 L42 38 H6 Z" fill="none" stroke="${WARNING}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="22" y="16" width="4" height="12" rx="2" fill="${WARNING}"/>
    <circle cx="24" cy="34" r="2.5" fill="${WARNING}"/>
  </svg>`,
  receipt: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <rect x="12" y="6" width="24" height="36" rx="3" fill="${BODY}" opacity="0.1"/>
    <rect x="12" y="6" width="24" height="36" rx="3" fill="none" stroke="${BODY}" stroke-width="2.5"/>
    <rect x="17" y="14" width="14" height="2.5" rx="1.25" fill="${BODY}"/>
    <rect x="17" y="21" width="10" height="2.5" rx="1.25" fill="${MUTE}"/>
    <rect x="17" y="28" width="12" height="2.5" rx="1.25" fill="${MUTE}"/>
    <rect x="17" y="35" width="8" height="2.5" rx="1.25" fill="${ORANGE}"/>
  </svg>`,
  credits: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="18" fill="${ORANGE}" opacity="0.12"/>
    <path d="M24 12 L28 22 L38 22 L30 28 L33 38 L24 32 L15 38 L18 28 L10 22 L20 22 Z" fill="${ORANGE}"/>
  </svg>`,
  bell: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <path d="M24 8 C17 8 14 14 14 20 V30 L10 34 H38 L34 30 V20 C34 14 31 8 24 8" fill="${ORANGE}" opacity="0.12"/>
    <path d="M24 8 C17 8 14 14 14 20 V30 L10 34 H38 L34 30 V20 C34 14 31 8 24 8" fill="none" stroke="${ORANGE}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M20 36 C20 38.2 21.8 40 24 40 C26.2 40 28 38.2 28 36" fill="none" stroke="${ORANGE}" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  document: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <rect x="14" y="6" width="24" height="36" rx="3" fill="${BODY}" opacity="0.1"/>
    <rect x="14" y="6" width="24" height="36" rx="3" fill="none" stroke="${BODY}" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="17" y="22" width="14" height="2.5" rx="1.25" fill="${ORANGE}"/>
    <rect x="17" y="29" width="10" height="2.5" rx="1.25" fill="${MUTE}"/>
  </svg>`,
  mail: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <rect x="6" y="12" width="36" height="24" rx="4" fill="${ORANGE}" opacity="0.12"/>
    <rect x="6" y="12" width="36" height="24" rx="4" fill="none" stroke="${ORANGE}" stroke-width="2.5"/>
    <path d="M6 16 L24 28 L42 16" fill="none" stroke="${ORANGE}" stroke-width="2.5" stroke-linejoin="round"/>
  </svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="18" fill="${SUCCESS}" opacity="0.12"/>
    <circle cx="24" cy="24" r="18" fill="none" stroke="${SUCCESS}" stroke-width="2.5"/>
    <path d="M16 24 L22 30 L34 18" fill="none" stroke="${SUCCESS}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  globe: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="18" fill="${MUTE}" opacity="0.12"/>
    <circle cx="24" cy="24" r="18" fill="none" stroke="${MUTE}" stroke-width="2.5"/>
    <ellipse cx="24" cy="24" rx="8" ry="18" fill="none" stroke="${MUTE}" stroke-width="2"/>
    <line x1="6" y1="24" x2="42" y2="24" stroke="${MUTE}" stroke-width="2"/>
  </svg>`,
  line: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <rect x="6" y="6" width="36" height="36" rx="10" fill="${LINE_GREEN}"/>
    <path d="M14 22 C14 22 18 30 24 30 C30 30 34 22 34 22 C34 22 30 18 24 18 C18 18 14 22 14 22" fill="white"/>
  </svg>`,
  cancel: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="18" fill="${BODY}" opacity="0.1"/>
    <circle cx="24" cy="24" r="18" fill="none" stroke="${BODY}" stroke-width="2.5"/>
    <path d="M18 18 L30 30 M30 18 L18 30" stroke="${BODY}" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  hire: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <rect x="10" y="14" width="28" height="22" rx="4" fill="${ORANGE}" opacity="0.12"/>
    <rect x="10" y="14" width="28" height="22" rx="4" fill="none" stroke="${ORANGE}" stroke-width="2.5"/>
    <rect x="16" y="10" width="16" height="8" rx="2" fill="none" stroke="${ORANGE}" stroke-width="2.5"/>
    <rect x="18" y="22" width="12" height="2.5" rx="1.25" fill="${INK}"/>
    <rect x="18" y="28" width="8" height="2.5" rx="1.25" fill="${MUTE}"/>
  </svg>`,
  chat: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <path d="M10 12 H38 A4 4 0 0 1 42 16 V28 A4 4 0 0 1 38 32 H22 L14 38 V32 H10 A4 4 0 0 1 6 28 V16 A4 4 0 0 1 10 12 Z" fill="${ORANGE}" opacity="0.12"/>
    <path d="M10 12 H38 A4 4 0 0 1 42 16 V28 A4 4 0 0 1 38 32 H22 L14 38 V32 H10 A4 4 0 0 1 6 28 V16 A4 4 0 0 1 10 12 Z" fill="none" stroke="${ORANGE}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="18" cy="22" r="2" fill="${ORANGE}"/>
    <circle cx="24" cy="22" r="2" fill="${ORANGE}"/>
    <circle cx="30" cy="22" r="2" fill="${ORANGE}"/>
  </svg>`,
  job: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="18" fill="${SUCCESS}" opacity="0.12"/>
    <circle cx="24" cy="24" r="18" fill="none" stroke="${SUCCESS}" stroke-width="2.5"/>
    <circle cx="24" cy="24" r="6" fill="none" stroke="${SUCCESS}" stroke-width="2.5"/>
    <circle cx="24" cy="24" r="2.5" fill="${SUCCESS}"/>
    <line x1="24" y1="6" x2="24" y2="12" stroke="${SUCCESS}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="24" y1="36" x2="24" y2="42" stroke="${SUCCESS}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="6" y1="24" x2="12" y2="24" stroke="${SUCCESS}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="36" y1="24" x2="42" y2="24" stroke="${SUCCESS}" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  collab: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <circle cx="18" cy="20" r="8" fill="${ORANGE}" opacity="0.12"/>
    <circle cx="30" cy="20" r="8" fill="${ORANGE}" opacity="0.12"/>
    <circle cx="18" cy="20" r="8" fill="none" stroke="${ORANGE}" stroke-width="2.5"/>
    <circle cx="30" cy="20" r="8" fill="none" stroke="${ORANGE}" stroke-width="2.5"/>
    <path d="M12 36 C12 30 15 28 18 28 C21 28 22 30 24 30 C26 30 27 28 30 28 C33 28 36 30 36 36" fill="none" stroke="${ORANGE}" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  gift: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <rect x="10" y="20" width="28" height="18" rx="3" fill="${SUCCESS}" opacity="0.12"/>
    <rect x="10" y="20" width="28" height="18" rx="3" fill="none" stroke="${SUCCESS}" stroke-width="2.5"/>
    <rect x="22" y="20" width="4" height="18" fill="${SUCCESS}"/>
    <rect x="10" y="14" width="28" height="8" rx="2" fill="none" stroke="${SUCCESS}" stroke-width="2.5"/>
    <path d="M24 14 C24 10 28 8 30 10 C32 12 24 14 24 14 M24 14 C24 10 20 8 18 10 C16 12 24 14 24 14" fill="none" stroke="${SUCCESS}" stroke-width="2"/>
  </svg>`,
  follow: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <circle cx="20" cy="18" r="7" fill="${ORANGE}" opacity="0.12"/>
    <circle cx="20" cy="18" r="7" fill="none" stroke="${ORANGE}" stroke-width="2.5"/>
    <path d="M10 38 C10 31 14 28 20 28 C26 28 30 31 30 38" fill="none" stroke="${ORANGE}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M32 16 L38 22 M38 16 L32 22" stroke="${ORANGE}" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  application: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <rect x="14" y="8" width="20" height="32" rx="3" fill="${ORANGE}" opacity="0.12"/>
    <rect x="14" y="8" width="20" height="32" rx="3" fill="none" stroke="${ORANGE}" stroke-width="2.5"/>
    <rect x="18" y="16" width="12" height="2.5" rx="1.25" fill="${INK}"/>
    <rect x="18" y="22" width="10" height="2.5" rx="1.25" fill="${MUTE}"/>
    <rect x="18" y="28" width="8" height="2.5" rx="1.25" fill="${MUTE}"/>
    <circle cx="32" cy="32" r="8" fill="${SUCCESS}" opacity="0.15"/>
    <path d="M29 32 L31 34 L35 30" fill="none" stroke="${SUCCESS}" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  topup: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="18" fill="${SUCCESS}" opacity="0.12"/>
    <circle cx="24" cy="24" r="18" fill="none" stroke="${SUCCESS}" stroke-width="2.5"/>
    <path d="M24 14 V34 M16 24 H32" stroke="${SUCCESS}" stroke-width="3" stroke-linecap="round"/>
  </svg>`,
  cashout: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <rect x="8" y="14" width="32" height="22" rx="4" fill="${ORANGE}" opacity="0.12"/>
    <rect x="8" y="14" width="32" height="22" rx="4" fill="none" stroke="${ORANGE}" stroke-width="2.5"/>
    <circle cx="24" cy="25" r="5" fill="none" stroke="${ORANGE}" stroke-width="2.5"/>
    <rect x="32" y="18" width="4" height="14" rx="1" fill="${ORANGE}"/>
  </svg>`,
}

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF6B35"/>
      <stop offset="100%" stop-color="#FF4F18"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#g)"/>
  <text x="32" y="38" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="white">1PX</text>
</svg>`

for (const [name, svg] of Object.entries(icons)) {
  await sharp(Buffer.from(svg)).resize(48, 48).png().toFile(join(ICONS, `${name}.png`))
  console.log(`  icons/${name}.png`)
}

await sharp(Buffer.from(logoSvg)).resize(64, 64).png().toFile(join(OUT, 'logo.png'))
console.log('  logo.png')
console.log('Done.')
