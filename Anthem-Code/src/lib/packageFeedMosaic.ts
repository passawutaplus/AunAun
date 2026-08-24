export type PackageMosaicTile = {
  url: string;
  serviceId: string;
  title: string;
};

export const PACKAGE_MOSAIC_MAX_TILES = 12;

type MosaicSource = {
  id: string;
  title: string;
  cover_url: string | null;
  gallery_urls: string[];
  sort_order: number;
  updated_at: string;
};

function compareServices(a: MosaicSource, b: MosaicSource): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return b.updated_at.localeCompare(a.updated_at);
}

/** Cover first per package, then gallery — one row of images for a creator card. */
export function buildPackageMosaic(
  services: MosaicSource[],
  maxTiles = PACKAGE_MOSAIC_MAX_TILES,
): PackageMosaicTile[] {
  const tiles: PackageMosaicTile[] = [];
  const seen = new Set<string>();

  const push = (raw: string | null | undefined, serviceId: string, title: string) => {
    const url = raw?.trim();
    if (!url || seen.has(url) || tiles.length >= maxTiles) return;
    seen.add(url);
    tiles.push({ url, serviceId, title });
  };

  for (const svc of [...services].sort(compareServices)) {
    push(svc.cover_url, svc.id, svc.title);
    for (const g of svc.gallery_urls) {
      push(g, svc.id, svc.title);
    }
  }
  return tiles;
}
