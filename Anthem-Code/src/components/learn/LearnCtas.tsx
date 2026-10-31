import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { FORUM_PATH } from "@/lib/brandConfig";

export function LearnPrimaryCtas({
  secondaryToForum = false,
  align = "center",
}: {
  secondaryToForum?: boolean;
  align?: "center" | "start";
}) {
  const { user } = useAuth();
  const openSignup = useAuthDialog((s) => s.openSignup);

  return (
    <div
      className={
        align === "start"
          ? "flex flex-wrap items-center justify-start gap-3"
          : "flex flex-wrap items-center justify-center gap-3"
      }
    >
      <Button asChild className="rounded-full bg-foreground px-6 text-background hover:bg-foreground/90">
        <Link to="/">สำรวจผลงาน</Link>
      </Button>
      {secondaryToForum ? (
        <Button asChild variant="outline" className="rounded-full border-border bg-white px-6 text-foreground hover:bg-background">
          <Link to={FORUM_PATH}>เข้า Forum</Link>
        </Button>
      ) : user ? (
        <Button asChild variant="outline" className="rounded-full border-border bg-white px-6 text-foreground hover:bg-background">
          <Link to="/portfolio/new">ลงผลงาน</Link>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-border bg-white px-6 text-foreground hover:bg-background"
          onClick={() => openSignup("/portfolio/new")}
        >
          สมัครแล้วลงผลงาน
        </Button>
      )}
    </div>
  );
}

export function LearnAuthLink({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  const { user } = useAuth();
  const openSignup = useAuthDialog((s) => s.openSignup);

  if (user) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={() => openSignup(to)}>
      {children}
    </button>
  );
}
