import type { HireCancelMoneyTerms } from "@/lib/hireCancelRequest";
import { settleHireCancelMoney } from "@/lib/payments/hireOrder";
import {
  DEFAULT_PLATFORM_FEE_PERCENT,
  percentOfSatang,
  planInstallmentSatang,
  satangToThb,
  thbToSatang,
} from "@/lib/payments/fees";
import type { PaymentMethod } from "@/lib/payments/types";

export const HIRE_MONEY_OUTCOME_VERSION = "aplus1-outcome-v1";

/** Payso PromptPay: 1.35% min 5 THB, rates exclude VAT 7%. */
export const PAYSO_PROMPTPAY_PERCENT = 1.35;
export const PAYSO_PROMPTPAY_MIN_THB = 5;
export const PAYSO_VAT_MULTIPLIER = 1.07;
export const PAYSO_CARD_PERCENT = 3;
export const PAYSO_LATE_CANCEL_FEE_THB = 300;
export const PAYSO_LATE_CANCEL_AFTER_DAYS = 7;

export type HireMoneyOutcomeKind = "completed" | "cancelled";

export type PspChargeKind = "payment" | "refund" | "void" | "late_cancel_fee";

export type PspChargeLine = {
  amountSatang: number;
  /** Fee Payso collected (include VAT if known). */
  feeSatang: number;
  kind: PspChargeKind;
  estimated?: boolean;
};

export type HireMoneyOutcomeInput = {
  jobPriceSatang: number;
  /** Total actually charged to buyer (deposit + balance). */
  amountPaidSatang: number;
  method: PaymentMethod;
  outcome: HireMoneyOutcomeKind;
  cancelTerms?: HireCancelMoneyTerms;
  platformFeePercent?: number;
  whtSatang?: number;
  /** If omitted, estimate PromptPay/card fees from amountPaid (and installments if provided). */
  pspCharges?: PspChargeLine[];
  /** Days since first payment when cancelling — triggers late fee estimate when > 7. */
  daysSincePaymentAtCancel?: number;
  /** Include estimated late cancel fee when days > 7 and not already in pspCharges. */
  applyLateCancelFeeEstimate?: boolean;
  sellerPayoutFeeSatang?: number;
  settlementTransferFeeSatang?: number;
  /** When estimating fees for deposit flows, pass deposit % to split two charges. */
  depositPercent?: number;
  label?: string;
};

export type PartyMoney = {
  paidSatang: number;
  refundedSatang: number;
  receivedSatang: number;
  feesSatang: number;
  netSatang: number;
  label: string;
};

export type HireMoneyOutcome = {
  version: string;
  label: string;
  outcome: HireMoneyOutcomeKind;
  cancelTerms: HireCancelMoneyTerms | null;
  method: PaymentMethod;
  jobPriceSatang: number;
  amountPaidSatang: number;
  platformFeeSatang: number;
  sellerNetIfCompletedSatang: number;
  parties: {
    buyer: PartyMoney;
    seller: PartyMoney;
    aplus1: PartyMoney;
    payso: PartyMoney;
  };
  pspCharges: PspChargeLine[];
  checks: {
    balanced: boolean;
    warnings: string[];
  };
  timeline: Array<{ step: string; detail: string }>;
};

function promptPayFeeSatang(amountSatang: number): number {
  if (amountSatang <= 0) return 0;
  const pct = percentOfSatang(amountSatang, PAYSO_PROMPTPAY_PERCENT);
  const minSatang = thbToSatang(PAYSO_PROMPTPAY_MIN_THB);
  const base = Math.max(minSatang, pct);
  return Math.round(base * PAYSO_VAT_MULTIPLIER);
}

function cardFeeSatang(amountSatang: number, percent = PAYSO_CARD_PERCENT): number {
  if (amountSatang <= 0) return 0;
  const base = percentOfSatang(amountSatang, percent);
  return Math.round(base * PAYSO_VAT_MULTIPLIER);
}

/** Estimate Payso fee for a single charge (platform-borne PromptPay, or card). */
export function estimatePaysoChargeFeeSatang(
  amountSatang: number,
  method: PaymentMethod,
): number {
  if (method === "card") return cardFeeSatang(amountSatang);
  if (method === "promptpay" || method === "bank_transfer") {
    return promptPayFeeSatang(amountSatang);
  }
  return promptPayFeeSatang(amountSatang);
}

