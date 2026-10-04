import { createHandler, readJsonBody } from "../vault-api-shared.mjs";
import { resolveAuthContext } from "../vault-api-auth.mjs";
import { importUrl } from "../import/index.mjs";
import { importError } from "../import/errors.mjs";

// Signed-in users only: fetching arbitrary URLs is an abuse and SSRF target. The limiter in
// lib/rate-limit.mjs is per serverless instance; a global cap belongs in the Vercel WAF.
export default createHandler({
  methods: ["POST"],
  limit: { name: "import-url", limit: 20, windowMs: 60_000 },
  fallbackMessage: "นำเข้าลิงก์ไม่สำเร็จ",
  async handle(req) {
    const auth = await resolveAuthContext(req);
    if (!auth.userId) {
      const error = new Error("กรุณาเข้าสู่ระบบก่อน");
      error.status = 401;
      throw error;
    }
    const body = await readJsonBody(req);
    return { success: true, data: await importUrl(body?.url) };
  }
});

export { importError };
