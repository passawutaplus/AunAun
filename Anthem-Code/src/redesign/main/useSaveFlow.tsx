import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SC_LINKS } from "../routes";
import { usePresence } from "../lib/usePresence";
import SaveToast from "../shell/SaveToast";
import { useWorkSaves } from "./useWorkSaves";

export type SaveTarget = { id: string; title: string };

/**
 * Save button of a work (home grid, Work page). Saving opens SaveToast to put it in a collection;
 * pressing it again un-saves without a popup (mock). Signed out → log-in page.
 */
export function useSaveFlow() {
  const saves = useWorkSaves();
  const navigate = useNavigate();
  const toast = usePresence(300);
  const [target, setTarget] = useState<SaveTarget | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const { signedIn, ids, toggle: toggleSaved } = saves;
  const { open, close } = toast;

  const toggle = useCallback(
    (work: SaveTarget, el?: HTMLElement | null) => {
      if (!signedIn) {
        navigate(SC_LINKS.login);
        return;
      }
      const wasSaved = ids.has(work.id);
      toggleSaved(work.id);
      if (wasSaved) return;
      opener.current = el ?? null;
      setTarget(work);
      open();
    },
    [signedIn, ids, toggleSaved, navigate, open],
  );

  const onClose = useCallback(() => {
    close();
    opener.current?.focus({ preventScroll: true });
  }, [close]);

  const element = toast.mounted && target ? <SaveToast work={target} leaving={toast.leaving} onClose={onClose} /> : null;

  /** `open`: the popup is on screen (it takes Esc before the page does). */
  return { ids, toggle, element, open: toast.mounted };
}
