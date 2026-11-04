import MascotMood from "@/components/beta/MascotMood";
import { cn } from "@/lib/utils";

/** The SAMECOR mascot, sad, for the "decline invitation" dialog: sways gently and sheds a tear. */
export default function SadBuddy({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative", className)}>
      <style>{`
        .sb-sway { transform-origin: 50% 90%; animation: sb-sway 3.2s ease-in-out infinite; }
        .sb-tear { animation: sb-tear 2.6s ease-in infinite; }
        .sb-shadow { animation: sb-shadow 3.2s ease-in-out infinite; }
        @keyframes sb-sway { 0%,100% { transform: rotate(-4deg) translateY(0); } 50% { transform: rotate(4deg) translateY(2px); } }
        @keyframes sb-tear { 0% { transform: translateY(0) scale(.6); opacity: 0; } 20% { opacity: 1; transform: translateY(2px) scale(1); } 85% { opacity: 1; } 100% { transform: translateY(22px); opacity: 0; } }
        @keyframes sb-shadow { 0%,100% { transform: scaleX(1); } 50% { transform: scaleX(.9); } }
        @media (prefers-reduced-motion: reduce) { .sb-sway, .sb-tear, .sb-shadow { animation: none; } }
      `}</style>
      <div className="sb-sway relative">
        <MascotMood mood={2} className="h-full w-full" />
        {/* tear under the left eye (eye sits at ~39% x, ~58% y of the 64-unit tile) */}
        <span className="sb-tear absolute left-[35%] top-[60%] block h-2.5 w-2 rounded-b-full rounded-t-[60%] bg-sky-300" />
      </div>
      <span className="absolute -bottom-1 inset-x-0 flex justify-center">
        <span className="sb-shadow block h-2 w-3/5 rounded-full bg-foreground/15" />
      </span>
    </div>
  );
}
