import { cn } from "@/lib/utils";

/** Silhouette: person working on a laptop (matches sidebar deal CTA artwork). */
export function PersonLaptopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={cn("h-4 w-4", className)}>
      <circle cx="12" cy="6.5" r="3.25" />
      <path d="M8.25 10.25c0-.9 1.65-1.75 3.75-1.75s3.75.85 3.75 1.75V12H8.25v-1.75z" />
      <path d="M7.25 13.25 16.75 13.25 15.35 17.25H8.65L7.25 13.25z" />
      <rect x="5.5" y="17.75" width="13" height="1.75" rx="0.35" />
    </svg>
  );
}
