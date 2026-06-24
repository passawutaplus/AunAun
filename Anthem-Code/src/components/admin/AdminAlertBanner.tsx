import { Link } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { useAdminAlertWatcher } from "@/hooks/admin/useAdminAlerts";

export default function AdminAlertBanner() {
  const { banner, dismissBanner } = useAdminAlertWatcher();
  if (!banner) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-sm border border-admin-accent/40 bg-admin-accent/10 px-4 py-3 text-sm">
      <AlertTriangle className="w-4 h-4 text-admin-accent shrink-0" />
      <p className="flex-1 text-admin-fg font-medium">{banner.title}</p>
      <Link to={banner.link} className="text-xs font-mono uppercase text-admin-accent hover:underline shrink-0">
        เปิดดู
      </Link>
      <button type="button" onClick={dismissBanner} className="text-admin-muted hover:text-admin-fg" aria-label="ปิด">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
