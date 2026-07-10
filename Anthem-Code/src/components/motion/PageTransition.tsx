import { Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { pageEnterTransition, pageEnterVariants } from "@/lib/motion";

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
  return pathname;
}

/** Soft enter animation when navigating between user-facing routes. */
export default function PageTransition() {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const key = pageTransitionKey(pathname);

  if (reduced || key === null) {
    return <Outlet />;
  }

  return (
    <motion.div
      key={key}
      initial="initial"
      animate="animate"
      variants={pageEnterVariants}
      transition={pageEnterTransition}
      className="min-h-[inherit]"
    >
      <Outlet />
    </motion.div>
  );
}
