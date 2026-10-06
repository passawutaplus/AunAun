import { esc, escA } from "./utils.js";

/**
 * "For You" cards for My Vault. Plain rules over local data (no AI, works offline): what is waiting, what a project still lacks,
 * the week's palette. Cards the person hides stay hidden for 7 days.
 */
export const HIDE_DAYS = 7;
const DAY = 86400000;
const MAX_CARDS = 5;

/** { cardId: untilTimestamp } -> only entries still hidden. */
export function activeHidden(raw, now = Date.now()) {
  const out = {};
  if (raw && typeof raw === "object") for (const [k, v] of Object.entries(raw)) if (Number(v) > now) out[k] = Number(v);
  return out;
}

export const hideUntil = (now = Date.now()) => now + HIDE_DAYS * DAY;

const hasImage = i => i && (i.thumbnailUrl || i.previewUrl || i.assetUrl);
const creators = i => ((i.captureContext || {}).credit || {}).creators;

function projectItems(project, items) {
  return items.filter(i => (i.projectIds || []).includes(project.id));
}

/**
 * One card per project at most, first rule that fits:
 *  1. 5+ images but no saved palette
 *  2. things kept for this project (keptFor.projectId) that are not in it yet
 *  3. items from the web / Museum without a named creator (check before export)
 *  4. nothing touched for 30 days
 */
export function projectGapCard(project, items, now = Date.now()) {
  const inProject = projectItems(project, items);
  const images = inProject.filter(i => i.type === "image" && hasImage(i));
  if (images.length >= 5 && !(Array.isArray(project.palette) && project.palette.length)) {
    return { id: `proj-palette:${project.id}`, kind: "project", projectId: project.id, title: `${project.name} has ${images.length} images and no palette`, body: "Pull one palette from them and keep it with the project.", action: { type: "project-palette", label: "Make a palette" }, previews: images.slice(0, 4) };
  }
  const keptFor = items.filter(i => ((i.captureContext || {}).keptFor || {}).projectId === project.id && !(i.projectIds || []).includes(project.id));
  if (keptFor.length) {
    return { id: `proj-kept:${project.id}`, kind: "project", projectId: project.id, title: `${keptFor.length} thing${keptFor.length === 1 ? "" : "s"} kept for ${project.name} ${keptFor.length === 1 ? "is" : "are"} not in it yet`, body: "Add them so they travel with the project.", action: { type: "project-add", label: "Add them" }, itemIds: keptFor.map(i => i.id), previews: keptFor.filter(hasImage).slice(0, 4) };
  }
  const uncredited = inProject.filter(i => {
    const o = (i.captureContext || {}).origin;
    const fromElsewhere = o ? o !== "upload" : !!i.sourceUrl && !/^upload:/.test(i.sourceUrl);
    const c = creators(i);
    return fromElsewhere && !(Array.isArray(c) && c.filter(Boolean).length);
  });
  if (uncredited.length >= 3) {
    return { id: `proj-credit:${project.id}`, kind: "project", projectId: project.id, title: `${project.name}: ${uncredited.length} items without a named creator`, body: "Check the source before you export or show a client.", action: { type: "project-open", label: "Open project" }, previews: uncredited.filter(hasImage).slice(0, 4) };
  }
  const stamps = inProject.map(i => Number(i.createdAt) || 0).concat(Number(project.updatedAt) || 0, Number(project.createdAt) || 0).filter(Boolean);
  if (stamps.length && inProject.length && now - Math.max(...stamps) > 30 * DAY) {
    return { id: `proj-stale:${project.id}`, kind: "project", projectId: project.id, title: `${project.name} has been quiet for a month`, body: "Open it, or let it rest.", action: { type: "project-open", label: "Open project" }, previews: inProject.filter(hasImage).slice(0, 4) };
  }
  return null;
}

