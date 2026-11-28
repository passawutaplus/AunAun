import PrivacyContent from "@/components/legal/PrivacyContent";
import LegalCard from "../text/LegalCard";

/** The full Privacy text users agreed to (old /legal/privacy), in the new card (owner 2026-11-28). */
const SECTIONS = <PrivacyContent />;

export default function Privacy() {
  return <LegalCard current="privacy" heading="นโยบายความเป็นส่วนตัว" sections={SECTIONS} />;
}
