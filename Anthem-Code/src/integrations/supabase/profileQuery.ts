import { PROFILE_USER_COLUMN } from "./db";

/** Map unified profile row (user_id) to an1hem shape expecting `id`. */
export function withProfileId<T extends { user_id?: string; id?: string }>(row: T | null) {
  if (!row) return null;
  const uid = row.user_id ?? row.id;
  return { ...row, id: uid, user_id: uid };
}

export function withProfileIds<T extends { user_id?: string; id?: string }>(rows: T[] | null) {
  return (rows ?? []).map((r) => withProfileId(r)!);
}

export { PROFILE_USER_COLUMN };
