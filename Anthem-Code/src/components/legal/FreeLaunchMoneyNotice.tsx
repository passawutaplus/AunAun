import { isCommerceEnabled } from "@/lib/aplus1Launch";
import { LEGAL_APP_NAME } from "@/lib/legalConfig";

/**
 * Free MVP: the platform does not take, hold or transfer money between users.
 * This notice overrides the payment / payout / PX clauses below until commerce is switched on.
 */
const FreeLaunchMoneyNotice = ({ scope = "terms" }: { scope?: "terms" | "privacy" | "payment" }) => {
  if (isCommerceEnabled()) return null;
  return (
    <div className="not-prose my-6 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-relaxed">
      <p className="font-semibold text-foreground">ช่วงเปิดตัว — {LEGAL_APP_NAME} ใช้งานฟรีและไม่เกี่ยวข้องกับการเงินระหว่างผู้ใช้</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>
          {LEGAL_APP_NAME} <strong className="text-foreground">ไม่รับ ไม่ถือ และไม่โอนเงิน</strong>แทนผู้ใช้
          ไม่มีการชำระค่าจ้าง มัดจำ การถอนเงิน หรือการเติม PX ผ่านแพลตฟอร์ม
        </li>
        <li>
          ผู้จ้างและผู้รับจ้างตกลงขอบเขตงาน ราคา และวิธีชำระเงินกันเองโดยตรง {LEGAL_APP_NAME} ไม่ใช่คู่สัญญา
          และไม่รับผิดชอบต่อการชำระเงินหรือข้อพิพาทที่เกิดนอกแพลตฟอร์ม
        </li>
        {scope === "privacy" ? (
          <li>เราไม่เก็บข้อมูลบัตร บัญชีธนาคาร หรือธุรกรรมการเงินของคุณในช่วงนี้</li>
        ) : null}
        <li>
          {scope === "payment" ? "นโยบายด้านล่าง" : "ข้อที่เกี่ยวกับการชำระเงิน การถอนเงิน และ PX ด้านล่าง"}
          {" "}ยังไม่มีผลบังคับใช้ และจะเริ่มใช้เมื่อเปิดฟีเจอร์เหล่านี้ — เราจะแจ้งให้ทราบล่วงหน้า
        </li>
      </ul>
    </div>
  );
};

export default FreeLaunchMoneyNotice;
