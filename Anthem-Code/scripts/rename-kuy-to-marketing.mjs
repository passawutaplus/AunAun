import fs from "node:fs";
import path from "node:path";

const root = path.resolve("f:/So1o/AunAun-fresh/Anthem-Code");

const fileRenames = [
  ["src/components/admin/kuy-radar", "src/components/admin/marketing"],
  ["src/lib/kuy-radar", "src/lib/marketing"],
  ["src/hooks/admin/KuyRadarContext.tsx", "src/hooks/admin/MarketingContext.tsx"],
  ["src/pages/admin/AdminKuyRadarPage.tsx", "src/pages/admin/AdminMarketingPage.tsx"],
  ["docs/kuy-radar-migration.md", "docs/marketing-migration.md"],
];

const componentRenames = {
  KuyAdsPlanner: "MarketingAdsPlanner",
  KuyBusinessSetup: "MarketingBusinessSetup",
  KuyCompetitorTable: "MarketingCompetitorTable",
  KuyComplianceBanner: "MarketingComplianceBanner",
  KuyComplianceGuard: "MarketingComplianceGuard",
  KuyContentPlanner: "MarketingContentPlanner",
  KuyContentTable: "MarketingContentTable",
  KuyInsightPanel: "MarketingInsightPanel",
  KuyLeadTable: "MarketingLeadTable",
  KuyManualPage: "MarketingManualPage",
  KuyOfferBuilder: "MarketingOfferBuilder",
  KuyOutreachPanel: "MarketingOutreachPanel",
  KuyOverviewPage: "MarketingOverviewPage",
  KuyRadarShell: "MarketingShell",
  KuyRadarCard: "MarketingCard",
  KuyReportsPanel: "MarketingReportsPanel",
  KuySettingsPanel: "MarketingSettingsPanel",
};

const hookRenames = {
  useKuyRadarBusinesses: "useMarketingBusinesses",
  useKuyRadarCompetitors: "useMarketingCompetitors",
  useKuyRadarContent: "useMarketingContent",
  useKuyRadarInsights: "useMarketingInsights",
  useKuyRadarLeads: "useMarketingLeads",
  useKuyRadarSettings: "useMarketingSettings",
  KuyRadarProvider: "MarketingProvider",
  useKuyRadarContext: "useMarketingContext",
  KuyRadarContext: "MarketingContext",
};

const typeRenames = {
  KuyLanguage: "MarketingLanguage",
  KuyLeadStatus: "MarketingLeadStatus",
  KuyPlatform: "MarketingPlatform",
  KuyInsightType: "MarketingInsightType",
  KuyAiTask: "MarketingAiTask",
  KuyAiOutput: "MarketingAiOutput",
  KuyBusiness: "MarketingBusiness",
  KuyKeyword: "MarketingKeyword",
  KuyLead: "MarketingLead",
  KuyCompetitor: "MarketingCompetitor",
  KuyContentItem: "MarketingContentItem",
  KuyInsight: "MarketingInsight",
  KuyCampaign: "MarketingCampaign",
  KuyOutreachMessage: "MarketingOutreachMessage",
  KuyReport: "MarketingReport",
  KuySettings: "MarketingSettings",
  KuyUiLanguage: "MarketingUiLanguage",
  KuyLeadStatus: "MarketingLeadStatus",
};

const constRenames = {
  KUY_RADAR_PRODUCT_NAME: "MARKETING_PRODUCT_NAME",
  KUY_RADAR_SCOPE_LABEL_TH: "MARKETING_SCOPE_LABEL_TH",
  KUY_RADAR_SCOPE_LABEL_EN: "MARKETING_SCOPE_LABEL_EN",
  KUY_APLUS1_DEFAULT_BUSINESS: "MARKETING_APLUS1_DEFAULT_BUSINESS",
  KUY_APLUS1_PRESETS: "MARKETING_APLUS1_PRESETS",
  KUY_APLUS1_PROMPT_TASKS: "MARKETING_APLUS1_PROMPT_TASKS",
  KUY_APLUS1_METRICS: "MARKETING_APLUS1_METRICS",
  KUY_BUSINESS_PRESETS: "MARKETING_BUSINESS_PRESETS",
  KUY_LEAD_STATUSES: "MARKETING_LEAD_STATUSES",
  KUY_PLATFORMS: "MARKETING_PLATFORMS",
  KUY_INSIGHT_TYPES: "MARKETING_INSIGHT_TYPES",
};

