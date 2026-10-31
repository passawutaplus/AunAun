// Map a pathname to a stable "feature" key used by feedback/analytics.
export function featureFromRoute(pathname: string): string {
  if (pathname === "/") return "feed";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/auth")) return "auth";
  if (pathname.startsWith("/project/")) return "project_detail";
  if (pathname.startsWith("/portfolio/new") || pathname.includes("/edit")) return "project_editor";
  if (pathname.startsWith("/portfolio")) return "portfolio";
  if (pathname.startsWith("/u/")) return "public_profile";
  if (pathname.startsWith("/s/")) return "studio_profile";
  if (pathname.startsWith("/studio")) return "studio";
  if (pathname.startsWith("/hiring")) return "hiring";
  if (pathname.startsWith("/jobs")) return "jobs";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/collections")) return "collections";
  if (pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/earnings")) return "earnings";
  if (pathname.startsWith("/contracts")) return "contracts";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/advertise") || pathname.startsWith("/ads/")) return "ads";
  if (pathname.startsWith("/similar/")) return "similar_images";
  if (pathname.startsWith("/inspire/")) return "inspire";
  if (pathname.startsWith("/forum")) return "forum";
  if (pathname.startsWith("/legal/")) return "legal";
  if (pathname.startsWith("/help")) return "help";
  if (pathname.startsWith("/learn")) return "learn";
  return "other";
}

// Routes where the floating feedback button should be hidden.
const HIDDEN_FEATURE_PREFIXES = ["/auth", "/admin", "/forum", "/verify"];
export function shouldHideFeedbackFab(pathname: string): boolean {
  return HIDDEN_FEATURE_PREFIXES.some((p) => pathname.startsWith(p)) || pathname === "/";
}

/** Pages a user can pick in the feedback composer (defaults to the current route). */
export const FEEDBACK_PAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "feed", label: "หน้าแรก / ฟีด" },
  { value: "project_detail", label: "หน้าผลงาน" },
  { value: "project_editor", label: "ลงผลงาน / แก้ไข" },
  { value: "portfolio", label: "พอร์ตของฉัน" },
  { value: "public_profile", label: "โปรไฟล์" },
  { value: "chat", label: "แชท / จ้าง / Collab" },
  { value: "hiring", label: "หาคนร่วมงาน" },
  { value: "collections", label: "คอลเลกชัน" },
  { value: "notifications", label: "การแจ้งเตือน" },
  { value: "settings", label: "ตั้งค่า" },
  { value: "other", label: "อื่น ๆ / ทั้งแอป" },
];
