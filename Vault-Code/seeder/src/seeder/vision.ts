import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { BLOCK_ARTISTIC_NUDITY, visionModel } from "./config";

export type VisionResult = {
  safe: boolean;
  unsafe_reason: string | null;
  category: string;
  tags: string[];
  style: string;
  colors: string[];
};

export class VisionOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VisionOutputError";
  }
}

export function visionSchema(categories: readonly string[]) {
  if (categories.length === 0) throw new Error("At least one category is required");
  return z.object({
    safe: z.boolean(),
    unsafe_reason: z.string().max(200).nullable(),
    category: z.enum(categories as [string, ...string[]]),
    tags: z
      .array(z.string().trim().toLowerCase().min(2).max(40))
      .min(3)
      .max(12)
      .transform((tags) => [...new Set(tags)]),
    style: z.string().trim().toLowerCase().min(2).max(60),
    colors: z
      .array(z.string().regex(/^#[0-9a-fA-F]{6}$/).transform((c) => c.toLowerCase()))
      .min(1)
      .max(6),
  });
}

export function parseVisionOutput(raw: unknown, categories: readonly string[]): VisionResult {
  const parsed = visionSchema(categories).safeParse(raw);
  if (!parsed.success) throw new VisionOutputError(parsed.error.message);
  return parsed.data;
}

function toolInputSchema(categories: readonly string[]) {
  return {
    type: "object" as const,
    properties: {
      safe: { type: "boolean", description: "False if the image must not appear on a public, all-ages home page." },
      unsafe_reason: { type: ["string", "null"], description: "Short reason when safe is false, otherwise null." },
      category: { type: "string", enum: [...categories] },
      tags: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 12,
        description: "Lowercase English keywords a designer would search for (subject, technique, material, era, motif).",
      },
      style: { type: "string", description: "One short lowercase style label, e.g. 'art nouveau', 'ukiyo-e', 'minimal geometric'." },
      colors: {
        type: "array",
        items: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
        minItems: 1,
        maxItems: 6,
        description: "Dominant colors as hex, most prominent first.",
      },
    },
    required: ["safe", "unsafe_reason", "category", "tags", "style", "colors"],
  };
}

function systemPrompt(): string {
  const nudity = BLOCK_ARTISTIC_NUDITY
    ? "any nudity, including artistic or classical nudity"
    : "sexualized or explicit nudity (non-sexual artistic nudity is allowed)";
  return [
    "You classify museum images for a creative reference library used by designers.",
    "The image will be shown on a public home page to guests of any age.",
    `Mark safe=false for: ${nudity}; sexual content; graphic violence, gore, or corpses; hateful symbols or propaganda presented approvingly; self-harm; disturbing medical imagery.`,
    "Pick the single best category from the allowed list based on what the image shows, not on its title.",
    "Always call the record_analysis tool exactly once.",
  ].join(" ");
}

export type VisionInput = {
  jpeg: Buffer;
  title: string;
  categories: readonly string[];
  hintCategory: string;
};

export async function analyzeImage(input: VisionInput, client = new Anthropic()): Promise<VisionResult> {
  const response = await client.messages.create({
    model: visionModel(),
    max_tokens: 600,
    system: systemPrompt(),
    tools: [
      {
        name: "record_analysis",
        description: "Record moderation and tagging for the image.",
        input_schema: toolInputSchema(input.categories),
      },
    ],
    tool_choice: { type: "tool", name: "record_analysis" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: input.jpeg.toString("base64") } },
          {
            type: "text",
            text: `Museum title (metadata, may be generic): ${JSON.stringify(input.title.slice(0, 200))}. Seeded under category "${input.hintCategory}".`,
          },
        ],
      },
    ],
  });

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new VisionOutputError("Model did not call record_analysis");
  return parseVisionOutput(block.input, input.categories);
}