function buildEstimatedPaymentFees(input: HireMoneyOutcomeInput): PspChargeLine[] {
  const depositPct = input.depositPercent ?? 100;
  const wht = input.whtSatang ?? 0;
  if (depositPct < 100 && input.amountPaidSatang > 0) {
    const plan = planInstallmentSatang(input.jobPriceSatang, depositPct, wht);
    const lines: PspChargeLine[] = [];
    if (plan.depositSatang > 0 && input.amountPaidSatang >= plan.depositSatang) {
      lines.push({
        amountSatang: plan.depositSatang,
        feeSatang: estimatePaysoChargeFeeSatang(plan.depositSatang, input.method),
        kind: "payment",
        estimated: true,
      });
    }
    const balancePaid = Math.max(0, input.amountPaidSatang - plan.depositSatang);
    if (balancePaid > 0) {
      lines.push({
        amountSatang: balancePaid,
        feeSatang: estimatePaysoChargeFeeSatang(balancePaid, input.method),
        kind: "payment",
        estimated: true,
      });
    }
    if (lines.length) return lines;
  }
  return [
    {
      amountSatang: input.amountPaidSatang,
      feeSatang: estimatePaysoChargeFeeSatang(input.amountPaidSatang, input.method),
      kind: "payment",
      estimated: true,
    },
  ];
}

function party(
  partial: Partial<PartyMoney> & Pick<PartyMoney, "netSatang" | "label">,
): PartyMoney {
  return {
    paidSatang: partial.paidSatang ?? 0,
    refundedSatang: partial.refundedSatang ?? 0,
    receivedSatang: partial.receivedSatang ?? 0,
    feesSatang: partial.feesSatang ?? 0,
    netSatang: partial.netSatang,
    label: partial.label,
  };
}

/**
 * Single source of truth for hire money outcome (completed or cancelled).
 * Used by admin finance P&L and legal scenario demos.
 */