const fnRenames = {
  kuyT: "marketingT",
  kuyStatusLabel: "marketingStatusLabel",
  kuyProductDescription: "marketingProductDescription",
  kuyBrandSubtitle: "marketingBrandSubtitle",
  kuyBrandDescription: "marketingBrandDescription",
  isKuyTableMissing: "isMarketingTableMissing",
  readLocalKuyStore: "readLocalMarketingStore",
  writeLocalKuyStore: "writeLocalMarketingStore",
  kuyLeadsKey: "marketingLeadsKey",
  kuyInsightsKey: "marketingInsightsKey",
  kuyCompetitorsKey: "marketingCompetitorsKey",
  kuyContentKey: "marketingContentKey",
  kuySettingsKey: "marketingSettingsKey",
  runKuyAiTask: "runMarketingAiTask",
};

function renamePath(fromRel, toRel) {
  const from = path.join(root, fromRel);
  const to = path.join(root, toRel);
  if (!fs.existsSync(from)) {
    console.warn("skip missing", fromRel);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  console.log("moved", fromRel, "->", toRel);
}

for (const [from, to] of fileRenames) renamePath(from, to);

const marketingDir = path.join(root, "src/components/admin/marketing");
for (const [oldName, newName] of Object.entries(componentRenames)) {
  const from = path.join(marketingDir, `${oldName}.tsx`);
  const to = path.join(marketingDir, `${newName}.tsx`);
  if (fs.existsSync(from)) {
    fs.renameSync(from, to);
    console.log("renamed component", oldName);
  }
}

const hookFiles = [
  "useKuyRadarBusinesses.ts",
  "useKuyRadarCompetitors.ts",
  "useKuyRadarContent.ts",
  "useKuyRadarInsights.ts",
  "useKuyRadarLeads.ts",
  "useKuyRadarSettings.ts",
];
for (const f of hookFiles) {
  const from = path.join(root, "src/hooks/admin", f);
  const to = path.join(root, "src/hooks/admin", f.replace("useKuyRadar", "useMarketing"));
  if (fs.existsSync(from)) fs.renameSync(from, to);
}

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (/\.(tsx?|css|md|json)$/.test(ent.name)) files.push(p);
  }
  return files;
}

const replacements = [
  ...Object.entries(componentRenames),
  ...Object.entries(hookRenames),
  ...Object.entries(typeRenames),
  ...Object.entries(constRenames),
  ...Object.entries(fnRenames),
  ["@/lib/kuy-radar/", "@/lib/marketing/"],
  ["@/components/admin/kuy-radar/", "@/components/admin/marketing/"],
  ["kuy-radar/", "marketing/"],
  ["/admin/kuy-radar", "/admin/marketing"],
  ["Kuy Radar", "Marketing"],
  ["kuy-radar-local-v1", "marketing-local-v1"],
  [".kuy-radar", ".marketing-module"],
  [".kuy-card", ".marketing-card"],
  [".kuy-hero", ".marketing-hero"],
  [".kuy-chip-brand", ".marketing-chip-brand"],
  [".kuy-chip-accent", ".marketing-chip-accent"],
  [".kuy-chip", ".marketing-chip"],
  [".kuy-control", ".marketing-control"],
  [".kuy-nav-link-active", ".marketing-nav-link-active"],
  [".kuy-nav-link", ".marketing-nav-link"],
  [".kuy-nav", ".marketing-nav"],
  [".kuy-tone-ok", ".marketing-tone-ok"],
  [".kuy-tone-warn", ".marketing-tone-warn"],
  [".kuy-tone-accent", ".marketing-tone-accent"],
  [".kuy-btn-primary", ".marketing-btn-primary"],
  [".kuy-link", ".marketing-link"],
  [".kuy-callout-warn", ".marketing-callout-warn"],
  [".kuy-danger-zone", ".marketing-danger-zone"],
  ["AdminKuyRadarPage", "AdminMarketingPage"],
  ["VITE_KUY_RADAR_AI_MOCK", "VITE_MARKETING_AI_MOCK"],
  ["kuy_radar_core", "kuy_radar_core"],
];

const allFiles = walk(root).filter(
  (f) => !f.includes("node_modules") && !f.includes("rename-kuy-to-marketing"),
);

for (const file of allFiles) {
  let text = fs.readFileSync(file, "utf8");
  let next = text;
  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }
  if (next !== text) fs.writeFileSync(file, next);
}

console.log("done");
