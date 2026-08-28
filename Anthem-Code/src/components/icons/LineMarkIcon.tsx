import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** LINE-like chat bubble — monochrome so it matches profile menu icons. */
export default function LineMarkIcon({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <path d="M12 3.2C6.7 3.2 2.4 6.7 2.4 11c0 3.9 3.5 7.2 8.2 7.9v2.2c0 .4.5.7.8.4l2.9-2.3c.2 0 .5.1.7.1 5.3 0 9.6-3.5 9.6-7.8S17.3 3.2 12 3.2z" />
    </svg>
  );
}
