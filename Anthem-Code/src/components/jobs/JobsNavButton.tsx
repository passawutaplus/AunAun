import { useNavigate } from "react-router-dom";
import { isAplus1HiringBoardEnabled } from "@/lib/aplus1Launch";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

const JobsNavButton = ({ className }: Props) => {
  const navigate = useNavigate();
  if (!isAplus1HiringBoardEnabled()) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/hiring")}
      aria-label="They are HIRING"
      title="They are HIRING"
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-full border border-border px-3.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <span className="whitespace-nowrap text-sm font-medium tracking-tight">
        They are <span className="font-semibold">HIRING</span>
      </span>
    </button>
  );
};

export default JobsNavButton;
