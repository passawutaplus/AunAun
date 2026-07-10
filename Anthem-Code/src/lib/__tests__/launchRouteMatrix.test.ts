import { describe, expect, it } from "vitest";

/**
 * Route samples mirrored from App.tsx — when adding routes, update allowlist + this matrix.
 * @see src/lib/aplus1Launch.ts LAUNCH_ALLOWED_ROUTE_PATTERNS
 */
import { isLaunchHiddenPath } from "@/lib/aplus1Launch";

const APP_ROUTE_SAMPLES: { path: string; launchEnabled: boolean }[] = [
  { path: "/", launchEnabled: true },
  { path: "/auth", launchEnabled: true },
  { path: "/auth/callback", launchEnabled: true },
  { path: "/reset-password", launchEnabled: true },
  { path: "/portfolio", launchEnabled: true },
  { path: "/portfolio/new", launchEnabled: true },
  { path: "/portfolio/saved", launchEnabled: true },
  { path: "/project/:id", launchEnabled: true },
  { path: "/explore/tool/Figma", launchEnabled: true },
  { path: "/u/:userId", launchEnabled: true },
  { path: "/chat", launchEnabled: true },
  { path: "/settings", launchEnabled: true },
  { path: "/notifications", launchEnabled: true },
  { path: "/collections", launchEnabled: true },
  { path: "/collections/:id", launchEnabled: true },
  { path: "/series", launchEnabled: true },
  { path: "/series/:id", launchEnabled: true },
  { path: "/me/reports", launchEnabled: true },
  { path: "/me/feedback", launchEnabled: true },
  { path: "/legal/privacy", launchEnabled: true },
  { path: "/admin", launchEnabled: true },
  { path: "/error/500", launchEnabled: true },
  { path: "/@vanity", launchEnabled: true },
  { path: "/research", launchEnabled: false },
  { path: "/community", launchEnabled: false },
  { path: "/community/:id", launchEnabled: false },
  { path: "/jobs", launchEnabled: false },
  { path: "/jobs/:id", launchEnabled: false },
  { path: "/advertise", launchEnabled: false },
  { path: "/upgrade", launchEnabled: false },
  { path: "/ads/:id", launchEnabled: false },
  { path: "/contracts", launchEnabled: false },
  { path: "/s/:slug", launchEnabled: false },
  { path: "/studio/new", launchEnabled: false },
  { path: "/verify", launchEnabled: false },
  { path: "/earnings", launchEnabled: false },
  { path: "/referrals", launchEnabled: false },
  { path: "/drill", launchEnabled: false },
  { path: "/similar/:projectId", launchEnabled: false },
  { path: "/inspire/:boardId", launchEnabled: false },
  { path: "/hire-requests", launchEnabled: false },
  { path: "/collab-requests", launchEnabled: false },
];

function resolveSample(path: string): string {
  return path
    .replace(":id", "test-id")
    .replace(":userId", "user-id")
    .replace(":slug", "studio")
    .replace(":projectId", "proj-id")
    .replace(":boardId", "board-id");
}

describe("App route matrix vs launch allowlist", () => {
  it.each(APP_ROUTE_SAMPLES)(
    "$path launchEnabled=$launchEnabled",
    ({ path, launchEnabled }) => {
      const resolved = resolveSample(path);
      expect(isLaunchHiddenPath(resolved)).toBe(!launchEnabled);
    },
  );
});
