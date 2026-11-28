import TermsContent from "@/components/legal/TermsContent";
import LegalCard from "../text/LegalCard";

/** The full Terms text users agreed to (old /legal/terms), in the new card (owner 2026-11-28). */
const SECTIONS = <TermsContent />;

export default function Terms() {
  return <LegalCard current="terms" heading="ข้อกำหนดการใช้งาน" sections={SECTIONS} />;
}