export function computeHireMoneyOutcome(input: HireMoneyOutcomeInput): HireMoneyOutcome {
  const warnings: string[] = [];
  const feePct = input.platformFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT;
  const wht = Math.max(0, input.whtSatang ?? 0);
  const job = input.jobPriceSatang;
  const paid = Math.max(0, input.amountPaidSatang);

  if (!Number.isInteger(job) || job < 0) {
    throw new Error("jobPriceSatang must be a non-negative integer");
  }
  if (!Number.isInteger(paid) || paid < 0) {
    throw new Error("amountPaidSatang must be a non-negative integer");
  }

  const platformFeeSatang = percentOfSatang(job, feePct);
  const sellerNetIfCompleted = job - platformFeeSatang - wht;

  let pspCharges = input.pspCharges?.length
    ? [...input.pspCharges]
    : buildEstimatedPaymentFees(input);

  const paymentFees = pspCharges
    .filter((c) => c.kind === "payment")
    .reduce((s, c) => s + c.feeSatang, 0);

  if (
    input.outcome === "cancelled" &&
    input.applyLateCancelFeeEstimate !== false &&
    (input.daysSincePaymentAtCancel ?? 0) > PAYSO_LATE_CANCEL_AFTER_DAYS &&
    !pspCharges.some((c) => c.kind === "late_cancel_fee")
  ) {
    const late = thbToSatang(PAYSO_LATE_CANCEL_FEE_THB);
    pspCharges.push({
      amountSatang: 0,
      feeSatang: late,
      kind: "late_cancel_fee",
      estimated: true,
    });
    warnings.push(`ยกเลิกหลัง ${PAYSO_LATE_CANCEL_AFTER_DAYS} วัน — ประมาณการค่าธรรมเนียม Payso ${PAYSO_LATE_CANCEL_FEE_THB} บาท`);
  }

  const lateFees = pspCharges
    .filter((c) => c.kind === "late_cancel_fee")
    .reduce((s, c) => s + c.feeSatang, 0);
  const pspCostSatang = paymentFees + lateFees;
  const settlementFee = Math.max(0, input.settlementTransferFeeSatang ?? 0);
  const sellerPayoutFee = Math.max(0, input.sellerPayoutFeeSatang ?? 0);

  const timeline: Array<{ step: string; detail: string }> = [];
  let cancelTerms: HireCancelMoneyTerms | null = null;

  let buyer: PartyMoney;
  let seller: PartyMoney;
  let aplus1: PartyMoney;
  let payso: PartyMoney;
  let platformFeeTaken = 0;

  if (input.outcome === "completed") {
    if (paid < job - wht) {
      warnings.push("ยอดจ่ายน้อยกว่าราคางานสุทธิ — ตรวจมัดจำ/ส่วนที่เหลือ");
    }
    platformFeeTaken = platformFeeSatang;
    timeline.push({ step: "จ่ายครบ", detail: `ผู้จ้างจ่าย ${satangToThb(paid).toLocaleString("th-TH")} บาท` });
    timeline.push({
      step: "พักเงิน",
      detail: "Pending จนส่งมอบและอนุมัติ",
    });
    timeline.push({
      step: "อนุมัติงาน",
      detail: `ครีเอเตอร์ได้ ${satangToThb(sellerNetIfCompleted).toLocaleString("th-TH")} · Aplus1 fee ${satangToThb(platformFeeSatang).toLocaleString("th-TH")}`,
    });
    timeline.push({
      step: "ต้นทุน Payso",
      detail: `ประมาณ/จริง ${satangToThb(pspCostSatang).toLocaleString("th-TH")} บาท`,
    });

    buyer = party({
      paidSatang: paid,
      netSatang: -paid,
      label: "ผู้จ้าง — จ่ายครบ ได้งาน",
    });
    seller = party({
      receivedSatang: sellerNetIfCompleted,
      feesSatang: sellerPayoutFee,
      netSatang: sellerNetIfCompleted - sellerPayoutFee,
      label: "ครีเอเตอร์ — ได้สุทธิหลังหัก fee แพลตฟอร์ม",
    });
    aplus1 = party({
      receivedSatang: platformFeeTaken,
      feesSatang: pspCostSatang + settlementFee,
      netSatang: platformFeeTaken - pspCostSatang - settlementFee,
      label: "Aplus1 — platform fee หักต้นทุน PSP",
    });
    payso = party({
      receivedSatang: pspCostSatang,
      feesSatang: 0,
      netSatang: pspCostSatang,
      label: "Payso — ค่าธรรมเนียมช่องทาง (+VAT ตามประมาณการ)",
    });
  } else {
    cancelTerms = input.cancelTerms ?? "full_refund";
    const settlement = settleHireCancelMoney({
      paidSatang: paid,
      sellerNetSatang: sellerNetIfCompleted,
      terms: cancelTerms,
    });
    timeline.push({ step: "จ่ายแล้ว", detail: `ยอดที่เก็บได้ ${satangToThb(paid).toLocaleString("th-TH")} บาท` });
    timeline.push({
      step: "ยกเลิก",
      detail: `เงื่อนไข ${cancelTerms} · คืนผู้จ้าง ${satangToThb(settlement.buyerRefundSatang).toLocaleString("th-TH")} · ครีเอเตอร์เก็บ/ชดเชย ${satangToThb(settlement.sellerKeepSatang + settlement.sellerCompensationSatang).toLocaleString("th-TH")}`,
    });
    if (lateFees > 0) {
      timeline.push({
        step: "ค่าคืนช้า Payso",
        detail: `${satangToThb(lateFees).toLocaleString("th-TH")} บาท (แพลตฟอร์มแบกตามค่าเริ่มต้น)`,
      });
    }
    timeline.push({
      step: "ต้นทุน Payso",
      detail: `ค่าธรรมเนียมรายการที่ไม่คืน ≈ ${satangToThb(paymentFees).toLocaleString("th-TH")} บาท`,
    });

    if (settlement.buyerRefundSatang > paid) {
      warnings.push("ยอดคืนมากกว่ายอดที่จ่าย");
    }

    buyer = party({
      paidSatang: paid,
      refundedSatang: settlement.buyerRefundSatang,
      netSatang: -paid + settlement.buyerRefundSatang,
      label: "ผู้จ้าง — หลังคืนเงินตามเงื่อนไขยกเลิก",
    });
    const sellerGot = settlement.sellerKeepSatang + settlement.sellerCompensationSatang;
    seller = party({
      receivedSatang: sellerGot,
      feesSatang: sellerPayoutFee,
      netSatang: sellerGot - sellerPayoutFee,
      label: "ครีเอเตอร์ — ส่วนที่เก็บ/ชดเชยจากยกเลิก",
    });
    // Cancelled: no platform fee 10% by policy
    platformFeeTaken = 0;
    aplus1 = party({
      receivedSatang: 0,
      feesSatang: pspCostSatang + settlementFee,
      netSatang: -pspCostSatang - settlementFee,
      label: "Aplus1 — ไม่ได้ fee 10% · แบกต้นทุน PSP/ค่าคืนช้า",
    });
    payso = party({
      receivedSatang: pspCostSatang,
      netSatang: pspCostSatang,
      label: "Payso — ค่าธรรมเนียม + ค่าคืนช้า (ถ้ามี)",
    });
  }

  // Soft balance: money that "stays" with seller/aplus1/payso vs buyer net should relate to paid
  const retained =
    seller.netSatang +
    aplus1.netSatang +
    payso.netSatang +
    (buyer.refundedSatang > 0 ? 0 : 0);
  const implied = paid + buyer.netSatang; // paid + (-paid + refund) = refund for cancel; for complete = 0
  // For completed: buyer -paid, seller +net, aplus1 +fee-psp, payso +psp → sum ≈ -wht (ignore)
  const sumNets = buyer.netSatang + seller.netSatang + aplus1.netSatang + payso.netSatang;
  // completed ideal ≈ -wht; cancelled with full refund ≈ -pspCost (platform loss)
  const balanced =
    input.outcome === "completed"
      ? Math.abs(sumNets + wht) <= 2
      : Math.abs(sumNets + pspCostSatang + settlementFee) <= 2 ||
        Math.abs(sumNets - (-pspCostSatang - settlementFee + (seller.netSatang > 0 ? 0 : 0))) <=
          paid + 2;

  // Simpler check for cancelled: buyerRefund + sellerGot + (loss absorbed) = paid
  let balancedFinal = true;
  if (input.outcome === "cancelled") {
    const settlement = settleHireCancelMoney({
      paidSatang: paid,
      sellerNetSatang: sellerNetIfCompleted,
      terms: cancelTerms ?? "full_refund",
    });
    const allocated =
      settlement.buyerRefundSatang +
      settlement.sellerKeepSatang +
      settlement.sellerCompensationSatang;
    balancedFinal = allocated === paid;
    if (!balancedFinal) {
      warnings.push(`ยอดแบ่งยกเลิก ${allocated} ≠ จ่าย ${paid}`);
    }
  } else {
    balancedFinal = sellerNetIfCompleted + platformFeeSatang + wht === job;
    if (!balancedFinal) warnings.push("job ≠ sellerNet + platformFee + WHT");
  }

  if (pspCharges.some((c) => c.estimated)) {
    warnings.push("ค่าธรรมเนียม Payso เป็นประมาณการจากเรทใบเสนอราคา");
  }

  void retained;
  void implied;
  void sumNets;
  void balanced;

  return {
    version: HIRE_MONEY_OUTCOME_VERSION,
    label: input.label ?? (input.outcome === "completed" ? "งานจบสำเร็จ" : "งานยกเลิก"),
    outcome: input.outcome,
    cancelTerms,
    method: input.method,
    jobPriceSatang: job,
    amountPaidSatang: paid,
    platformFeeSatang: platformFeeTaken,
    sellerNetIfCompletedSatang: sellerNetIfCompleted,
    parties: { buyer, seller, aplus1, payso },
    pspCharges,
    checks: { balanced: balancedFinal, warnings },
    timeline,
  };
}

