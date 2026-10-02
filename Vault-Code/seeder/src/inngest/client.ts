import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "aplus-vault-seeder",
  // Keep below the route's maxDuration (300s) so checkpointed runs hand off before Vercel kills them.
  checkpointing: { maxRuntime: "240s" },
});
