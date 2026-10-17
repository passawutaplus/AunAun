// Regenerate the Supabase Auth email templates from the shared email layout:
//   cd Anthem-Code && npx tsx ../Solo-Code/supabase/email-templates/build.mts
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

(globalThis as { Deno?: unknown }).Deno = { env: { get: () => undefined } };
const here = dirname(fileURLToPath(import.meta.url));
const { renderAuthEmailTemplate } = await import("../functions/_shared/anthem-email-html.ts");

const lines: string[] = [];
for (const kind of ["recovery", "confirmation", "magic_link"] as const) {
  const { subject, html } = renderAuthEmailTemplate(kind);
  writeFileSync(join(here, `${kind}.html`), html);
  lines.push(`| ${kind} | \`${kind}.html\` | ${subject} |`);
}
console.log(lines.join("\n"));
