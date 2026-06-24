import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { detectCommunitySpam, detectProfanity } from "@/lib/profanity";
import {
  COMMUNITY_GUIDELINES_PATH,
  COMMUNITY_PROFANITY_WARNING,
  PROFANITY_CATEGORY_LABELS,
} from "@/data/communityModerationPolicy";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  className?: string;
  compact?: boolean;
};

const CommunityProfanityHint = ({ text, className, compact }: Props) => {
  const profanity = detectProfanity(text);
  const spam = detectCommunitySpam(text);

  if (!profanity.hasProfanity && !spam) return null;

  const categories = [
    ...new Set(profanity.detailed.map((d) => PROFANITY_CATEGORY_LABELS[d.category] ?? d.category)),
  ];

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs text-amber-950 dark:border-amber-400/35 dark:bg-amber-500/12 dark:text-amber-50",
        className,
      )}
      role="status"
    >
      <p className="flex items-start gap-2 font-medium">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        {spam ? "พบรูปแบบ spam / โปรโมทที่ไม่อนุญาต" : COMMUNITY_PROFANITY_WARNING}
      </p>
      {!compact && profanity.hasProfanity && (
        <p className="mt-1 text-[11px] opacity-90 pl-5">
          ประเภท: {categories.join(", ")}
        </p>
      )}
      <Link to={COMMUNITY_GUIDELINES_PATH} className="mt-1 inline-block pl-5 text-primary hover:underline">
        อ่านกฎชุมชน
      </Link>
    </div>
  );
};

export default CommunityProfanityHint;
