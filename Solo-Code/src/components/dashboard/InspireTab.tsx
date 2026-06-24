import { InspireSection } from "./inspire/InspireSection";
import { PageFooterActions } from "./PageFooterActions";

/** @deprecated ใช้ HomeTab แทน — คงไว้เพื่อ backward compat */
export function InspireTab() {
  return (
    <div className="space-y-6 animate-fade-in">
      <InspireSection />
      <PageFooterActions feature="inspire" label="Inspire" />
    </div>
  );
}
