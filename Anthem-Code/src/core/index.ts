/**
 * `core/` is the staging area for code that will eventually move into
 * `packages/core` (Phase 5 monorepo). For now it lives in `src/core`
 * and is a thin re-export surface so files that import from
 * `@/core/*` keep working when extraction happens.
 *
 * Rule: anything imported from `@/core/*` MUST be safe to share
 * verbatim between Aplus1 and So1o. No app-specific business logic.
 */
export * from "./auth";
export * from "./wallet";
export * from "./profiles";
export * from "./subscription";
export * from "./types";
