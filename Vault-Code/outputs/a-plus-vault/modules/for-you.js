import { esc, escA } from "./utils.js";

/**
 * "For You" dashboard for My Vault. Plain rules over local data (no AI, no API, works offline): what needs you, the week in color,
 * what was kept lately, your spaces. A row the person skips stays hidden for 7 days and the items are never touched.
 */
export const HIDE_DAYS = 7;
const DAY = 86400000;
/** The unsorted card only counts things kept recently. */
export const UNSORTED_DAYS = 14;

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

export const NEEDS_MAX = 3;
const DAYS_ACTIVE = 30;
const mediaOf = i => i.thumbnailUrl || i.previewUrl || i.assetUrl || "";

/** Most recent sign of life in a project: its own update, or the newest item in it. */
export function projectRecency(project, items) {
  const stamps = projectItems(project, items).map(i => Number(i.createdAt) || 0).concat(Number(project.updatedAt) || 0, Number(project.createdAt) || 0);
  return Math.max(0, ...stamps);
}

/**
 * Rows for the "Needs you" card: unsorted things first, then project gaps (most recently updated project first). Skipped rows are
 * left out before the cap, so skipping one brings the next up. ctx: { items, projects, hidden, now, isUnsorted }
 */
export function needsYouRows(ctx) {
  const now = ctx.now || Date.now();
  const hidden = activeHidden(ctx.hidden, now);
  const rows = [];
  const waiting = ctx.items.filter(i => ctx.isUnsorted(i) && now - (Number(i.createdAt) || 0) <= UNSORTED_DAYS * DAY);
  if (waiting.length) {
    rows.push({ id: "unsorted", kind: "unsorted", title: `${waiting.length} thing${waiting.length === 1 ? "" : "s"} still unsorted`, th: `ยังไม่จัด ${waiting.length} ชิ้น`, body: `Kept without a collection in the last ${UNSORTED_DAYS} days.`, action: { type: "unsorted", label: "Sort now" }, hideLabel: "Skip for now", previews: waiting.filter(hasImage).slice(0, 3) });
  }
  const byRecency = (ctx.projects || []).slice().sort((a, b) => projectRecency(b, ctx.items) - projectRecency(a, ctx.items));
  for (const project of byRecency) {
    const card = projectGapCard(project, ctx.items, now);
    if (card) rows.push({ ...card, hideLabel: "Skip for now", previews: (card.previews || []).slice(0, 3) });
  }
  return rows.filter(r => !hidden[r.id]).slice(0, NEEDS_MAX);
}

const WEEK_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * The week in color. null when nothing was kept in the last 7 days. `palette` is null when there are too few images for one
 * (the bars still show). Bars count keeps per day for the calendar week, Monday to Sunday; `today` marks the current day.
 */
export function weekInColor(items, now = Date.now(), distance) {
  const last7 = items.filter(i => now - (Number(i.createdAt) || 0) <= 7 * DAY && now - (Number(i.createdAt) || 0) >= 0);
  if (!last7.length) return null;
  const d = new Date(now);
  const dow = (d.getDay() + 6) % 7;
  const bars = WEEK_LABELS.map((label, i) => {
    const from = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow + i).getTime();
    const to = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow + i + 1).getTime();
    return { label, count: items.filter(it => (Number(it.createdAt) || 0) >= from && (Number(it.createdAt) || 0) < to).length, today: i === dow };
  });
  const pal = weeklyPalette(items, now, distance);
  return { total: last7.length, palette: pal ? pal.hexes : null, bars, max: Math.max(1, ...bars.map(b => b.count)) };
}

/** The last n kept items that have a picture (no text-only placeholders). */
export function recentStrip(items, n = 6) {
  return items.filter(hasImage).sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)).slice(0, n);
}

