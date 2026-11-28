import PrivacyContent from "@/components/legal/PrivacyContent";
import LegalCard from "../text/LegalCard";
import { SC_LINKS } from "../routes";
import { usePageSeo } from "../lib/usePageSeo";

/** The full Privacy text users agreed to (old /legal/privacy), in the new card (owner 2026-11-28). */
const SECTIONS = <PrivacyContent />;

export default function Privacy() {
  usePageSeo({ title: "นโยบายความเป็นส่วนตัว", description: "นโยบายความเป็นส่วนตัวของ SAMECOR", path: SC_LINKS.privacy });
  return <LegalCard current="privacy" heading="นโยบายความเป็นส่วนตัว" sections={SECTIONS} />;
}
