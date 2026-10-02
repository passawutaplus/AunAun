import { eventType } from "inngest";
import { z } from "zod";

export const batchRequested = eventType("seeder/batch.requested", {
  schema: z.object({
    category: z.string().min(1),
    source: z.enum(["met", "aic"]),
    query: z.string().min(1),
    cursor: z.number().int().min(0),
    size: z.number().int().min(1).max(50),
  }),
});

export const runRequested = eventType("seeder/run.requested", {
  schema: z.object({
    category: z.string().optional(),
    requestedBy: z.string().optional(),
  }),
});
