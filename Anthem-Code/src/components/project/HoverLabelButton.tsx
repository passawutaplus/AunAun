import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<typeof Button>, "children" | "size"> & {
  icon: ReactNode;
  label: string;
};

/** Icon button that unfolds its text label while hovered or keyboard-focused. */
export const HoverLabelButton = forwardRef<HTMLButtonElement, Props>(
  ({ icon, label, className, variant = "outline", ...rest }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant={variant}
      size="sm"
      aria-label={label}
      className={cn("group h-9 shrink-0 gap-0 rounded-full px-[9px]", className)}
      {...rest}
    >
      {icon}
      <span
        className={cn(
          "hover-label max-w-0 overflow-hidden whitespace-nowrap text-xs opacity-0 transition-all duration-200 ease-out",
          "group-hover:ml-1.5 group-hover:max-w-[12rem] group-hover:opacity-100",
          "group-focus-visible:ml-1.5 group-focus-visible:max-w-[12rem] group-focus-visible:opacity-100",
        )}
      >
        {label}
      </span>
    </Button>
  ),
);
HoverLabelButton.displayName = "HoverLabelButton";
