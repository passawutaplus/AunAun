import { KuyRadarProvider } from "@/hooks/admin/KuyRadarContext";
import KuyRadarShell from "@/components/admin/kuy-radar/KuyRadarShell";

export default function AdminKuyRadarPage() {
  return (
    <KuyRadarProvider>
      <KuyRadarShell />
    </KuyRadarProvider>
  );
}
