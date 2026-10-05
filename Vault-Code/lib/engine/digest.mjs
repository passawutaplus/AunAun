/**
 * Weekly digest (phase 08). Template-based, no AI. DRY RUN ONLY: this module builds the email; nothing here sends it.
 * Sending needs the owner's approved provider + opt-in consent (phase 12). Every digest carries an unsubscribe link and
 * RFC 8058 one-click headers, and never contains an item that fails the licence gate.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { colorCloseness } from "./ranking.mjs";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------------------------------------------------------------- unsubscribe tokens (stateless, signed)
function secret() {
  return process.env.DIGEST_UNSUB_SECRET || process.env.VAULT_EXTENSION_TOKEN_SECRET || "";
}

export function signUnsubscribe(userId, key = secret()) {
  if (!key) throw new Error("Digest unsubscribe secret is not configured.");
  const sig = createHmac("sha256", key).update(`digest-unsub:${userId}`).digest("base64url").slice(0, 32);
  return `${userId}.${sig}`;
}

/** Returns the user id for a valid token, else null. Constant-time compare. */
export function verifyUnsubscribe(token, key = secret()) {
  const [userId, sig] = String(token || "").split(".");
  if (!key || !/^[0-9a-f-]{36}$/i.test(userId || "") || !sig) return null;
  const expected = createHmac("sha256", key).update(`digest-unsub:${userId}`).digest("base64url").slice(0, 32);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? userId : null;
}

// ---------------------------------------------------------------- profile + matching
/** Profile from a user's vault items: tag frequency (by analysis.tagIds) and a few favourite colours. Private data stays server-side. */
export function profileFromItems(items, { topTags = 12 } = {}) {
  const freq = new Map();
  const colors = new Map();
  for (const it of items || []) {
    for (const id of it.analysis?.tagIds || []) freq.set(id, (freq.get(id) || 0) + 1);
    for (const c of it.analysis?.colors || []) colors.set(c, (colors.get(c) || 0) + 1);
  }
  const tags = [...freq].sort((a, b) => b[1] - a[1]).slice(0, topTags).map(([id, n]) => ({ id, weight: n }));
  const palette = [...colors].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([hex]) => ({ hex, pct: 1 }));
  return { tags, palette, itemCount: (items || []).length };
}

const licenseOk = (item, cfg) => item.status === "published" && cfg.LICENSE_ALLOWLIST.includes(item.license);

/** Score a published item against a profile: weighted tag overlap, plus a little palette closeness. */
export function scoreForProfile(item, profile, cfg) {
  const have = new Set(item.tags_ids || []);
  const total = profile.tags.reduce((n, t) => n + t.weight, 0);
  if (!total) return { score: 0, why: [] };
  const hit = profile.tags.filter(t => have.has(t.id));
  const tagScore = hit.reduce((n, t) => n + t.weight, 0) / total;
  const paletteScore = profile.palette.length ? profile.palette.reduce((n, p) => n + colorCloseness(p.hex, item.palette || [], cfg), 0) / profile.palette.length : 0;
  return { score: 0.85 * tagScore + 0.15 * paletteScore, why: hit.slice(0, 3).map(t => t.id) };
}

/**
 * Builds one digest. Returns null when there is nothing worth sending (no profile, or no matching new items).
 * input: { user: { id, name }, profile, candidates: published items, pastPicks?: vault items, now, baseUrl, label(id), mediaUrl(path), unsubscribeToken }
 */
export function buildDigest(input, cfg, { maxItems = 6, minScore = 0.05 } = {}) {
  const { user, profile, candidates = [], pastPicks = [], baseUrl = "https://aplus-vault.vercel.app", label = id => id, mediaUrl = p => p, unsubscribeToken } = input;
  if (!profile?.tags?.length) return null;
  const scored = candidates
    .filter(c => licenseOk(c, cfg))
    .map(c => ({ c, ...scoreForProfile(c, profile, cfg) }))
    .filter(x => x.score >= minScore)
    .sort((a, b) => b.score - a.score);
  // Variety: at most 2 per category/source bucket in the first pass, then fill.
  const picked = [];
  const perBucket = new Map();
  for (const x of scored) {
    const key = `${x.c.category || "?"}|${x.c.source || "?"}`;
    if ((perBucket.get(key) || 0) >= 2) continue;
    perBucket.set(key, (perBucket.get(key) || 0) + 1);
    picked.push(x);
    if (picked.length >= maxItems) break;
  }
  for (const x of scored) if (picked.length < maxItems && !picked.includes(x)) picked.push(x);
  if (!picked.length) return null;

  const unsubscribeUrl = `${baseUrl}/api/unsubscribe?t=${encodeURIComponent(unsubscribeToken || "")}`;
  const items = picked.map(({ c, why }) => ({
    id: c.id,
    title: String(c.title || "Untitled").slice(0, 120),
    imageUrl: mediaUrl(c.image_md_path),
    url: `${baseUrl}/discover`,
    credit: String(c.attribution || "").slice(0, 200),
    reasons: why.map(label),
  }));
  const name = user?.name ? `${user.name}, ` : "";
  const subject = "A+ Vault: ภาพใหม่ที่ตรงกับสิ่งที่คุณเก็บ";
  const past = pastPicks.slice(0, 3).map(p => ({ title: String(p.title || "").slice(0, 80), url: `${baseUrl}/vault` }));
  const text = [
    `${name}ภาพใหม่ในสัปดาห์นี้ที่ใกล้กับสิ่งที่คุณเก็บไว้`,
    "",
    ...items.map(i => `- ${i.title}${i.reasons.length ? ` (${i.reasons.join(", ")})` : ""}\n  ${i.url}\n  เครดิต: ${i.credit}`),
    ...(past.length ? ["", "จากที่คุณเคยเก็บไว้:", ...past.map(p => `- ${p.title}`)] : []),
    "",
    "คุณได้รับอีเมลนี้เพราะเปิดรับสรุปรายสัปดาห์ไว้ ยกเลิกได้ทุกเมื่อ:",
    unsubscribeUrl,
  ].join("\n");
  const html = `<!doctype html><html lang="th"><body style="font-family:system-ui,sans-serif;color:#2f3133;max-width:560px;margin:auto"><h1 style="font-size:20px">${esc(name)}ภาพใหม่ที่ตรงกับสิ่งที่คุณเก็บ</h1>${items
    .map(i => `<div style="margin:18px 0"><a href="${esc(i.url)}"><img src="${esc(i.imageUrl)}" alt="${esc(i.title)}" width="520" style="max-width:100%;border-radius:8px"></a><p style="margin:6px 0 0"><strong>${esc(i.title)}</strong>${i.reasons.length ? `<br><span style="color:#747a80">${esc(i.reasons.join(" · "))}</span>` : ""}<br><small style="color:#747a80">${esc(i.credit)}</small></p></div>`)
    .join("")}${past.length ? `<h2 style="font-size:16px">จากที่คุณเคยเก็บไว้</h2><ul>${past.map(p => `<li>${esc(p.title)}</li>`).join("")}</ul>` : ""}<hr style="border:0;border-top:1px solid #e5e8eb"><p style="font-size:12px;color:#747a80">คุณได้รับอีเมลนี้เพราะเปิดรับสรุปรายสัปดาห์ไว้ <a href="${esc(unsubscribeUrl)}">ยกเลิกการรับ</a></p></body></html>`;
  return {
    to: user?.id || "",
    subject,
    items,
    text,
    html,
    unsubscribeUrl,
    headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    dryRun: true,
  };
}
