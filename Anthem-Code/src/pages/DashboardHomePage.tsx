import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import StudioLayout from "@/components/dashboard/StudioLayout";
import StudioHomePanel from "@/components/dashboard/StudioHomePanel";
import { useAuth } from "@/hooks/useAuth";
import { STUDIO_HIRE_PATH, STUDIO_HOME_PATH } from "@/lib/studioNav";

/** My Studio landing — queue, studio health, shortcuts. */
export default function DashboardHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const legacy = searchParams.get("mode");
    const focus = searchParams.get("focus");
    const hash = location.hash.replace(/^#/, "");
    if (legacy === "collab" || hash === "collab" || focus === "collab") {
      navigate("/dashboard/collab", { replace: true });
      return;
    }
    if (legacy === "wallet" || hash === "wallet" || hash === "earnings" || focus === "wallet" || focus === "earnings") {
      navigate("/earnings", { replace: true });
      return;
    }
    if (legacy === "reviews" || hash === "reviews" || focus === "reviews") {
      navigate("/dashboard/reviews", { replace: true });
      return;
    }
    if (legacy === "hire" || hash === "hiring" || hash === "hire" || focus === "hiring" || focus === "hire") {
      navigate(STUDIO_HIRE_PATH, { replace: true });
    }
  }, [searchParams, location.hash, navigate]);

  return (
    <StudioLayout>
      <SeoHead title="My Studio — Dashboard" path={STUDIO_HOME_PATH} noindex />
      {authLoading || !user ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลด…
        </div>
      ) : (
        <StudioHomePanel userId={user.id} />
      )}
    </StudioLayout>
  );
}