/** Demo fixtures for legal page (same engine as admin). */
export const HIRE_MONEY_DEMO_SCENARIOS: Array<{
  id: string;
  title: string;
  summary: string;
  input: HireMoneyOutcomeInput;
}> = [
  {
    id: "s1-full-complete",
    title: "จ้างสำเร็จ — จ่ายเต็ม",
    summary: "งาน 2,500 บาท จ่ายครบ ส่งงานและอนุมัติ",
    input: {
      label: "S1 จ้างสำเร็จ จ่ายเต็ม",
      jobPriceSatang: thbToSatang(2500),
      amountPaidSatang: thbToSatang(2500),
      method: "promptpay",
      outcome: "completed",
      depositPercent: 100,
    },
  },
  {
    id: "s2-deposit-complete",
    title: "จ้างสำเร็จ — มัดจำ 50%",
    summary: "งาน 3,500 บาท มัดจำครึ่งหนึ่ง แล้วจ่ายส่วนที่เหลือเมื่อส่งงาน",
    input: {
      label: "S2 มัดจำ 50% แล้วจบ",
      jobPriceSatang: thbToSatang(3500),
      amountPaidSatang: thbToSatang(3500),
      method: "promptpay",
      outcome: "completed",
      depositPercent: 50,
    },
  },
  {
    id: "s3-full-refund",
    title: "ยกเลิกก่อนส่ง — คืนเต็ม",
    summary: "จ่าย 1,000 บาท แล้วยกเลิกก่อนส่งงาน คืนเต็มจำนวน (ภายใน 7 วัน)",
    input: {
      label: "S3 คืนเต็มก่อนส่ง",
      jobPriceSatang: thbToSatang(1000),
      amountPaidSatang: thbToSatang(1000),
      method: "promptpay",
      outcome: "cancelled",
      cancelTerms: "full_refund",
      daysSincePaymentAtCancel: 2,
      applyLateCancelFeeEstimate: true,
    },
  },
  {
    id: "s5-half-refund",
    title: "ยกเลิกระหว่างงาน — คืนครึ่ง",
    summary: "มัดจำ 1,000 บาท จากงาน 2,000 แล้วตกลงคืนครึ่งของยอดที่จ่าย",
    input: {
      label: "S5 คืนครึ่งจากมัดจำ",
      jobPriceSatang: thbToSatang(2000),
      amountPaidSatang: thbToSatang(1000),
      method: "promptpay",
      outcome: "cancelled",
      cancelTerms: "half_refund",
      depositPercent: 50,
      daysSincePaymentAtCancel: 5,
    },
  },
  {
    id: "s6-late-cancel",
    title: "ยกเลิกหลัง 7 วัน — มีค่า Payso เพิ่ม",
    summary: "มัดจำแล้วผ่านไปเกิน 7 วันจึงยกเลิก คืนเต็มมัดจำ แต่แพลตฟอร์มอาจโดนค่าธรรมเนียม 300 บาท",
    input: {
      label: "S6 ยกเลิกหลัง 7 วัน",
      jobPriceSatang: thbToSatang(2000),
      amountPaidSatang: thbToSatang(1000),
      method: "promptpay",
      outcome: "cancelled",
      cancelTerms: "full_refund",
      depositPercent: 50,
      daysSincePaymentAtCancel: 8,
      applyLateCancelFeeEstimate: true,
    },
  },
  {
    id: "s7-card-complete",
    title: "จ้างสำเร็จ — บัตร (ประมาณการค่าธรรมเนียม)",
    summary: "งาน 2,000 บาท จ่ายบัตร — ตัวอย่างต้นทุน PSP ~3%+VAT (ถ้าไม่ผลักให้ผู้จ้างทั้งหมด)",
    input: {
      label: "S7 จ่ายบัตรจบงาน",
      jobPriceSatang: thbToSatang(2000),
      amountPaidSatang: thbToSatang(2000),
      method: "card",
      outcome: "completed",
    },
  },
];

