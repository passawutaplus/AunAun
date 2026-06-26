#!/usr/bin/env node
/** One-off: user-facing Pixel100/Anthem → Aplus1 in src (skips identifiers/contracts). */
import fs from "node:fs";
import path from "node:path";

const roots = ["Solo-Code/src", "Ops-Hub/src", "Anthem-Code/src"];
const skipRe =
  /\.(test|spec)\.|node_modules|ecosystemHandoff\.ts|ecosystemSync\.server|lineNotificationKinds|designDrillStorage|notifyAnthem|notifyAplus1/;

function shouldSkip(filePath, content, index) {
  const line = content.slice(0, index).split("\n").pop() ?? "";
  if (/import |from ['"]|schema\(|\.schema\(|notify-anthem|pixel100_referral|markDrillPosted|@demo\.pixel100|BRAND_ECOSYSTEM|openQuotationFromAnthem|anthem_hire|anthem_/.test(line)) {
    return true;
  }
  return false;
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(ent.name) && !skipRe.test(p)) {
      let c = fs.readFileSync(p, "utf8");
      const o = c;
      c = c.replace(/Pixel100/g, (m, off) => (shouldSkip(p, c, off) ? m : "Aplus1"));
      c = c.replace(/\bAnthem\b/g, (m, off) => (shouldSkip(p, c, off) ? m : "Aplus1"));
      if (c !== o) {
        fs.writeFileSync(p, c);
        console.log(p);
      }
    }
  }
}

for (const r of roots) {
  if (fs.existsSync(r)) walk(r);
}
