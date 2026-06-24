/**
 * Generates flat PNG icons for email templates.
 * Run: node scripts/generate-email-icons.mjs
 */
import { mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "email");
const ICONS = join(OUT, "icons");

mkdirSync(ICONS, { recursive: true });

const ORANGE = "#FF5F05";
const INK = "#0F0F0F";
const BODY = "#4A4A4A";
const SUCCESS = "#059669";
const WARNING = "#DC2626";
const MUTE = "#9CA3AF";
const LINE_GREEN = "#06C755";

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
    <path d="M14 6 H28 L36 14 V40 C36 41.1 35.1 42 34 42 H14 C12.9 42 12 41.1 12 40 V8 C12 6.9 12.9 6 14 6" fill="${BODY}" opacity="0.1"/>
    <path d="M14 6 H28 L36 14 V40 C36 41.1 35.1 42 34 42 H14 C12.9 42 12 41.1 12 40 V8 C12 6.9 12.9 6 14 6" fill="none" stroke="${BODY}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M28 6 V14 H36" fill="none" stroke="${BODY}" stroke-width="2.5" stroke-linejoin="round"/>
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
};

for (const [name, svg] of Object.entries(icons)) {
  const buf = Buffer.from(svg);
  await sharp(buf)
    .resize(48, 48)
    .png()
    .toFile(join(ICONS, `${name}.png`));
  console.log(`  icons/${name}.png`);
}

// Logo: copy existing mark
copyFileSync(join(__dirname, "..", "src", "assets", "so1o-logo-mark.png"), join(OUT, "logo.png"));
console.log("  logo.png");
console.log("Done.");
