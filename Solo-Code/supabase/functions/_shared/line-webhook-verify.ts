function webhookSecretCandidates(): string[] {
  const keys = ["LINE_MESSAGING_CHANNEL_SECRET", "LINE_CHANNEL_SECRET"] as const;
  const out: string[] = [];
  for (const key of keys) {
    const v = Deno.env.get(key)?.trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

function hmacBase64(secret: string, body: string): Promise<string> {
  return crypto.subtle
    .importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
    ])
    .then((key) => crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)))
    .then((mac) => {
      const bytes = new Uint8Array(mac);
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      return btoa(binary);
    });
}

function signaturesMatch(expected: string, actual: string): boolean {
  if (expected.length !== actual.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  }
  return diff === 0;
}

/** Verify LINE Messaging API webhook `x-line-signature` (HMAC-SHA256, base64). */
export async function verifyLineWebhookSignature(
  signature: string | null,
  body: string,
): Promise<boolean> {
  if (!signature) return false;

  const secrets = webhookSecretCandidates();
  if (!secrets.length) return false;

  for (const secret of secrets) {
    const expected = await hmacBase64(secret, body);
    if (signaturesMatch(expected, signature)) return true;
  }
  return false;
}
