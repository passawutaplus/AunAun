import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

export default RedirectTo;
