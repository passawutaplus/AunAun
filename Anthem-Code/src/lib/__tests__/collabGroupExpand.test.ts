import { describe, expect, it } from "vitest";
import {
  ackPreviewText,
  computeGroupExpandAckPreview,
  encodeCollabGroupExpandCardMessage,
  parseCollabGroupExpandCardMessage,
  prepareMigratedPlanForGroup,
  trimAcksForSourceMembers,
} from "@/lib/collabGroupExpand";
import { emptyCollabPlanDocument } from "@/lib/collabPlanDoc";

describe("collabGroupExpand", () => {
  it("round-trips chat card payload", () => {
    const payload = {
      v: 1 as const,
      kind: "collab_group_expand" as const,
      expandRequestId: "exp-1",
      sourceConversationId: "conv-1",
    };
    const msg = encodeCollabGroupExpandCardMessage(payload);
    expect(parseCollabGroupExpandCardMessage(msg)).toEqual(payload);
  });

  it("trims acks to source members only", () => {
    const doc = emptyCollabPlanDocument("conv-1");
    const step = doc.currentStep;
    doc.acks[step] = { u1: "t1", u2: "t2", u3: "t3" };
    const trimmed = trimAcksForSourceMembers(doc.acks, ["u1", "u2"]);
    expect(Object.keys(trimmed[step] ?? {})).toEqual(["u1", "u2"]);
  });

  it("recalculates status to draft when new members need acks", () => {
    const doc = emptyCollabPlanDocument("conv-1");
    doc.status = "step_locked";
    const step = doc.currentStep;
    doc.acks[step] = { u1: "t1", u2: "t2" };
    const migrated = prepareMigratedPlanForGroup({
      doc,
      sourceMemberIds: ["u1", "u2"],
      allMemberIds: ["u1", "u2", "u3"],
    });
    expect(migrated.status).toBe("draft");
  });

  it("formats ack preview when member count grows", () => {
    const doc = emptyCollabPlanDocument("conv-1");
    doc.acks[doc.currentStep] = { u1: "t1" };
    const preview = computeGroupExpandAckPreview(doc, ["u1", "u2"], ["u1", "u2", "u3"]);
    expect(preview.done).toBe(1);
    expect(preview.totalBefore).toBe(2);
    expect(preview.totalAfter).toBe(3);
    expect(ackPreviewText(preview)).toContain("→");
  });
});
