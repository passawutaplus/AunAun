import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { mergeRedirectTarget } from "@/lib/mergeRedirectTarget";

/** Client-side redirect for legacy notification URLs. */
const RedirectTo = ({ to }: { to: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = useMemo(
    () => mergeRedirectTarget(to, location.search),
    [to, location.search],
  );

  useEffect(() => {
    navigate(destination, { replace: true });
  }, [navigate, destination]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">
      กำลังเปลี่ยนหน้า...
    </div>
  );
};

export const JobsToHiringRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <RedirectTo to={`/hiring/${id ?? ""}`} />;
};

/** `/search` — app-icon shortcut: land on the projects feed with search open (same as the bottom-nav search). */
export const SearchShortcutRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    try {
      localStorage.setItem("feed-mode", "projects");
    } catch {
      /* storage blocked */
    }
    navigate("/", { replace: true, state: { feedHomeReset: Date.now(), openProjectSearch: Date.now() } });
  }, [navigate]);
  return null;
};

export default RedirectTo;
