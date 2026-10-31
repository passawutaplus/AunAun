// Generates a Web Push (VAPID) key pair with Node's built-in crypto — no packages needed.
//   node scripts/generate-vapid-keys.mjs
// Public key  → Vercel env VITE_VAPID_PUBLIC_KEY and Supabase secret VAPID_PUBLIC_KEY
// Private key → Supabase secret VAPID_PRIVATE_KEY only. Never commit it or put it in a VITE_ variable.
import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pub = publicKey.export({ format: "jwk" });
const priv = privateKey.export({ format: "jwk" });

const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const raw = Buffer.concat([Buffer.from([0x04]), Buffer.from(pub.x, "base64url"), Buffer.from(pub.y, "base64url")]);

console.log(`VAPID_PUBLIC_KEY=${b64url(raw)}`);
console.log(`VAPID_PRIVATE_KEY=${priv.d}`);
