import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

const JobsNavButton = ({ className }: Props) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate("/jobs")}
      aria-label="งานจ้างดีไซน์"
      title="งานจ้างดีไซน์"
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        className,
      )}
    >
      <BriefcaseIcon className="w-5 h-5" />
    </button>
  );
};

export default JobsNavButton;
