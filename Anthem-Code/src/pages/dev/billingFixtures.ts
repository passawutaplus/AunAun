import { emptyParty, type ChatOfferPayload } from "@/lib/chatOffer";
import {
  offerToInvoiceDocument,
  offerToQuotationDocument,
  offerToReceiptDocument,
} from "@/lib/documents/offerToDocument";
import {
  addDaysYmd,
  todayBangkok,
  type StudioDocumentRow,
} from "@/lib/documents/studioDocuments";
import { thbToSatang } from "@/lib/payments/fees";
import { offerInstallmentAmounts } from "@/lib/chatOffer";

/** Sample data for /dev previews only — never shipped to real users. */
export const DEV_OWNER_ID = "00000000-0000-0000-0000-00000000f001";

const offer: ChatOfferPayload = {
  v: 4,
  title: "ออกแบบโลโก้ + brand kit",
  amount: 30000,
  currency: "THB",
  deliverables: "",
  items: [
    {
      id: "a",
      name: "ออกแบบโลโก้ 3 แบบ",
      description: "เลือก 1 แบบไปพัฒนาต่อ",
      quantity: 1,
      unitPrice: 18000,
    },
    {
      id: "b",
      name: "Brand guideline",
      description: "สี ฟอนต์ การใช้งานโลโก้",
      quantity: 2,
      unitPrice: 6000,
    },
  ],
  number: "QT-2026-0012",
  party: {
    issuer: {
      ...emptyParty("individual"),
      name: "มินตรา ดีไซน์",
      email: "mintra@example.com",
      phone: "081-234-5678",
    },
    client: {
      ...emptyParty("corporate"),
      companyName: "บริษัท ตัวอย่าง จำกัด",
      contactPerson: "คุณเอ",
      email: "a@example.com",
    },
  },
  whtApplicable: true,
  whtEnabled: true,
  whtRate: 3,
  paymentPlan: [
    { id: "p1", label: "มัดจำก่อนเริ่มงาน", percent: 30 },
    { id: "p2", label: "เมื่อส่งร่าง", percent: 40 },
    { id: "p3", label: "เมื่อส่งมอบ", percent: 30 },
  ],
  milestones: [
    { id: "m1", label: "เริ่มงาน", date: addDaysYmd(todayBangkok(), -20) },
    { id: "m2", label: "ส่งร่าง", date: addDaysYmd(todayBangkok(), -3) },
    { id: "m3", label: "ส่งมอบสุดท้าย", date: addDaysYmd(todayBangkok(), 14) },
  ],
  showFullTimeline: true,
  validUntil: addDaysYmd(todayBangkok(), 10),
  clientNotes: "• แก้ไขได้ 2 รอบ\n• โอนตามบัญชีที่แจ้งในแชท",
};

const rows = offerInstallmentAmounts(offer);
const iso = (ymd: string) => `${ymd}T05:00:00.000Z`;

function base(over: Partial<StudioDocumentRow>): StudioDocumentRow {
  return {
    id: "x",
    owner_id: DEV_OWNER_ID,
    conversation_id: "conv-dev",
    client_user_id: null,
    kind: "quotation",
    doc_number: "QT",
    status: "sent",
    quote_id: null,
    invoice_id: null,
    installment_no: null,
    installment_total: null,
    title: offer.title,
    client_name: "บริษัท ตัวอย่าง จำกัด",
    amount_satang: 0,
    wht_satang: 0,
    net_satang: 0,
    issue_date: todayBangkok(),
    due_date: null,
    paid_at: null,
    payment_method: null,
    client_marked_paid_at: null,
    client_payment_note: null,
    responded_at: null,
    offer,
    snapshot: null,
    created_at: iso(todayBangkok()),
    updated_at: iso(todayBangkok()),
    ...over,
  };
}

function money(no: number) {
  const r = rows[no - 1];
  return {
    amount_satang: thbToSatang(r.gross),
    wht_satang: thbToSatang(r.wht),
    net_satang: thbToSatang(r.net),
  };
}

const d20 = addDaysYmd(todayBangkok(), -20);
const d18 = addDaysYmd(todayBangkok(), -18);
const d10 = addDaysYmd(todayBangkok(), -10);
const d3 = addDaysYmd(todayBangkok(), -3);

