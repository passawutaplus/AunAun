export function computeDashboardStats(state, helpers) {
  const { storageBreakdown, formatBytes } = helpers;
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const savedThisWeek = state.items.filter((i) => now - (Number(i.createdAt) || 0) <= weekMs).length;
  const customCollections = state.cols.filter((c) => !c.system).length;
  const storage = storageBreakdown();
  return {
    total: state.items.length,
    savedThisWeek,
    collections: customCollections,
    projects: state.projects.length,
    storage,
    storageLabel: formatBytes(storage.total),
    hasExtensionToken: !!(helpers.getVaultApiToken && helpers.getVaultApiToken()),
  };
}

export function settingsOverviewMarkup(stats, helpers) {
  const { esc, icon, formatBytes } = helpers;
  const extensionStatus = stats.hasExtensionToken
    ? "<span class='dashboard-status ok'>Extension token ready</span>"
    : "<span class='dashboard-status warn'>Log in to generate extension token</span>";
  return `<article class='settings-card settings-overview-card'><div class='settings-card-head'><h2>Overview</h2><p>Your Vault at a glance — references, activity, and quick actions.</p></div><div class='dashboard-stat-grid'><article class='dashboard-stat'><strong>${stats.total}</strong><span>References</span></article><article class='dashboard-stat'><strong>${stats.savedThisWeek}</strong><span>Saved this week</span></article><article class='dashboard-stat'><strong>${stats.collections}</strong><span>Collections</span></article><article class='dashboard-stat'><strong>${stats.projects}</strong><span>Projects</span></article></div><div class='dashboard-storage-row'><span>Storage</span><strong>${esc(stats.storageLabel)}</strong><small>of ${formatBytes(stats.storage.limit)} used</small></div>${extensionStatus}<div class='dashboard-quick-actions'><button type='button' class='ghost-button' data-view='vault'>${icon("vault")}<span>Open Vault Library</span></button><button type='button' class='ghost-button' data-copy-extension-token>${icon("import")}<span>Copy extension token</span></button><button type='button' class='ghost-button' data-newcol>${icon("collection")}<span>New collection</span></button><button type='button' class='ghost-button' data-newproject>${icon("project")}<span>New project</span></button></div></article>`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function dayKeyFromDate(d) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDayKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatShortDate(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMonthName(d) {
  return d.toLocaleDateString("en-US", { month: "long" });
}

/** Build 52-week keep activity from item createdAt timestamps. */
export function computeKeepActivity(items, nowDate) {
  const now = startOfLocalDay(nowDate || new Date());
  const counts = Object.create(null);
  (items || []).forEach((item) => {
    const t = Number(item && item.createdAt) || 0;
    if (!t) return;
    const key = dayKeyFromDate(new Date(t));
    counts[key] = (counts[key] || 0) + 1;
  });

  // Align grid to weeks starting Sunday (like contribution graphs)
  const end = new Date(now);
  const endDow = end.getDay(); // 0=Sun
  // show through today; weeks = 53 columns ending this week
  const weeks = 53;
  const days = [];
  const gridEnd = new Date(end);
  // last cell of grid = end of this week (Saturday) or today—fill remaining week with future empty
  const lastSaturday = new Date(end);
  lastSaturday.setDate(end.getDate() + (6 - endDow));
  const totalCells = weeks * 7;
  const first = new Date(lastSaturday);
  first.setDate(lastSaturday.getDate() - (totalCells - 1));

  for (let i = 0; i < totalCells; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    const key = dayKeyFromDate(d);
    const future = d.getTime() > now.getTime();
    const count = future ? 0 : counts[key] || 0;
    days.push({
      key,
      date: d,
      count,
      future,
      inRange: !future,
    });
  }

  const total = (items || []).length;
  let maxCount = 0;
  days.forEach((d) => {
    if (d.count > maxCount) maxCount = d.count;
  });

  // Monthly peaks
  const monthTotals = Object.create(null);
  days.forEach((d) => {
    if (!d.count) return;
    const mk = d.date.getFullYear() + "-" + pad2(d.date.getMonth() + 1);
    monthTotals[mk] = (monthTotals[mk] || 0) + d.count;
  });
  let mostActiveMonthKey = "";
  let mostActiveMonthCount = 0;
  Object.keys(monthTotals).forEach((mk) => {
    if (monthTotals[mk] > mostActiveMonthCount) {
      mostActiveMonthCount = monthTotals[mk];
      mostActiveMonthKey = mk;
    }
  });

  let mostActiveDay = null;
  days.forEach((d) => {
    if (!mostActiveDay || d.count > mostActiveDay.count) mostActiveDay = d;
  });
  if (mostActiveDay && mostActiveDay.count === 0) mostActiveDay = null;

  // Streaks: consecutive days with count > 0 ending at today, and longest in range
  let currentStreak = 0;
  let cursor = new Date(now);
  while (true) {
    const key = dayKeyFromDate(cursor);
    if ((counts[key] || 0) > 0) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  let longestStreak = 0;
  let run = 0;
  const sortedKeys = Object.keys(counts).sort();
  let prev = null;
  sortedKeys.forEach((key) => {
    if ((counts[key] || 0) <= 0) return;
    if (prev) {
      const prevDate = parseDayKey(prev);
      const curDate = parseDayKey(key);
      const diff = (curDate - prevDate) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    prev = key;
    if (run > longestStreak) longestStreak = run;
  });
  if (currentStreak > longestStreak) longestStreak = currentStreak;

  const monthLabels = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const cell = days[w * 7];
    const m = cell.date.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        week: w,
        label: cell.date.toLocaleDateString("en-US", { month: "short" }).charAt(0),
        title: cell.date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      });
      lastMonth = m;
    }
  }

  let mostActiveMonthLabel = "—";
  if (mostActiveMonthKey) {
    const [y, m] = mostActiveMonthKey.split("-").map(Number);
    mostActiveMonthLabel = formatMonthName(new Date(y, m - 1, 1));
  }

  return {
    total,
    maxCount,
    days,
    weeks,
    monthLabels,
    mostActiveMonth: mostActiveMonthLabel,
    mostActiveDay: mostActiveDay ? formatShortDate(mostActiveDay.date) : "—",
    longestStreak,
    currentStreak,
  };
}

