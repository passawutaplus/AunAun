import { describe, expect, it } from "vitest";
import {
  normalizePromptPayId,
  promptPayPayload,
} from "@/lib/payments/promptpayQr";
import {
  offerInstallmentAmounts,
  offerPaymentPlan,
  planPresetId,
} from "@/lib/chatOffer";
import {
  installmentTracks,
  parseStudioDocCard,
  encodeStudioDocCard,
  type StudioDocumentRow,
} from "@/lib/documents/studioDocuments";

describe("promptPayPayload", () => {
  it("matches the promptpay-qr reference vector (phone + amount)", () => {
    expect(promptPayPayload("000-000-0000", 4.22)).toBe(
      "00020101021229370016A000000677010111011300660000000005802TH530376454044.226304E469",
    );
  });

  it("builds an open-amount (static) QR without tag 54", () => {
    const p = promptPayPayload("081-234-5678")!;
    expect(p.startsWith("000201010211")).toBe(true);
    expect(p).toContain("01130066812345678");
    expect(p).not.toContain("5404");
    expect(p).toMatch(/6304[0-9A-F]{4}$/);
  });

  it("rejects ids that are not phone / national id / e-wallet", () => {
    expect(normalizePromptPayId("12345")).toBeNull();
    expect(promptPayPayload("abc")).toBeNull();
    expect(normalizePromptPayId("1234567890123")?.kind).toBe("national_id");
  });
});

describe("installments", () => {
  const offer = {
    amount: 30000,
    whtApplicable: true,
    whtRate: 3,
    paymentPlan: [
      { id: "a", label: "มัดจำ", percent: 30 },
      { id: "b", label: "ส่งร่าง", percent: 40 },
      { id: "c", label: "ส่งมอบ", percent: 30 },
    ],
  };

  it("splits gross / WHT / net and sums exactly to the total", () => {
    const rows = offerInstallmentAmounts(offer);
    expect(rows.map((r) => r.gross)).toEqual([9000, 12000, 9000]);
    expect(rows.map((r) => r.net)).toEqual([8730, 11640, 8730]);
    expect(rows.reduce((s, r) => s + r.gross, 0)).toBe(30000);
  });

  it("puts the rounding remainder on the last installment", () => {
    const rows = offerInstallmentAmounts({
      amount: 1000,
      paymentPlan: [
        { id: "a", label: "1", percent: 33 },
        { id: "b", label: "2", percent: 33 },
        { id: "c", label: "3", percent: 34 },
      ],
    });
    expect(rows.reduce((s, r) => s + r.gross, 0)).toBe(1000);
  });

  it("derives a plan from the legacy deposit percent", () => {
    expect(
      offerPaymentPlan({ depositPercent: 50, paymentMode: "deposit" }).map(
        (p) => p.percent,
      ),
    ).toEqual([50, 50]);
    expect(
      offerPaymentPlan({ depositPercent: 100 }).map((p) => p.percent),
    ).toEqual([100]);
    expect(
      planPresetId(
        offerPaymentPlan({ depositPercent: 50, paymentMode: "deposit" }),
      ),
    ).toBe("50-50");
  });

  it("tracks installment state from linked documents", () => {
    const base = {
      owner_id: "o",
      conversation_id: "c",
      client_user_id: null,
      quote_id: "q",
      invoice_id: null,
      installment_total: 3,
      title: "t",
      client_name: null,
      amount_satang: 0,
      wht_satang: 0,
      net_satang: 0,
      issue_date: "2026-10-01",
      due_date: null,
      paid_at: null,
      payment_method: null,
      client_marked_paid_at: null,
      client_payment_note: null,
      responded_at: null,
      offer: null,
      snapshot: null,
      created_at: "2026-10-01T00:00:00Z",
      updated_at: "2026-10-01T00:00:00Z",
    };
    const quote = {
      ...base,
      id: "q",
      quote_id: null,
      kind: "quotation",
      doc_number: "QT",
      status: "accepted",
      installment_no: null,
      offer: { v: 4, title: "t", currency: "THB", deliverables: "", ...offer },
    } as StudioDocumentRow;
    const docs = [
      quote,
      {
        ...base,
        id: "r1",
        kind: "receipt",
        doc_number: "R1",
        status: "paid",
        installment_no: 1,
      },
      {
        ...base,
        id: "i2",
        kind: "invoice",
        doc_number: "I2",
        status: "sent",
        installment_no: 2,
        due_date: "2000-01-01",
      },
    ] as StudioDocumentRow[];
    expect(installmentTracks(quote, docs).map((t) => t.state)).toEqual([
      "paid",
      "overdue",
      "pending",
    ]);
  });
});

describe("chat doc card", () => {
  it("round-trips", () => {
    const card = {
      id: "x",
      kind: "invoice" as const,
      number: "INV-1",
      title: "งาน",
      net: 100,
    };
    expect(parseStudioDocCard(encodeStudioDocCard(card))).toMatchObject(card);
    expect(parseStudioDocCard("hello")).toBeNull();
  });
});

describe("document paper + CSV", () => {
  it("single-payment invoice carries the quote discount so lines add up", async () => {
    const { offerToInvoiceDocument } = await import("@/lib/documents/offerToDocument");
    const offer = {
      title: "Logo",
      amount: 9000,
      items: [{ id: "a", name: "Logo", quantity: 1, unitPrice: 10000 }],
    } as unknown as Parameters<typeof offerToInvoiceDocument>[0];
    const doc = offerToInvoiceDocument(offer, 1, { docNumber: "INV-2026-0001" });
    expect(doc.discountSatang).toBe(100000);
    expect(doc.subtotalSatang).toBe(900000);
  });

  it("CSV neutralises formula-looking text", async () => {
    const { studioDocsToCsv } = await import("@/lib/documents/studioDocuments");
    const csv = studioDocsToCsv([
      {
        kind: "invoice",
        doc_number: "INV-1",
        issue_date: "2026-10-18",
        due_date: null,
        client_name: "=HYPERLINK(1)",
        title: "job",
        installment_no: null,
        installment_total: null,
        amount_satang: 100,
        wht_satang: 0,
        net_satang: 100,
        status: "sent",
        paid_at: null,
        payment_method: null,
        client_marked_paid_at: null,
      } as unknown as StudioDocumentRow,
    ]);
    expect(csv).toContain("'=HYPERLINK(1)");
  });
});
