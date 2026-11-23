// ES256 JWTs signed with an Apple .p8 key (APNs provider tokens, Sign in with Apple client secrets).

export const base64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
export const base64UrlText = (text: string) => base64Url(new TextEncoder().encode(text));

/** Signs `claims` with the PKCS#8 P-256 key in `privateKeyPem` (the full contents of AuthKey_XXXXXXXXXX.p8). */
export async function signEs256Jwt(
  keyId: string,
  privateKeyPem: string,
  claims: Record<string, unknown>,
): Promise<string> {
  // Secrets pasted on one line keep "\n" literally; the PEM body is what matters.
  const pemBody = privateKeyPem
    .replace(/\\n/g, "\n")
    .replace(/-----[^-]+-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signingInput = `${base64UrlText(JSON.stringify({ alg: "ES256", kid: keyId }))}.${base64UrlText(
    JSON.stringify(claims),
  )}`;
  // WebCrypto returns the raw r||s signature, which is the format JWS ES256 expects.
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(signingInput),
    ),
  );
  return `${signingInput}.${base64Url(signature)}`;
}
