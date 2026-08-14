/**
 * Demo catalog imagery (generated artifacts + portraits).
 * Unsplash kept only as last-resort fallback if a local asset is missing.
 */
import { DEMO_CATALOG, catalogAssetRel } from "./demo-catalog-creators.mjs";

export const UNSPLASH_ART = [
  "1618005182384-a83a8bd57fbe",
  "1561070791-2526d30994b5",
  "1503387762-592deb58ef4e",
  "1460925895917-afdab827c52f",
  "1486312338219-ce68d2c6f44d",
  "1556761175-b413da4baf72",
  "1551288049-bebda4e38f71",
  "1553877522-43269d4ea984",
  "1551434678-e076c223a692",
  "1522071820081-009f0129c71c",
  "1552664730-d307ca884978",
  "1600880292203-757bb62b4baf",
  "1498050108023-c5249f4df085",
  "1517248135467-4c7edcad34c4",
  "1551650975-87deedd944c3",
  "1516321318423-f06f85e504b3",
  "1563986768609-322da13575f3",
  "1558618666-fcd25c85cd64",
  "1519389950473-47ba0277781c",
  "1555949963-aa79dcee981c",
];

export function demoAssetOrigin() {
  return String(process.env.DEMO_ASSET_ORIGIN || process.env.VITE_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

/** Absolute when DEMO_ASSET_ORIGIN is set; otherwise same-origin public path. */
export function demoCatalogUrl(relPath) {
  const path = `/demo-catalog/${String(relPath).replace(/^\/+/, "")}`;
  const origin = demoAssetOrigin();
  return origin ? `${origin}${path}` : path;
}

export function demoCatalogCoverUrl(i) {
  return demoCatalogUrl(catalogAssetRel("covers", ((i % 20) + 20) % 20));
}

export function demoCatalogAvatarUrl(i) {
  return demoCatalogUrl(catalogAssetRel("avatars", ((i % 20) + 20) % 20));
}

export function napatsaraExtraCoverUrl() {
  return demoCatalogUrl("covers/01b-napatsara-songkran.png");
}

export function unsplashArt(i, w = 1200, h = 900) {
  return demoCatalogCoverUrl(i);
}

export function unsplashGallery(i) {
  const cover = demoCatalogCoverUrl(i);
  const next = demoCatalogCoverUrl(i + 7);
  return [cover, next];
}

export function unsplashArtSqlArray() {
  return `ARRAY[\n      ${UNSPLASH_ART.map((id) => `'${id}'`).join(",\n      ")}\n    ]`;
}

export { DEMO_CATALOG, catalogAssetRel };
