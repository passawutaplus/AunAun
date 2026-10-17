import { describe, expect, it } from "vitest";
import { emptyCollabPlanDocument, emptyPlanPayload, normalizeCollabPlanDocument } from "@/lib/collabPlanDoc";
import {
  agreementFromPayload,
  agreementStatus,
  diffAgreement,
  payloadWithAgreement,
  rightsLabel,
  type CollabAgreement,
} from "@/lib/collabAgreement";

const base: CollabAgreement = {
  what: "ปกอัลบั้ม",
  roles: { a: "ภาพประกอบ", b: "ไทโป" },
  brief: "โทนอบอุ่น",
  destinations: ["IG"],
  dueAt: "2026-11-20",
  rightsPreset: "portfolio_credit",
  rightsNote: "",
  links: [],
  deliverables: [],
  note: "",
  sentAt: "2026-10-17T00:00:00.000Z",
};

describe("collab agreement", () => {
  it("converts a legacy pipeline plan", () => {
    const p = emptyPlanPayload();
    p.align.idea = "เป้าหมาย: ปกอัลบั้ม\nโทนอบอุ่น";
    p.align.rights = "ใช้ได้เฉพาะพอร์ต";
    const a = agreementFromPayload(p, true);
    expect(a.what).toBe("ปกอัลบั้ม");
    expect(a.brief).toBe("โทนอบอุ่น");
    expect(a.rightsPreset).toBe("custom");
    expect(a.rightsNote).toBe("ใช้ได้เฉพาะพอร์ต");
    expect(a.sentAt).not.toBeNull();
  });

  it("legacy plan nobody confirmed stays a draft", () => {
    const p = emptyPlanPayload();
    p.align.idea = "ปกอัลบั้ม";
    expect(agreementFromPayload(p, false).sentAt).toBeNull();
  });

  it("round-trips through the stored payload and normalizer", () => {
    const payload = payloadWithAgreement(emptyPlanPayload(), base);
    const doc = normalizeCollabPlanDocument("c1", { payload, acks: {}, status: "draft", current_step: "align" });
    expect(agreementFromPayload(doc.payload)).toEqual(base);
    expect(doc.payload.align.idea).toBe("ปกอัลบั้ม\nโทนอบอุ่น");
    expect(doc.payload.align.rights).toBe(rightsLabel(base));
  });

  it("only roles and rights need re-confirmation", () => {
    expect(diffAgreement(base, { ...base, dueAt: "2026-11-25", brief: "x" }).needsReconfirm).toBe(false);
    expect(diffAgreement(base, { ...base, roles: { a: "ภาพประกอบ" } }).needsReconfirm).toBe(true);
    expect(diffAgreement(base, { ...base, rightsPreset: "non_commercial" }).needsReconfirm).toBe(true);
    expect(diffAgreement(base, { ...base, destinations: ["IG", "บูธ"] }).labels).toEqual(["ปลายทางของงาน"]);
  });

  it("status follows sentAt and acks", () => {
    const doc = emptyCollabPlanDocument("c1");
    expect(agreementStatus(doc, ["a", "b"], { ...base, sentAt: null })).toBe("draft");
    doc.acks = { align: { a: "t" } };
    expect(agreementStatus(doc, ["a", "b"], base)).toBe("pending");
    doc.acks = { align: { a: "t", b: "t" } };
    expect(agreementStatus(doc, ["a", "b"], base)).toBe("agreed");
  });
});
