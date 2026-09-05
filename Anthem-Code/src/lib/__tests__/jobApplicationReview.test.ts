import { describe, expect, it } from "vitest";
import {
  canApplicantOpenJobChat,
  jobApplicationDaysLeft,
  jobRejectReasonUserCopy,
  matchesApplicantInboxFilter,
  sortJobApplicants,
} from "@/lib/jobApplicationReview";

describe("job application review", () => {
  it("does not let the applicant open chat before the company accepts", () => {
    expect(canApplicantOpenJobChat("pending", null)).toBe(false);
    expect(canApplicantOpenJobChat("pending", "conv")).toBe(false);
    expect(canApplicantOpenJobChat("rejected", "conv")).toBe(false);
    expect(canApplicantOpenJobChat("accepted", "conv")).toBe(true);
  });

  it("shows a user-facing reject reason", () => {
    expect(jobRejectReasonUserCopy("filled")).toBe("ตำแหน่งนี้รับคนแล้ว");
    expect(jobRejectReasonUserCopy("expired")).toBe("ไม่ได้รับการตอบกลับภายใน 2 สัปดาห์");
    expect(jobRejectReasonUserCopy("other", "งบไม่พอ")).toBe("งบไม่พอ");
  });

  it("counts remaining review days from the apply date", () => {
    const created = new Date("2026-09-01T00:00:00.000Z").toISOString();
    const now = new Date("2026-09-05T00:00:00.000Z").getTime();
    expect(jobApplicationDaysLeft(created, now)).toBe(10);
  });

  it("filters and pins interested applicants first", () => {
    expect(matchesApplicantInboxFilter("shortlisted", "interested")).toBe(true);
    expect(matchesApplicantInboxFilter("pending", "interested")).toBe(false);
    const sorted = sortJobApplicants([
      { status: "rejected", created_at: "2026-09-03T00:00:00.000Z" },
      { status: "pending", created_at: "2026-09-02T00:00:00.000Z" },
      { status: "shortlisted", created_at: "2026-09-01T00:00:00.000Z" },
    ]);
    expect(sorted.map((r) => r.status)).toEqual(["shortlisted", "pending", "rejected"]);
  });
});