export const devQuote = base({
  id: "q1",
  doc_number: "QT-2026-0012",
  status: "accepted",
  amount_satang: thbToSatang(30000),
  wht_satang: thbToSatang(900),
  net_satang: thbToSatang(29100),
  issue_date: d20,
  created_at: iso(d20),
  snapshot: offerToQuotationDocument(offer, { issuedAt: iso(d20) }),
});

export const devDocs: StudioDocumentRow[] = [
  devQuote,
  base({
    id: "i1",
    kind: "invoice",
    doc_number: "INV-2026-0031",
    status: "paid",
    quote_id: "q1",
    installment_no: 1,
    installment_total: 3,
    ...money(1),
    issue_date: d20,
    due_date: d18,
    paid_at: iso(d18),
    created_at: iso(d20),
    snapshot: offerToInvoiceDocument(offer, 1, {
      docNumber: "INV-2026-0031",
      issuedAt: iso(d20),
      dueDate: d18,
    }),
  }),
  base({
    id: "r1",
    kind: "receipt",
    doc_number: "RCP-2026-0020",
    status: "paid",
    quote_id: "q1",
    invoice_id: "i1",
    installment_no: 1,
    installment_total: 3,
    ...money(1),
    issue_date: d18,
    paid_at: iso(d18),
    payment_method: "promptpay",
    created_at: iso(d18),
    snapshot: offerToReceiptDocument(offer, 1, {
      docNumber: "RCP-2026-0020",
      invoiceNumber: "INV-2026-0031",
      paidAt: iso(d18),
      paymentMethodLabel: "พร้อมเพย์",
      paidNos: [1],
    }),
  }),
  base({
    id: "i2",
    kind: "invoice",
    doc_number: "INV-2026-0044",
    status: "sent",
    quote_id: "q1",
    installment_no: 2,
    installment_total: 3,
    ...money(2),
    issue_date: d10,
    due_date: d3,
    client_marked_paid_at: iso(todayBangkok()),
    client_payment_note: "โอนจากกสิกร 14:20 น.",
    created_at: iso(d10),
    snapshot: offerToInvoiceDocument(offer, 2, {
      docNumber: "INV-2026-0044",
      issuedAt: iso(d10),
      dueDate: d3,
      paidNos: [1],
      promptPayId: "0812345678",
    }),
  }),
];

/** A larger set for the My Studio billing preview. */
export function devStudioDocs(): StudioDocumentRow[] {
  const extra: StudioDocumentRow[] = [
    base({
      id: "q2",
      doc_number: "QT-2026-0015",
      title: "ถ่ายภาพสินค้า 20 ชิ้น",
      client_name: "ร้านกาแฟบ้านสวน",
      status: "sent",
      amount_satang: thbToSatang(12000),
      net_satang: thbToSatang(12000),
      conversation_id: "conv-2",
      offer: null,
      created_at: iso(addDaysYmd(todayBangkok(), -2)),
      issue_date: addDaysYmd(todayBangkok(), -2),
    }),
    base({
      id: "i9",
      kind: "invoice",
      doc_number: "INV-2026-0039",
      title: "วิดีโอโปรโมต 30 วินาที",
      client_name: "คุณบี",
      status: "sent",
      installment_no: 2,
      installment_total: 2,
      amount_satang: thbToSatang(9000),
      net_satang: thbToSatang(9000),
      due_date: addDaysYmd(todayBangkok(), -6),
      issue_date: addDaysYmd(todayBangkok(), -16),
      created_at: iso(addDaysYmd(todayBangkok(), -16)),
      conversation_id: "conv-3",
      offer: null,
    }),
    base({
      id: "r9",
      kind: "receipt",
      doc_number: "RCP-2026-0024",
      title: "วิดีโอโปรโมต 30 วินาที",
      client_name: "คุณบี",
      status: "paid",
      installment_no: 1,
      installment_total: 2,
      amount_satang: thbToSatang(9000),
      net_satang: thbToSatang(9000),
      paid_at: iso(addDaysYmd(todayBangkok(), -25)),
      issue_date: addDaysYmd(todayBangkok(), -25),
      created_at: iso(addDaysYmd(todayBangkok(), -25)),
      payment_method: "bank_transfer",
      conversation_id: "conv-3",
      offer: null,
    }),
  ];
  return [...devDocs, ...extra].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}