export const HIRE_MONEY_FAQ: Array<{ q: string; a: string; scenarioId?: string }> = [
  {
    q: "จ่ายแล้วเงินเข้าครีเอเตอร์ทันทีไหม?",
    a: "ไม่ — เงินเข้าสถานะ Pending (พักไว้) จนส่งมอบและผู้จ้างอนุมัติ แล้วจึงเป็น Available ให้ถอนได้",
    scenarioId: "s1-full-complete",
  },
  {
    q: "มัดจำ 50% แล้วยกเลิก ได้คืนเท่าไหร่?",
    a: "คืนจากยอดที่จ่ายแล้ว ตามเงื่อนไขที่ตกลง: คืนเต็ม / คืนครึ่ง / ไม่คืน — ไม่เรียกเก็บส่วนที่ยังไม่จ่ายอัตโนมัติ",
    scenarioId: "s5-half-refund",
  },
  {
    q: "คืนเงินใช้เวลากี่วัน?",
    a: "โดยทั่วไป 7–14 วันทำการหลังอนุมัติคืน · ชำระด้วยบัตรอาจถึง 14–30 วันทำการ · ยกเลิกภายในวันเดียว (Void) อาจคืนเร็วกว่า",
    scenarioId: "s3-full-refund",
  },
  {
    q: "แพลตฟอร์มได้เงินจากไหน?",
    a: "เฉพาะค่าธรรมเนียมแพลตฟอร์ม 10% เมื่องานจบสำเร็จ — ถ้ายกเลิกโดยทั่วไปไม่ได้ค่าธรรมเนียมนี้ แต่ยังอาจเสียต้นทุนผู้ให้บริการชำระเงิน",
    scenarioId: "s1-full-complete",
  },
  {
    q: "ยกเลิกหลัง 7 วันต่างจากก่อน 7 วันอย่างไร?",
    a: "ฝั่งผู้ให้บริการชำระเงินอาจมีค่าธรรมเนียมเพิ่มประมาณ 300 บาทต่อรายการเมื่อยกเลิกล่าช้า — แพลตฟอร์มแบกเป็นค่าเริ่มต้นตามนโยบายปัจจุบัน",
    scenarioId: "s6-late-cancel",
  },
  {
    q: "ทำไมบางทีคืนไม่ครบยอดที่จ่าย?",
    a: "อาจหักค่าธรรมเนียม PSP ที่คืนไม่ได้ ดอกเบี้ยผ่อน (ถ้ามี) หรือตามเงื่อนไขยกเลิกที่ตกลงกันว่าคืนครึ่ง/ไม่คืน",
    scenarioId: "s5-half-refund",
  },
];

