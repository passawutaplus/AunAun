// Generates expected hire-order money values from the REAL client formula (fees.ts, aplus1-v1, PromptPay).
import { snapshotFees, planInstallmentSatang } from "../../../../Anthem-Code/src/lib/payments/fees";

const jobs = [1, 99, 100, 101, 12345, 50000, 99999, 123456, 1000000, 2500050, 987654321];
const whtPcts = [0, 1, 3, 5];          // percent of job; capped by server at 5%
const deps = [100, 50, 30, 33, 1, 99];

const rows: string[] = [];
for (const job of jobs) {
  for (const wp of whtPcts) {
    const wht = Math.round((job * wp) / 100);
    for (const dep of deps) {
      const s = snapshotFees(job, "promptpay", undefined, { whtSatang: wht, chargePercent: dep });
      const plan = planInstallmentSatang(job, dep, wht);
      rows.push(
        `(${job},${wht},${dep},${s.buyerPaysSatang},${s.sellerNetSatang},${s.fee.platformFeeSatang},${plan.balanceSatang})`,
      );
    }
  }
}
console.log(
  "create table oracle(job bigint, wht bigint, dep numeric, buyer_pays bigint, seller_net bigint, fee bigint, balance bigint);\n" +
    "insert into oracle values\n" + rows.join(",\n") + ";",
);
