import { ArtInstituteAdapter } from "./aic";
import { CooperHewittAdapter } from "./chndm";
import { ClevelandArtAdapter } from "./cma";
import { MetMuseumAdapter } from "./met";
import { OpenverseAdapter } from "./ov";
import { SmithsonianAdapter } from "./si";
import type { SourceAdapter, SourceKey } from "./types";

const adapters: Record<SourceKey, () => SourceAdapter> = {
  met: () => new MetMuseumAdapter(),
  aic: () => new ArtInstituteAdapter(),
  cma: () => new ClevelandArtAdapter(),
  si: () => new SmithsonianAdapter(),
  chndm: () => new CooperHewittAdapter(),
  ov: () => new OpenverseAdapter(),
};

export function getAdapter(source: SourceKey): SourceAdapter {
  const make = adapters[source];
  if (!make) throw new Error(`No adapter for source "${source}"`);
  return make();
}

export function isSourceKey(value: string): value is SourceKey {
  return value in adapters;
}
