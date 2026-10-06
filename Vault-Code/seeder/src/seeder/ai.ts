import Anthropic from "@anthropic-ai/sdk";
import { BLOCK_ARTISTIC_NUDITY, visionModel } from "./config";
import { C1_SYSTEM, C2_SYSTEM, c1Tool, c1UserText, c2Tool, dictionaryBlock, fenceData, parseC1, parseC2, tax } from "./engine";

export type Usage = { input_tokens: number; output_tokens: number };
export type Tag = { id: string; conf: number; src: string; facet?: string };
export type TriageResult = { domains: string[]; quality: number; safetyFlag: boolean; offScope?: boolean; usage?: Usage };
export type DeepResult = { tags: Tag[]; keywords: string[]; usage?: Usage };
export type Group = { id: string; en: string; maxPerImage: number | null };

export class AiOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiOutputError";
  }
}

/** The two AI stages. Injected into the pipeline so tests never touch the network. */
export interface AiClient {
  /** C1: ~256 px thumbnail -> disciplines, quality 0-100, safety flag. */
  triage(input: { jpeg: Buffer; title: string }): Promise<TriageResult>;
  /** C2: ~512 px thumbnail -> dictionary tags for the given groups only. */
  deep(input: { jpeg: Buffer; title: string; groups: Group[] }): Promise<DeepResult>;
}

const nudityRule = () =>
  BLOCK_ARTISTIC_NUDITY ? "s=true for any nudity, including artistic or classical nudity." : "s=true for sexualized or explicit nudity.";

function usageOf(r: { usage?: { input_tokens?: number; output_tokens?: number } }): Usage {
  return { input_tokens: r.usage?.input_tokens ?? 0, output_tokens: r.usage?.output_tokens ?? 0 };
}

const DISCIPLINES = () => tax.domains.map((d: { code: string }) => d.code).filter((c: string) => !["sty", "mat", "mood", "sub"].includes(c));

export class AnthropicAi implements AiClient {
  constructor(private readonly client: Anthropic = new Anthropic()) {}

  async triage({ jpeg, title }: { jpeg: Buffer; title: string }): Promise<TriageResult> {
    const response = await this.client.messages.create({
      model: visionModel(),
      max_tokens: 120,
      system: `${C1_SYSTEM}\n${nudityRule()} Disciplines: ${tax.domains
        .filter((d: { code: string }) => DISCIPLINES().includes(d.code))
        .map((d: { code: string; en: string }) => `${d.code}=${d.en}`)
        .join("; ")}.`,
      tools: [c1Tool(DISCIPLINES()) as unknown as Anthropic.Tool],
      tool_choice: { type: "tool", name: "triage" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } },
            { type: "text", text: c1UserText(title) },
          ],
        },
      ],
    });
    const block = response.content.find((b) => b.type === "tool_use");
    const parsed = block && block.type === "tool_use" ? parseC1(block.input, tax) : null;
    if (!parsed) throw new AiOutputError("C1 output invalid");
    return { ...parsed, usage: usageOf(response) };
  }

  async deep({ jpeg, title, groups }: { jpeg: Buffer; title: string; groups: Group[] }): Promise<DeepResult> {
    const response = await this.client.messages.create({
      model: visionModel(),
      max_tokens: 500,
      // Fixed instructions + dictionary first (cacheable); the image and title are the variable tail.
      system: [
        { type: "text", text: C2_SYSTEM },
        { type: "text", text: dictionaryBlock(groups, tax), cache_control: { type: "ephemeral" } },
      ],
      tools: [c2Tool() as unknown as Anthropic.Tool],
      tool_choice: { type: "tool", name: "tag" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") } },
            { type: "text", text: `Title: ${fenceData(title, 160)}` },
          ],
        },
      ],
    });
    const block = response.content.find((b) => b.type === "tool_use");
    const parsed = block && block.type === "tool_use" ? parseC2(block.input, tax) : null;
    if (!parsed) throw new AiOutputError("C2 output invalid");
    return { ...parsed, usage: usageOf(response) };
  }
}
