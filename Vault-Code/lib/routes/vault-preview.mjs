import { createHandler } from "../vault-api-shared.mjs";
import { resolveAuthContext } from "../vault-api-auth.mjs";
import { fetchLinkPreview } from "../vault-link-preview.mjs";

// Signed-in users only: an open fetch-a-URL endpoint would be an abuse and SSRF target.
export default createHandler({
  methods: ["GET"],
  limit: { name: "preview", limit: 30, windowMs: 60_000 },
  fallbackMessage: "Could not preview this link.",
  async handle(req) {
    await resolveAuthContext(req);
    const raw = new URL(req.url, "http://localhost").searchParams.get("url");
    return { success: true, preview: await fetchLinkPreview(raw) };
  }
});
