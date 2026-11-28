import TermsContent from "@/components/legal/TermsContent";
import LegalCard from "../text/LegalCard";
import { SC_LINKS } from "../routes";
import { usePageSeo } from "../lib/usePageSeo";

/** The full Terms text users agreed to (old /legal/terms), in the new card (owner 2026-11-28). */
const SECTIONS = <TermsContent />;

export default function Terms() {
  usePageSeo({ title: "ข้อกำหนดการใช้งาน", description: "ข้อกำหนดการใช้งาน SAMECOR", path: SC_LINKS.terms });
  return <LegalCard current="terms" heading="ข้อกำหนดการใช้งาน" sections={SECTIONS} />;
}
