import { toast } from "sonner";
import {
  isSoloEcosystemEnabled,
  SOLO_ECOSYSTEM_COMING_SOON_SHORT,
  SOLO_ECOSYSTEM_COMING_SOON_TH,
} from "@/lib/aplus1Launch";

export function notifySoloComingSoon(): void {
  toast.info(SOLO_ECOSYSTEM_COMING_SOON_SHORT, {
    description: SOLO_ECOSYSTEM_COMING_SOON_TH,
  });
}

/** Opens a Solo URL in a new tab when ecosystem is enabled; otherwise shows coming-soon toast. */
export function openSoloExternal(url: string): boolean {
  if (!isSoloEcosystemEnabled()) {
    notifySoloComingSoon();
    return false;
  }
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
