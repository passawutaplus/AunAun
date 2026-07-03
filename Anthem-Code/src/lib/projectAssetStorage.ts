/** Private bucket for downloadable portfolio attachments (not public gallery). */
export const PROJECT_ASSETS_BUCKET = "project-assets" as const;

export const LEGACY_PROJECT_MEDIA_BUCKET = "project-media" as const;

/** New uploads: `{userId}/{folder}/assets/{file}` in project-assets bucket. */
export function isLegacyProjectAssetPath(storagePath: string): boolean {
  return storagePath.startsWith("anthem/");
}

export function isValidProjectAssetStoragePath(storagePath?: string | null): boolean {
  if (!storagePath?.trim()) return false;
  if (isLegacyProjectAssetPath(storagePath)) return storagePath.includes("/assets/");
  return storagePath.includes("/assets/");
}

export function projectAssetStorageRef(storagePath: string): { bucket: string; path: string } {
  if (isLegacyProjectAssetPath(storagePath)) {
    return { bucket: LEGACY_PROJECT_MEDIA_BUCKET, path: storagePath };
  }
  return { bucket: PROJECT_ASSETS_BUCKET, path: storagePath };
}
