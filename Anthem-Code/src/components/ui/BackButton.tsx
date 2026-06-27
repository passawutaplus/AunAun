import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type BackButtonProps = {
  onClick?: () => void;
  to?: string;
  label?: string;
  className?: string;
};

export function BackButton({ onClick, to, label = "กลับ", className }: BackButtonProps) {
  const navigate = useNavigate();

  const classNames = cn(
    "inline-flex items-center justify-center shrink-0",
    "w-9 h-9 rounded-full",
    "border border-border/80 bg-background",
    "text-foreground/80 hover:text-foreground hover:bg-muted/40",
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classNames} aria-label={label}>
        <ArrowLeft className="w-4 h-4" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick ?? (() => navigate(-1))}
      className={classNames}
      aria-label={label}
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}
