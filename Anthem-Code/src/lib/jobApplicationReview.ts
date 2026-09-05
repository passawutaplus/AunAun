export const JOB_APPLICATION_REVIEW_DAYS = 14;

export type JobRejectReason =
  | "filled"
  | "not_a_fit"
  | "cancelled"
  | "experience"
  | "rate"
  | "expired"
  | "other";

export const JOB_REJECT_REASON_OPTIONS: {
  id: Exclude<JobRejectReason, "expired">;
  company: string;
  user: string;
}[] = [
  { id: "filled", company: "ได้คนทำงานแล้ว", user: "ตำแหน่งนี้รับคนแล้ว" },
  { id: "not_a_fit", company: "คุณสมบัติไม่ตรงกับที่ต้องการ", user: "โปรไฟล์ยังไม่ตรงกับที่ตำแหน่งนี้ต้องการ" },
  { id: "cancelled", company: "ยกเลิกประกาศรับสมัคร", user: "ประกาศนี้ถูกยกเลิกแล้ว" },
  { id: "experience", company: "ประสบการณ์ยังไม่ตรงตำแหน่ง", user: "ประสบการณ์ยังไม่ตรงกับงานนี้" },
  { id: "rate", company: "เรทหรืองบไม่ตรงกัน", user: "เงื่อนไขเรทยังไม่ตรงกัน" },
  { id: "other", company: "อื่น ๆ", user: "บริษัทปฏิเสธใบสมัครแล้ว" },
];

const USER_COPY: Record<JobRejectReason, string> = {
  filled: "ตำแหน่งนี้รับคนแล้ว",
  not_a_fit: "โปรไฟล์ยังไม่ตรงกับที่ตำแหน่งนี้ต้องการ",
  cancelled: "ประกาศนี้ถูกยกเลิกแล้ว",
  experience: "ประสบการณ์ยังไม่ตรงกับงานนี้",
  rate: "เงื่อนไขเรทยังไม่ตรงกัน",
  expired: "ไม่ได้รับการตอบกลับภายใน 2 สัปดาห์",
  other: "บริษัทปฏิเสธใบสมัครแล้ว",
};

export function jobRejectReasonUserCopy(reason?: string | null, note?: string | null): string | null {
  if (!reason) return null;
  if (reason === "other") {
    const extra = note?.trim();
    return extra || USER_COPY.other;
  }
  return USER_COPY[reason as JobRejectReason] ?? note?.trim() ?? null;
}

export function jobApplicationReviewDeadline(createdAt: string, now = Date.now()): Date {
  return new Date(new Date(createdAt).getTime() + JOB_APPLICATION_REVIEW_DAYS * 86_400_000);
}

export function jobApplicationDaysLeft(createdAt: string, now = Date.now()): number {
  const ms = jobApplicationReviewDeadline(createdAt, now).getTime() - now;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function canApplicantOpenJobChat(status?: string | null, conversationId?: string | null): boolean {
  if (!conversationId) return false;
  return status === "accepted" || status === "contacted" || status === "hired";
}

export type JobApplicantInboxFilter = "all" | "pending" | "interested" | "accepted" | "rejected";

export function isWaitingApplication(status?: string | null): boolean {
  return status === "pending" || status === "shortlisted";
}

export function matchesApplicantInboxFilter(status: string, filter: JobApplicantInboxFilter): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return status === "pending";
  if (filter === "interested") return status === "shortlisted";
  if (filter === "accepted") return status === "accepted" || status === "contacted" || status === "hired";
  return status === "rejected";
}

export function sortJobApplicants<T extends { status: string; created_at: string }>(rows: T[]): T[] {
  const rank = (status: string) => {
    if (status === "shortlisted") return 0;
    if (status === "pending") return 1;
    if (status === "accepted" || status === "contacted" || status === "hired") return 2;
    return 3;
  };
  return [...rows].sort((a, b) => {
    const byStatus = rank(a.status) - rank(b.status);
    if (byStatus !== 0) return byStatus;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
