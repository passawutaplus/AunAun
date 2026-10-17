import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";

type Props = {
  to: string;
  auth?: boolean;
  className?: string;
  children: ReactNode;
};

/** Link that opens signup when auth is required and guest. */
export function HelpAuthLink({ to, auth, className, children }: Props) {
  const { user } = useAuth();
  const openSignup = useAuthDialog((s) => s.openSignup);

  if (/^https?:\/\//.test(to)) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }

  if (!auth || user) {
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
