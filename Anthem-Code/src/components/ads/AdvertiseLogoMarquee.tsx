import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Fictional advertiser marks — mock social proof, not real clients. */
const MOCK_CLIENTS = [
  { name: "NOON STUDIO", src: "/ads/logos/noon-studio.png" },
  { name: "KARN", src: "/ads/logos/karn.png" },
  { name: "MAKER LAB", src: "/ads/logos/maker-lab.png" },
  { name: "RIN", src: "/ads/logos/rin.png" },
  { name: "ATLAS FORM", src: "/ads/logos/atlas-form.png" },
  { name: "SOI 11", src: "/ads/logos/soi11.png" },
  { name: "PAPER CUT", src: "/ads/logos/paper-cut.png" },
  { name: "LUMEN", src: "/ads/logos/lumen.png" },
] as const;

const ROW_A = MOCK_CLIENTS;
const ROW_B = [...MOCK_CLIENTS].reverse();

function LogoRow({
  clients,
  direction,
  reduced,
}: {
  clients: typeof MOCK_CLIENTS | typeof ROW_B;
  direction: "left" | "right";
  reduced: boolean | null;
}) {
  const loop = [...clients, ...clients];
  return (
    <div className="relative w-full overflow-hidden">
      <div
        className={cn(
          "flex w-max items-center gap-10 px-6 sm:gap-16 sm:px-10",
          !reduced && (direction === "left" ? "animate-work-wall-left" : "animate-work-wall-right"),
        )}
        style={!reduced ? { animationDuration: direction === "left" ? "38s" : "46s" } : undefined}
      >
        {loop.map((client, i) => (
          <img
            key={`${client.name}-${direction}-${i}`}
            src={client.src}
            alt=""
            className="h-8 w-auto shrink-0 object-contain opacity-90 sm:h-10"
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

const AdvertiseLogoMarquee = () => {
  const reduced = useReducedMotion();

  return (
    <div className="relative w-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-black/50 to-transparent sm:w-16"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-black/50 to-transparent sm:w-16"
        aria-hidden
      />
      <div className="flex flex-col gap-6 sm:gap-8">
        <LogoRow clients={ROW_A} direction="left" reduced={reduced} />
        <LogoRow clients={ROW_B} direction="right" reduced={reduced} />
      </div>
    </div>
  );
};

export default AdvertiseLogoMarquee;
