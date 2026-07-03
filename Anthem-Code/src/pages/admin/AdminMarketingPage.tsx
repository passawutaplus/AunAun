import { MarketingProvider } from "@/hooks/admin/MarketingContext";
import MarketingShell from "@/components/admin/marketing/MarketingShell";

export default function AdminMarketingPage() {
  return (
    <MarketingProvider>
      <MarketingShell />
    </MarketingProvider>
  );
}
