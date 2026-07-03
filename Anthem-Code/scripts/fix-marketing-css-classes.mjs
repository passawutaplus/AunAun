import fs from "node:fs";
import path from "node:path";

const root = path.resolve("f:/So1o/AunAun-fresh/Anthem-Code/src");
const reps = [
  ["kuy-chip-brand", "marketing-chip-brand"],
  ["kuy-chip-accent", "marketing-chip-accent"],
  ["kuy-nav-link-active", "marketing-nav-link-active"],
  ["kuy-nav-link", "marketing-nav-link"],
  ["kuy-callout-warn", "marketing-callout-warn"],
  ["kuy-danger-zone", "marketing-danger-zone"],
  ["kuy-module-tile", "marketing-module-tile"],
  ["kuy-section-label", "marketing-section-label"],
  ["kuy-row-hover", "marketing-row-hover"],
  ["kuy-btn-primary", "marketing-btn-primary"],
  ["kuy-tone-accent", "marketing-tone-accent"],
  ["kuy-tone-warn", "marketing-tone-warn"],
  ["kuy-tone-ok", "marketing-tone-ok"],
  ["kuy-pill-off", "marketing-pill-off"],
  ["kuy-pill-on", "marketing-pill-on"],
  ["kuy-control", "marketing-control"],
  ["kuy-callout", "marketing-callout"],
  ["kuy-input", "marketing-input"],
  ["kuy-card", "marketing-card"],
  ["kuy-hero", "marketing-hero"],
  ["kuy-chip", "marketing-chip"],
  ["kuy-nav", "marketing-nav"],
  ["kuy-link", "marketing-link"],
  ["kuy-radar", "marketing-module"],
  ['["kuy-radar"', '["marketing"'],
  ["kuyBusinessKey", "marketingBusinessKey"],
  ["kuy-radar-active-business", "marketing-active-business"],
  ["kuy-radar-ui-language", "marketing-ui-language"],
  ["aplus1-kuy-leads", "aplus1-marketing-leads"],
  ["kuy-report", "marketing-report"],
];

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== "node_modules") walk(p, acc);
    else if (/\.(tsx?|css|md)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

for (const file of walk(root)) {
  let text = fs.readFileSync(file, "utf8");
  let next = text;
  for (const [from, to] of reps) next = next.split(from).join(to);
  if (next !== text) fs.writeFileSync(file, next);
}
