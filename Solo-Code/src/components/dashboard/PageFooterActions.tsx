import { GiveFeedbackButton } from "@/components/dashboard/GiveFeedbackButton";
import { PageHelpButton } from "@/components/dashboard/PageHelpDialog";
import { cn } from "@/lib/utils";

export function PageFooterActions({
  feature,
  label,
  className,
}: {
  feature: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("mt-8 flex justify-end items-center gap-2 pr-1", className)}>
      <PageHelpButton feature={feature} label={label} />
      <GiveFeedbackButton feature={feature} label={label} inline />
    </div>
  );
}
