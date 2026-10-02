import { ArtInstituteAdapter } from "./aic";
import { MetMuseumAdapter } from "./met";
import type { SourceAdapter, SourceKey } from "./types";

const adapters: Record<SourceKey, () => SourceAdapter> = {
  met: () => new MetMuseumAdapter(),
  aic: () => new ArtInstituteAdapter(),
};

export function getAdapter(source: SourceKey): SourceAdapter {
  const make = adapters[source];
  if (!make) throw new Error(`No adapter for source "${source}"`);
  return make();
}

export function isSourceKey(value: string): value is SourceKey {
  return value in adapters;
}
