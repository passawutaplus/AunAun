import { SHOWCASE } from "@/components/landing/showcase";
import { cn } from "@/lib/utils";

/**
 * Decorative strip of example works (the AI-generated set from /learn — never members' work) that
 * drifts slowly up/down in alternating columns. Not interactive, hidden from assistive tech.
 * 2 columns on phones, 3 on tablets, 4 on desktop (the home feed's default density).
 */
const COLUMNS = 4;
const PER_COLUMN = 6;

const columns = Array.from({ length: COLUMNS }, (_, c) =>
  Array.from({ length: PER_COLUMN }, (_, i) => SHOWCASE[(i * COLUMNS + c * 3) % SHOWCASE.length]),
);

export default function InviteWorksBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none relative h-[22rem] select-none overflow-hidden opacity-60 sm:h-[26rem]",
        "[mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]",
        className,
      )}
    >
      <div className="grid h-full grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {columns.map((col, c) => (
          <div key={c} className={cn("min-w-0", c === 2 && "hidden md:block", c === 3 && "hidden lg:block", c % 2 === 1 && "-mt-24")}>
            <div className={cn("invite-drift flex flex-col gap-3", c % 2 === 1 && "invite-drift-reverse")} style={{ animationDuration: `${70 + c * 8}s` }}>
              {[...col, ...col].map((w, i) => (
                <img
                  key={`${w.id}-${i}`}
                  src={w.src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="w-full rounded-xl object-cover"
                  style={{ aspectRatio: w.ratio ?? "3/4" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
