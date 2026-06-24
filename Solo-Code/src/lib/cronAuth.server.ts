function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function matchesAnySecret(token: string, secrets: string[]): boolean {
  for (const secret of secrets) {
    if (secret && timingSafeEqual(token, secret)) return true;
  }
  return false;
}

/**
 * Authorize internal cron routes with CRON_SECRET (preferred).
 * Falls back to SUPABASE_SERVICE_ROLE_KEY during migration only.
 */
export function authorizeCronBearer(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const acceptedSecrets = [cronSecret, serviceKey].filter(Boolean) as string[];
  if (acceptedSecrets.length === 0) {
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!matchesAnySecret(token, acceptedSecrets)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