export function relativeDay(ts, now = Date.now()) {
  const days = Math.floor((now - ts) / DAY);
  if (!ts || days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Compact lists for "Your spaces": at most 3 collections and 3 projects, most recently updated first, with totals.
 * { collections: [{id,name}], projects, items, itemsIn(collectionId) -> items, now }
 */
export function spaceLists({ collections = [], projects = [], items = [], itemsIn = () => [], now = Date.now() }) {
  const newest = list => list.slice().sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  const colRows = collections.map(c => {
    const list = newest(itemsIn(c.id) || []);
    const updatedAt = list.length ? Number(list[0].createdAt) || 0 : 0;
    return { id: c.id, name: c.name, count: list.length, updatedAt, thumb: list.find(hasImage) || null, meta: `${plural(list.length, "item")}${updatedAt ? ` · updated ${relativeDay(updatedAt, now)}` : ""}` };
  }).sort((a, b) => b.updatedAt - a.updatedAt);
  const projRows = projects.map(p => {
    const list = newest(projectItems(p, items));
    const updatedAt = projectRecency(p, items);
    const needsPalette = list.filter(i => i.type === "image" && hasImage(i)).length >= 5 && !(Array.isArray(p.palette) && p.palette.length);
    const active = updatedAt && now - updatedAt <= DAYS_ACTIVE * DAY;
    const meta = needsPalette ? "Needs a palette" : !list.length ? "No items yet" : `${plural(list.length, "item")} · ${active ? "active" : "quiet"}`;
    return { id: p.id, name: p.name, count: list.length, updatedAt, thumb: list.find(hasImage) || null, needsPalette, meta };
  }).sort((a, b) => b.updatedAt - a.updatedAt);
  return { collections: { total: colRows.length, rows: colRows.slice(0, 3) }, projects: { total: projRows.length, rows: projRows.slice(0, 3), needPalette: projRows.filter(r => r.needsPalette).length } };
}

const ORIGIN_CHIP = { web: "Web", upload: "Upload", museum: "Museum" };

/** "Tuesday 6 Oct · 6 kept · 3 collections · 3 projects": the date is localized by the caller. */
export function summaryParts({ items = [], collections = [], projects = [] }) {
  return { kept: items.length, collections: collections.length, projects: projects.length };
}

export function summaryMarkup(dateLabel, parts) {
  return `<p class='fy-summary'>${esc(dateLabel)} · <b>${parts.kept} kept</b> · ${plural(parts.collections, "collection")} · ${plural(parts.projects, "project")}</p>`;
}

const img = i => `<img src='${escA(mediaOf(i))}' alt='' loading='lazy' decoding='async' referrerpolicy='no-referrer'>`;

export function needsYouMarkup(rows) {
  if (!rows.length) return "";
  const body = rows.map(r => `<div class='fy-row' data-fy-row='${escA(r.id)}'>
    <div class='fy-thumbs' aria-hidden='true'>${(r.previews || []).map(i => `<span class='fy-thumb'>${img(i)}</span>`).join("")}</div>
    <div class='fy-row-text'><strong>${esc(r.title)}</strong>${r.th ? `<small class='fy-th'>${esc(r.th)}</small>` : ""}<span>${esc(r.body)}</span></div>
    <div class='fy-row-actions'><button type='button' class='fy-primary' data-fy-action='${escA(r.action.type)}' data-fy-card-id='${escA(r.id)}'>${esc(r.action.label)}</button><button type='button' class='fy-ghost' data-fy-hide='${escA(r.id)}' title='Hide for ${HIDE_DAYS} days. Nothing is changed.'>${esc(r.hideLabel || "Skip for now")}</button></div>
  </div>`).join("");
  return `<section class='fy-card fy-needs' aria-labelledby='fy-needs-title'><div class='fy-card-head'><h2 id='fy-needs-title'>Needs you</h2><span class='fy-muted'>${plural(rows.length, "thing")}, about a minute each</span></div>${body}</section>`;
}

export function weekMarkup(week) {
  if (!week) return "";
  const palette = week.palette
    ? `<div class='fy-palette-col'><div class='fy-palette-bar'>${week.palette.map(h => `<button type='button' class='fy-swatch' style='background:${escA(h)}' data-fy-copy='${escA(h)}' aria-label='Copy ${escA(h)}'></button>`).join("")}</div><div class='fy-hexes'>${week.palette.map(h => `<span>${esc(h)}</span>`).join("")}</div></div>`
    : "";
  const bars = `<div class='fy-bars-col'><div class='fy-bars' role='img' aria-label='Keeps per day this week'>${week.bars.map(b => `<i class='fy-bar${b.today ? " is-today" : ""}' style='height:${Math.max(4, Math.round((b.count / week.max) * 64))}px' title='${b.count}'></i>`).join("")}</div><div class='fy-bar-labels'>${week.bars.map(b => `<span>${esc(b.label)}</span>`).join("")}</div></div>`;
  const buttons = week.palette ? `<div class='fy-week-buttons'><button type='button' class='fy-secondary' data-fy-tokens>Copy as tokens</button><button type='button' class='fy-secondary' data-fy-action='palette-find' data-fy-card-id='week-palette'>Find in Vault</button></div>` : "<span></span>";
  return `<section class='fy-card fy-week' aria-labelledby='fy-week-title'><div class='fy-card-head'><h2 id='fy-week-title'>Your week in color</h2><span class='fy-muted'>From ${plural(week.total, "thing")} kept in the last 7 days</span></div><div class='fy-week-body${week.palette ? "" : " bars-only"}'>${palette}${bars}</div><div class='fy-week-foot'>${buttons}<button type='button' class='fy-link' data-fy-year>Your year in keeps →</button></div></section>`;
}

/** `list` items carry `_origin` (web / upload / museum), set by the caller. */
export function recentMarkup(list) {
  if (!list.length) return "";
  return `<section class='fy-recent' aria-labelledby='fy-recent-title'><div class='fy-card-head'><h2 id='fy-recent-title'>Recently kept</h2><button type='button' class='fy-link' data-fy-go='library'>Open Library →</button></div><div class='fy-tiles'>${list.map(i => `<button type='button' class='fy-tile' data-resurface='${escA(i.id)}'><span class='fy-tile-media'>${img(i)}<span class='fy-origin'>${esc(ORIGIN_CHIP[i._origin] || "")}</span></span><span class='fy-tile-title'>${esc(i.title)}</span></button>`).join("")}</div></section>`;
}

function spaceRow(r, attr) {
  return `<button type='button' class='fy-space-row' ${attr(r)}><span class='fy-space-thumb'>${r.thumb ? img(r.thumb) : ""}</span><span class='fy-space-text'><strong>${esc(r.name)}</strong><small>${esc(r.meta)}</small></span></button>`;
}

/** `boards` = number of moodboards (phone row). Desktop shows compact lists, phone shows three summary rows. */
export function spacesMarkup(spaces, boards = 0) {
  const { collections, projects } = spaces;
  if (!collections.total && !projects.total && !boards) return "";
  const list = (label, group, attr) => group.total ? `<div class='fy-space-group'><div class='fy-space-label'><span>${label}</span><span>${group.total}</span></div>${group.rows.map(r => spaceRow(r, attr)).join("")}</div>` : "";
  const lists = `<div class='fy-spaces-lists'>${list("Collections", collections, r => `data-col='${escA(r.id)}'`)}${list("Projects", projects, r => `data-fy-project='${escA(r.id)}'`)}</div>`;
  const chevron = "<svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M9 6l6 6-6 6'/></svg>";
  const phoneRow = (label, meta, view, a, b) => `<button type='button' class='fy-phone-row' data-view='${view}'><span class='fy-stack'><span class='fy-space-thumb'>${a ? img(a) : ""}</span><span class='fy-space-thumb'>${b ? img(b) : ""}</span></span><span class='fy-space-text'><strong>${label}</strong><small>${esc(meta)}</small></span>${chevron}</button>`;
  const thumbsOf = g => g.rows.map(r => r.thumb);
  const colMeta = collections.total ? `${collections.total} · ${collections.rows[0].name}${collections.total > 1 ? ` and ${collections.total - 1} more` : ""}` : "None yet";
  const projMeta = projects.total ? `${projects.total}${projects.needPalette ? ` · ${projects.needPalette} needs a palette` : ""}` : "None yet";
  const rows = `<div class='fy-spaces-rows'>${phoneRow("Collections", colMeta, "collections", thumbsOf(collections)[0], thumbsOf(collections)[1])}${phoneRow("Projects", projMeta, "projects", thumbsOf(projects)[0], thumbsOf(projects)[1])}${phoneRow("Moodboards", boards ? plural(boards, "board") : "Open your boards", "moodboards", null, null)}</div>`;
  return `<section class='fy-card fy-spaces' aria-labelledby='fy-spaces-title'><div class='fy-card-head'><h2 id='fy-spaces-title'>Your spaces</h2></div>${lists}${rows}</section>`;
}

export const TOP_OF_MIND_SLOTS = 5;

export function topOfMindMarkup(pins) {
  const slots = Array.from({ length: Math.max(0, TOP_OF_MIND_SLOTS - pins.length) }, () => "<span class='fy-slot' aria-hidden='true'></span>").join("");
  return `<section class='fy-card fy-tom' aria-labelledby='fy-tom-title'><div class='fy-card-head'><h2 id='fy-tom-title'>Top of Mind</h2></div>${pins.length ? "" : "<p class='fy-muted'>Pin up to five things you are working with right now.</p>"}<div class='fy-tom-grid'>${pins.map(i => `<button type='button' class='fy-tom-item' data-resurface='${escA(i.id)}' title='${escA(i.title)}'>${img(i)}</button>`).join("")}${slots}</div></section>`;
}

export function forYouEmptyMarkup() {
  return `<section class='empty-state fy-empty'><div><h2>Nothing needs you today.</h2><p>Keep something new, or look around the Museum for a spark.</p><button class='primary-button' data-open>Keep something</button> <button class='ghost-button' data-view='discover'>Open the Museum</button></div></section>`;
}
