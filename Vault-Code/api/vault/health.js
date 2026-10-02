import { createHandler } from "../../lib/vault-api-shared.mjs";
import { storageConfigured } from "../../lib/supabase-rest.mjs";

// No DB call: uptime probes and load tests must stay cheap.
export default createHandler({
  methods: ["GET"],
  requireToken: false,
  handle() {
    return { success: true, service: "a-plus-vault", storage: storageConfigured() ? "supabase" : "unconfigured" };
  }
});