export function outcomeFromHireOrderRow(row: {
  job_price_satang: number;
  buyer_pays_satang: number;
  seller_net_satang: number;
  platform_fee_satang: number;
  platform_fee_percent: number;
  payment_method: string | null;
  status: string;
  paid_at?: string | null;
}): HireMoneyOutcome {
  const method: PaymentMethod =
    row.payment_method === "card"
      ? "card"
      : row.payment_method === "bank_transfer"
        ? "bank_transfer"
        : "promptpay";

  const cancelledStatuses = new Set(["cancelled", "refunded", "partially_refunded"]);
  const isCancelled = cancelledStatuses.has(row.status);
  const outcome: HireMoneyOutcomeKind = isCancelled ? "cancelled" : "completed";

  let cancelTerms: HireCancelMoneyTerms = "full_refund";
  if (row.status === "partially_refunded") cancelTerms = "half_refund";

  let daysSince = 0;
  if (row.paid_at && isCancelled) {
    daysSince = Math.max(
      0,
      Math.floor((Date.now() - new Date(row.paid_at).getTime()) / (24 * 60 * 60 * 1000)),
    );
  }

  const amountPaidSatang = isCancelled
    ? row.buyer_pays_satang || row.job_price_satang
    : row.job_price_satang;

  const result = computeHireMoneyOutcome({
    jobPriceSatang: row.job_price_satang,
    amountPaidSatang,
    method,
    outcome,
    cancelTerms: isCancelled ? cancelTerms : undefined,
    platformFeePercent: row.platform_fee_percent || DEFAULT_PLATFORM_FEE_PERCENT,
    daysSincePaymentAtCancel: daysSince,
    applyLateCancelFeeEstimate: isCancelled,
    label: `ออเดอร์ · ${row.status}`,
  });

  if (!isCancelled && row.platform_fee_satang > 0) {
    result.parties.aplus1.receivedSatang = row.platform_fee_satang;
    result.parties.aplus1.netSatang =
      row.platform_fee_satang - result.parties.aplus1.feesSatang;
    result.parties.seller.receivedSatang = row.seller_net_satang;
    result.parties.seller.netSatang = row.seller_net_satang - result.parties.seller.feesSatang;
    result.platformFeeSatang = row.platform_fee_satang;
  }

  return result;
}
