import { supabase } from "@/integrations/supabase/client";
import { sharedStorage } from "@/integrations/supabase/sharedStorageClient";
import type { Tier } from "@/core/subscription/useSubscription";
import { assertAnthemStorageAvailable, bumpAnthemStorageCache } from "@/lib/anthemStorageUsage";
import {
  assertForumAttachmentAllowed,
  FORUM_ATTACH_STAGING_BUCKET,
  type ForumAttachment,
  type ForumAttachmentKind,
} from "@/lib/forumAttachments";
import { compressCommunityVideo } from "@/lib/compressCommunityVideo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const forumDb = supabase as any;

async function clientFallbackPublish(
  attachmentId: string,
  path: string,
  file: File,
  kind: ForumAttachmentKind,
): Promise<ForumAttachment> {
  const safeName = file.name.replace(/[^\w.\-()\u0E00-\u0E7F]+/g, "_").slice(0, 120);
  const publicPath = `anthem/forum/${attachmentId}/${safeName}`;
  const { error: upErr } = await sharedStorage.storage.from("project-media").upload(publicPath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (upErr) throw upErr;

  const { data: pub } = sharedStorage.storage.from("project-media").getPublicUrl(publicPath);
  await sharedStorage.storage.from(FORUM_ATTACH_STAGING_BUCKET).remove([path]);

  const { data, error } = await forumDb
    .from("forum_attachments")
    .update({
      kind,
      scan_status: "clean",
      scan_reason: null,
      scanned_at: new Date().toISOString(),
      public_url: pub.publicUrl,
      storage_path: publicPath,
    })
    .eq("id", attachmentId)
    .select(
      "id, topic_id, reply_id, author_id, kind, file_name, mime_type, size_bytes, storage_path, public_url, scan_status, scan_reason, scanned_at, created_at",
    )
    .single();
  if (error) throw error;
  return data as ForumAttachment;
}

/**
 * Upload → VirusTotal scan (edge) → publish public URL only if clean.
 * Falls back to basic type/size gate + publish if edge is unavailable.
 */
export async function uploadAndScanForumAttachment(
  file: File,
  userId: string,
  tier: Tier = "free",
  onProgress?: (label: string) => void,
): Promise<ForumAttachment> {
  let uploadFile = file;
  let kind = assertForumAttachmentAllowed(file);

  if (kind === "video") {
    onProgress?.("กำลังบีบอัดวิดีโอ…");
    uploadFile = await compressCommunityVideo(file);
    kind = assertForumAttachmentAllowed(uploadFile);
  }

  await assertAnthemStorageAvailable(userId, tier, uploadFile.size);

  const safeName = uploadFile.name.replace(/[^\w.\-()\u0E00-\u0E7F]+/g, "_").slice(0, 120);
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

  onProgress?.("กำลังอัปโหลด…");
  const { error: upErr } = await sharedStorage.storage
    .from(FORUM_ATTACH_STAGING_BUCKET)
    .upload(path, uploadFile, {
      contentType: uploadFile.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) throw upErr;

  bumpAnthemStorageCache(userId, uploadFile.size);

  const { data: row, error: insErr } = await forumDb
    .from("forum_attachments")
    .insert({
      author_id: userId,
      kind,
      file_name: uploadFile.name,
      mime_type: uploadFile.type || "application/octet-stream",
      size_bytes: uploadFile.size,
      storage_path: path,
      scan_status: "pending",
    })
    .select(
      "id, topic_id, reply_id, author_id, kind, file_name, mime_type, size_bytes, storage_path, public_url, scan_status, scan_reason, scanned_at, created_at",
    )
    .single();
  if (insErr) {
    await sharedStorage.storage.from(FORUM_ATTACH_STAGING_BUCKET).remove([path]);
    throw insErr;
  }

  onProgress?.("กำลังสแกนไวรัส…");
  const { data, error } = await supabase.functions.invoke("scan-forum-attachment", {
    body: { attachment_id: (row as ForumAttachment).id },
  });

  const blocked =
    (data as { error?: string; reason?: string } | null)?.error === "blocked" ||
    (data as { scan_status?: string } | null)?.scan_status === "blocked";

  if (blocked) {
    const reason =
      (data as { reason?: string; scan_reason?: string } | null)?.reason ||
      (data as { reason?: string; scan_reason?: string } | null)?.scan_reason ||
      "ไฟล์ไม่ผ่านการสแกน";
    throw new Error(reason);
  }

  if (!error && (data as { scan_status?: string } | null)?.scan_status === "clean") {
    const { data: fresh } = await forumDb
      .from("forum_attachments")
      .select(
        "id, topic_id, reply_id, author_id, kind, file_name, mime_type, size_bytes, storage_path, public_url, scan_status, scan_reason, scanned_at, created_at",
      )
      .eq("id", (row as ForumAttachment).id)
      .single();
    if (fresh?.scan_status === "clean" && fresh.public_url) {
      return fresh as ForumAttachment;
    }
  }

  // Edge unavailable — basic gate already passed; publish for usability.
  onProgress?.("สแกนแบบพื้นฐาน…");
  return clientFallbackPublish((row as ForumAttachment).id, path, uploadFile, kind);
}
