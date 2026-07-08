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
