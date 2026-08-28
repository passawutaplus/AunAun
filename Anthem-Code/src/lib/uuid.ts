const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** RFC-ish UUID (version + variant). Catalog demo ids do not always pass this. */
export function isUuid(value: string | undefined): boolean {
  return !!value && UUID_RE.test(value);
}

const UUID_LIKE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 8-4-4-4-12 hex, including demo catalog ids. */
export function isUuidLike(value: string | undefined): boolean {
  return !!value && UUID_LIKE_RE.test(value);
}

