/** True when a Supabase/PostgREST error means the resource is missing or not exposed. */
export function isMissingResourceError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  return (
    code === "PGRST116" ||
    code === "PGRST202" ||
    code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("not found") ||
    msg.includes("404")
  );
}

/** True when RLS denied access — optional features should fail quietly. */
export function isForbiddenError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return error.code === "42501" || msg.includes("permission denied") || msg.includes("403");
}

export function isOptionalQueryError(error: { message?: string; code?: string } | null | undefined): boolean {
  return isMissingResourceError(error) || isForbiddenError(error);
}

/** PostgREST / Postgres — column or embed mismatch (common during schema drift). */
export function isSchemaMismatchError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  return (
    code === "PGRST204" ||
    code === "42703" ||
    code === "42883" ||
    (msg.includes("column") && msg.includes("does not exist")) ||
    msg.includes("could not find a relationship") ||
    msg.includes("invalid input syntax")
  );
}

export function isBenignQueryError(error: { message?: string; code?: string } | null | undefined): boolean {
  return isOptionalQueryError(error) || isSchemaMismatchError(error);
}