/** Merge near-identical colors and keep the 5 that cover the most of this week's keeps. */
export function weeklyPalette(items, now = Date.now(), distance) {
  const week = items.filter(i => now - (Number(i.createdAt) || 0) <= 7 * DAY && i.type === "image");
  if (week.length < 3) return null;
  const bins = [];
  for (const item of week) {
    const rich = (item.analysis && item.analysis.palette) || [];
    const list = rich.length ? rich.map(p => ({ hex: String(p.hex || "").toLowerCase(), w: Number(p.pct) || 1 })) : ((item.analysis && item.analysis.colors) || []).map(h => ({ hex: String(h).toLowerCase(), w: 1 }));
    for (const c of list) {
      if (!/^#[0-9a-f]{6}$/.test(c.hex)) continue;
      const near = bins.find(b => distance(b.hex, c.hex) <= 36);
      if (near) near.w += c.w;
      else bins.push({ hex: c.hex, w: c.w });
    }
  }
  const top = bins.sort((a, b) => b.w - a.w).slice(0, 5);
  return top.length >= 3 ? { hexes: top.map(b => b.hex), count: week.length } : null;
}

/**
 * Cards in order: Inbox, projects, weekly palette. (Top of Mind and "From your past" are drawn by the app itself.)
 * ctx: { items, projects, hidden, now, isInbox, distance }
 */
export function buildForYouCards(ctx) {
  const now = ctx.now || Date.now();
  const hidden = activeHidden(ctx.hidden, now);
  const cards = [];
  const waiting = ctx.items.filter(ctx.isInbox);
  if (waiting.length) cards.push({ id: "inbox", kind: "inbox", title: `${waiting.length} waiting in your Inbox`, body: "Keep, file or drop them while you still remember why.", action: { type: "inbox", label: "Sort now" }, previews: waiting.filter(hasImage).slice(0, 6) });
  for (const project of ctx.projects || []) {
    const card = projectGapCard(project, ctx.items, now);
    if (card) cards.push(card);
  }
  const palette = weeklyPalette(ctx.items, now, ctx.distance);
  if (palette) cards.push({ id: "week-palette", kind: "palette", title: "Your week in color", body: `From ${palette.count} things you kept in the last 7 days.`, palette: palette.hexes, action: { type: "palette-find", label: "Find in Vault" } });
  return cards.filter(c => !hidden[c.id]).slice(0, MAX_CARDS);
}

const mediaOf = i => i.thumbnailUrl || i.previewUrl || i.assetUrl || "";

export function forYouCardMarkup(card) {
  const previews = (card.previews || []).map(i => `<span class='fy-thumb'><img src='${escA(mediaOf(i))}' alt='' loading='lazy' referrerpolicy='no-referrer'></span>`).join("");
  const swatches = card.palette ? `<div class='fy-palette'>${card.palette.map(h => `<button type='button' class='fy-swatch' style='background:${escA(h)}' data-fy-copy='${escA(h)}' title='${escA(h)}' aria-label='Copy ${escA(h)}'></button>`).join("")}</div>` : "";
  return `<article class='fy-card is-${escA(card.kind)}' data-fy-card='${escA(card.id)}'><div class='fy-main'><h3>${esc(card.title)}</h3><p>${esc(card.body)}</p>${swatches}${previews ? `<div class='fy-thumbs'>${previews}</div>` : ""}</div><div class='fy-actions'><button type='button' class='primary-button small' data-fy-action='${escA(card.action.type)}' data-fy-card-id='${escA(card.id)}'>${esc(card.action.label)}</button><button type='button' class='ghost-button small' data-fy-hide='${escA(card.id)}' title='Hide for ${HIDE_DAYS} days'>Hide ${HIDE_DAYS} days</button></div></article>`;
}

export function forYouEmptyMarkup() {
  return `<section class='empty-state fy-empty'><div><h2>Nothing needs you today.</h2><p>Keep something new, or look around the Museum for a spark.</p><button class='primary-button' data-open>Keep something</button> <button class='ghost-button' data-view='discover'>Open the Museum</button></div></section>`;
}
