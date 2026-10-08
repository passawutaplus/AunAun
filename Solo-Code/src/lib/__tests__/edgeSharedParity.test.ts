import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Supabase Edge Functions (Deno) cannot import from `src/`, so a few modules
 * are intentionally copied. These tests fail loudly when a copy drifts, instead
 * of the bug surfacing later as a missing LINE notification or CORS header.
 */
const root = path.resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");

function kindsOf(source: string, typeName: string): string[] {
  const m = source.match(new RegExp(`type ${typeName}\\s*=\\s*((?:\\s*\\|\\s*"[a-z_0-9]+")+)`));
  if (!m) throw new Error(`union ${typeName} not found`);
  return [...m[1].matchAll(/"([a-z_0-9]+)"/g)].map((x) => x[1]).sort();
}

describe("edge function shared-code parity", () => {
  it("notify-kyc/_shared/cors.ts matches functions/_shared/cors.ts", () => {
    expect(read("supabase/functions/notify-kyc/_shared/cors.ts")).toBe(
      read("supabase/functions/_shared/cors.ts"),
    );
  });

  it("notify-kyc/_shared/resend-send.ts matches functions/_shared/resend-send.ts", () => {
    expect(read("supabase/functions/notify-kyc/_shared/resend-send.ts")).toBe(
      read("supabase/functions/_shared/resend-send.ts"),
    );
  });

  it("edge line-message-format knows exactly the same LINE notification kinds as the app", () => {
    const app = kindsOf(read("src/lib/lineNotificationKinds.ts"), "LineNotifyKind");
    const edge = kindsOf(read("supabase/functions/_shared/line-message-format.ts"), "LineNotifyKind");
    expect(edge).toEqual(app);
  });
});
