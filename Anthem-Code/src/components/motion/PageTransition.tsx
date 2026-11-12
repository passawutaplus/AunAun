import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { pageEnterTransition, pageEnterVariants } from "@/lib/motion";

/** Paths that continue an already mounted page (see keepPageInstance). */
const keptKeys = new Map<string, string>();
/** How many times a path handed its page over; a later visit must get a fresh page. */
const handovers = new Map<string, number>();

/**
 * Stable key for page enter motion.
 * Returns null to skip animation (admin tools, OAuth callback, in-chat thread swaps).
 */
export function pageTransitionKey(pathname: string): string | null {
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/auth/callback")) return null;
  if (pathname === "/error" || pathname.startsWith("/error/")) return null;
  // Chat shell stays mounted while switching threads
  if (pathname === "/chat" || pathname.startsWith("/chat/")) return "/chat";
  // Forum shell stays mounted; slide is handled inside ForumLayout
  if (pathname === "/forum" || pathname.startsWith("/forum/")) return "/forum";
  const kept = keptKeys.get(pathname);
  if (kept) return kept;
  const n = handovers.get(pathname);
  return n ? `${pathname}#${n}` : pathname;
}

/**
 * A page is about to rename its own URL (first save of a new work: /portfolio/new → /portfolio/<id>/edit).
 * Call right before navigating so the mounted page carries on — otherwise the new key remounts it and
 * everything on screen (open sheets, text typed during the save) is thrown away.
 */
export function keepPageInstance(from: string, to: string): void {
  const key = pageTransitionKey(from);
  if (!key || from === to) return;
  keptKeys.set(to, key);
  handovers.set(from, (handovers.get(from) ?? 0) + 1);
}

/** Soft enter animation when navigating between user-facing routes. */
export default function PageTransition() {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const key = pageTransitionKey(pathname);
  const skipFirstEnter = useRef(true);

  useEffect(() => {
    skipFirstEnter.current = false;
  }, []);

  if (reduced || key === null) {
    return <Outlet />;
  }

  return (
    <motion.div
      key={key}
      initial={skipFirstEnter.current ? false : "initial"}
      animate="animate"
      variants={pageEnterVariants}
      transition={pageEnterTransition}
      className="min-h-[inherit]"
    >
      <Outlet />
    </motion.div>
  );
}
