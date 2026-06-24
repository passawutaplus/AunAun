// Types that both apps will rely on. Currently a stub — concrete types
// land here as we extract cross-app domain models (Phase 3+).

/** Where the user came from for a cross-app deep link. */
export type CrossLinkSource = "anthem" | "so1o";

/** Apps that can emit notifications into the shared inbox (Phase 3). */
export type AppSource = "anthem" | "so1o";