function keepLevel(count, maxCount) {
  if (!count) return 0;
  if (maxCount <= 1) return 3;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/** GitHub-style keep heatmap for Profile. */
export function keepActivityMarkup(activity, helpers) {
  const { esc } = helpers;
  const weeks = activity.weeks || 53;
  const days = activity.days || [];
  const maxCount = activity.maxCount || 0;

  const monthRow = Array.from({ length: weeks }, (_, w) => {
    const hit = (activity.monthLabels || []).find((m) => m.week === w);
    return hit
      ? `<span class='keep-month' title='${esc(hit.title)}'>${esc(hit.label)}</span>`
      : `<span class='keep-month is-empty' aria-hidden='true'></span>`;
  }).join("");

  const dayLabels = ["", "M", "", "W", "", "F", ""];
  const labelCol = dayLabels
    .map((lab) => (lab ? `<span class='keep-dow'>${esc(lab)}</span>` : `<span class='keep-dow is-empty' aria-hidden='true'></span>`))
    .join("");

  let cells = "";
  for (let w = 0; w < weeks; w++) {
    cells += "<div class='keep-week'>";
    for (let d = 0; d < 7; d++) {
      const cell = days[w * 7 + d];
      if (!cell) {
        cells += "<span class='keep-cell level-0' aria-hidden='true'></span>";
        continue;
      }
      const level = cell.future ? -1 : keepLevel(cell.count, maxCount);
      const title = cell.future
        ? ""
        : `${cell.count} keep${cell.count === 1 ? "" : "s"} · ${formatShortDate(cell.date)}`;
      const levelClass = level < 0 ? "is-future" : "level-" + level;
      cells += `<span class='keep-cell ${levelClass}' title='${esc(title)}' data-count='${cell.count}'></span>`;
    }
    cells += "</div>";
  }

  const totalLabel = Number(activity.total || 0).toLocaleString("en-US");

  return `<article class='profile-studio-card keep-activity-card'>
    <div class='keep-activity-head'>
      <strong class='keep-activity-total'>${esc(totalLabel)}</strong>
      <span class='keep-activity-kind'>Keeps</span>
    </div>
    <div class='keep-activity-grid' role='img' aria-label='Keep activity over the past year'>
      <div class='keep-months'>${monthRow}</div>
      <div class='keep-body'>
        <div class='keep-dows'>${labelCol}</div>
        <div class='keep-weeks'>${cells}</div>
      </div>
    </div>
    <div class='keep-activity-stats'>
      <div><span>Most Active Month</span><strong>${esc(activity.mostActiveMonth || "—")}</strong></div>
      <div><span>Most Active Day</span><strong>${esc(activity.mostActiveDay || "—")}</strong></div>
      <div><span>Longest Streak</span><strong>${esc(String(activity.longestStreak || 0))}d</strong></div>
      <div><span>Current Streak</span><strong>${esc(String(activity.currentStreak || 0))}d</strong></div>
    </div>
    <div class='keep-legend' aria-hidden='true'><span>Less</span><i class='keep-cell level-0'></i><i class='keep-cell level-1'></i><i class='keep-cell level-2'></i><i class='keep-cell level-3'></i><i class='keep-cell level-4'></i><span>More</span></div>
  </article>`;
}

/** Recent reference tiles for Profile studio right rail (2×2). */
export function profileRecentMarkup(items, helpers) {
  const { esc, escA, media, typeLabel } = helpers;
  const recent = (items || [])
    .slice()
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
    .slice(0, 4);

  if (!recent.length) {
    return `<div class='profile-recent-grid is-empty'><div class='profile-recent-empty'><span class='profile-recent-star' aria-hidden='true'>★</span><strong>No references yet</strong><p>Save images, links, or notes to fill this grid.</p><button type='button' class='ghost-button' data-view='vault'>Open Vault</button></div></div>`;
  }

  const tiles = recent
    .map((i) => {
      const label = typeLabel ? typeLabel(i.type) : i.type || "object";
      return `<button type='button' class='profile-recent-tile' data-open-profile-item='${escA(i.id)}' title='${escA(i.title || "Open")}'><span class='profile-recent-media'>${media(i)}</span><span class='profile-recent-meta'><span class='profile-recent-pill'>${esc(label)}</span></span></button>`;
    })
    .join("");

  const pads = Math.max(0, 4 - recent.length);
  const padHtml = Array.from({ length: pads })
    .map(() => `<div class='profile-recent-tile is-placeholder' aria-hidden='true'><span class='profile-recent-star'>★</span><span>Open slot</span></div>`)
    .join("");

  return `<div class='profile-recent-grid'>${tiles}${padHtml}</div>`;
}

/** Collections showcase card — stacked thumbs + count badge. */
export function profileCollectionsCardMarkup(cols, items, helpers) {
  const { esc, media, itemsForCollection } = helpers;
  const custom = (cols || []).filter((c) => !c.system);
  const count = custom.length;
  const thumbs = [];

  custom.slice(0, 6).forEach((c) => {
    const colItems = itemsForCollection
      ? itemsForCollection(c.id)
      : (items || []).filter((i) => (i.collectionIds || []).includes(c.id));
    const first = colItems[0];
    if (first) thumbs.push(`<span class='profile-collection-thumb'>${media(first)}</span>`);
  });

  if (!thumbs.length) {
    (items || [])
      .slice()
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
      .slice(0, 4)
      .forEach((i) => thumbs.push(`<span class='profile-collection-thumb'>${media(i)}</span>`));
  }

  const stack = thumbs.length
    ? `<div class='profile-collection-stack'>${thumbs.slice(0, 4).join("")}</div>`
    : `<div class='profile-collection-stack is-empty'><span class='profile-recent-star' aria-hidden='true'>★</span></div>`;

  return `<button type='button' class='profile-showcase-card profile-collections-card' data-view='collections'><div class='profile-showcase-copy'><span class='section-label'>Collections</span><strong>${count} ${count === 1 ? "collection" : "collections"}</strong><p>Organize references into mood and project sets.</p></div><div class='profile-showcase-visual'>${stack}<span class='profile-showcase-badge'>${esc(String(count))} sets</span><span class='profile-showcase-arrow' aria-hidden='true'>→</span></div></button>`;
}

/** Projects showcase card — same layout as Collections widget. */
export function profileProjectsCardMarkup(projects, items, helpers) {
  const { esc, media, projectItems } = helpers;
  const list = Array.isArray(projects) ? projects : [];
  const count = list.length;
  const thumbs = [];
  const seen = new Set();

  list.slice(0, 6).forEach((p) => {
    const linked = projectItems
      ? projectItems(p)
      : (items || []).filter((i) => (i.projectIds || []).includes(p.id));
    const first = linked[0];
    if (first && !seen.has(first.id)) {
      seen.add(first.id);
      thumbs.push(`<span class='profile-collection-thumb'>${media(first)}</span>`);
    }
  });

  if (!thumbs.length) {
    (items || [])
      .slice()
      .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
      .slice(0, 4)
      .forEach((i) => thumbs.push(`<span class='profile-collection-thumb'>${media(i)}</span>`));
  }

  const stack = thumbs.length
    ? `<div class='profile-collection-stack'>${thumbs.slice(0, 4).join("")}</div>`
    : `<div class='profile-collection-stack is-empty'><span class='profile-recent-star' aria-hidden='true'>★</span></div>`;

  return `<button type='button' class='profile-showcase-card profile-projects-card' data-view='projects'><div class='profile-showcase-copy'><span class='section-label'>Projects</span><strong>${count} ${count === 1 ? "project" : "projects"}</strong><p>Turn saved references into project direction.</p></div><div class='profile-showcase-visual'>${stack}<span class='profile-showcase-badge'>${esc(String(count))} active</span><span class='profile-showcase-arrow' aria-hidden='true'>→</span></div></button>`;
}
