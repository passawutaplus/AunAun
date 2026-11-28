import { BrandLoader } from "@/components/ui/BrandLoader";

/**
 * Loading: the site's own logo loader (a pale mark, a spotlight goes round it, then it shows whole) —
 * the owner kept it over the mock's turning mark (2026-11-28). Same loader as the start-up screen.
 */
export default function ScLoader({ label }: { label: string }) {
  return (
    <div role="status" className="sc-more">
      <span className="sc-sr">{label}</span>
      <BrandLoader size={48} aria-label={label} />
    </div>
  );
}
