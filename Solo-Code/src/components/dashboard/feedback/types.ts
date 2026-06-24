export type RevisionStatus = "in_progress" | "completed" | "final";

export type Revision = {
  id: string;
  round: number;
  notes: string;
  images: string[];
  status: RevisionStatus;
  createdAt: string;
};

export type FeedbackJob = {
  id: string;
  title: string;
  clientId: string;
  createdAt: string;
  closed: boolean;
  revisions: Revision[];
  revisionQuota?: number | null;
  quotationId?: string | null;
};

export const STATUS_META: Record<RevisionStatus, { label: string; className: string }> = {
  in_progress: { label: "กำลังแก้ไข", className: "bg-warning/20 text-warning-foreground" },
  completed: { label: "แก้ไขเสร็จ", className: "bg-primary-soft text-primary" },
  final: { label: "ปิดงาน", className: "bg-success/15 text-success" },
};

export const SEED_JOBS: FeedbackJob[] = [];

import { compressImageFile } from "@/lib/imageCompress";

export async function filesToDataUrls(files: FileList | File[]): Promise<string[]> {
  const arr = Array.from(files);
  const out: string[] = [];
  for (const f of arr) {
    try {
      out.push(await compressImageFile(f));
    } catch {
      // skip files that can't be compressed
    }
  }
  return out;
}
