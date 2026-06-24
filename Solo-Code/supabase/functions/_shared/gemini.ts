// Shared Google Gemini client for Supabase Edge Functions (Deno).
// Uses the Generative Language REST API — no Lovable gateway.

import geminiModels from "./gemini-models.json" with { type: "json" };

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export type GeminiChatRole = "user" | "model";

export interface GeminiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export function getGeminiApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new GeminiError("GEMINI_API_KEY not configured", 500);
  return key;
}

export function defaultFastModel(): string {
  return Deno.env.get("GEMINI_MODEL_FAST") ?? geminiModels.models.fast;
}

export function defaultModel(): string {
  return Deno.env.get("GEMINI_MODEL") ?? geminiModels.models.default;
}

export function defaultEmbeddingModel(): string {
  return Deno.env.get("GEMINI_EMBEDDING_MODEL") ?? geminiModels.models.embedding;
}

export function geminiModelsUpdatedAt(): string {
  return geminiModels.updated_at;
}

export function latestGeminiModelChangelog() {
  const entries = geminiModels.changelog ?? [];
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

/** Map legacy Lovable gateway model ids to Gemini API model ids. */
export function normalizeGeminiModel(model?: string, fallback?: string): string {
  if (!model?.trim()) return fallback ?? defaultFastModel();
  let m = model.trim();
  if (m.startsWith("google/")) m = m.slice(7);
  const aliases = geminiModels.aliases as Record<string, string>;
  return aliases[m] ?? m;
}

function splitMessages(messages: GeminiChatMessage[]) {
  const systemLines: string[] = [];
  const contents: Array<{ role: GeminiChatRole; parts: Array<{ text: string }> }> = [];
  for (const msg of messages) {
    if (msg.role === "system") {
      systemLines.push(msg.content);
      continue;
    }
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }
  return {
    systemInstruction: systemLines.length
      ? { parts: [{ text: systemLines.join("\n\n") }] }
      : undefined,
    contents,
  };
}

function buildRequestBody(opts: {
  messages: GeminiChatMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  json?: boolean;
  tools?: unknown[];
  toolConfig?: Record<string, unknown>;
}) {
  const { systemInstruction, contents } = splitMessages(opts.messages);
  const body: Record<string, unknown> = { contents };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  const gen: Record<string, unknown> = {};
  if (opts.temperature != null) gen.temperature = opts.temperature;
  if (opts.maxOutputTokens != null) gen.maxOutputTokens = opts.maxOutputTokens;
  if (opts.json) gen.responseMimeType = "application/json";
  if (Object.keys(gen).length > 0) body.generationConfig = gen;
  if (opts.tools?.length) body.tools = opts.tools;
  if (opts.toolConfig) body.toolConfig = opts.toolConfig;
  return body;
}

function extractTextFromResponse(json: Record<string, unknown>): string {
  const candidates = json.candidates as Array<Record<string, unknown>> | undefined;
  const parts = (candidates?.[0]?.content as Record<string, unknown> | undefined)?.parts as
    | Array<Record<string, unknown>>
    | undefined;
  if (!parts?.length) return "";
  return parts.map((p) => String(p.text ?? "")).join("");
}

async function parseGeminiError(res: Response): Promise<GeminiError> {
  const t = await res.text().catch(() => "");
  if (res.status === 429) return new GeminiError("rate_limited", 429);
  if (res.status === 401 || res.status === 403) {
    return new GeminiError("GEMINI_API_KEY ไม่ถูกต้องหรือไม่มีสิทธิ์", res.status);
  }
  return new GeminiError(`gemini_error: ${res.status} ${t.slice(0, 200)}`, res.status);
}

export async function geminiGenerateText(
  apiKey: string,
  model: string,
  options: {
    messages: GeminiChatMessage[];
    temperature?: number;
    maxOutputTokens?: number;
    json?: boolean;
  },
): Promise<string> {
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildRequestBody(options)),
  });
  if (!res.ok) throw await parseGeminiError(res);
  const json = (await res.json()) as Record<string, unknown>;
  return extractTextFromResponse(json).trim();
}

function extractStreamDelta(json: Record<string, unknown>): string {
  const candidates = json.candidates as Array<Record<string, unknown>> | undefined;
  const parts = (candidates?.[0]?.content as Record<string, unknown> | undefined)?.parts as
    | Array<Record<string, unknown>>
    | undefined;
  if (!parts?.length) return "";
  return parts.map((p) => String(p.text ?? "")).join("");
}

/** Stream Gemini output as So1o SSE (`data: {"delta":"..."}`). */
export function geminiStreamAsSo1oSse(
  apiKey: string,
  model: string,
  messages: GeminiChatMessage[],
): ReadableStream<Uint8Array> {
  const { systemInstruction, contents } = splitMessages(messages);
  const url = `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
  const reqBody: Record<string, unknown> = { contents };
  if (systemInstruction) reqBody.systemInstruction = systemInstruction;

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });
      if (!res.ok) {
        controller.error(await parseGeminiError(res));
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) {
        controller.error(new GeminiError("empty stream", 500));
        return;
      }
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const chunk = JSON.parse(payload) as Record<string, unknown>;
              const delta = extractStreamDelta(chunk);
              if (delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
            } catch {
              /* ignore malformed chunk */
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

/** Structured output via Gemini function calling. */
export async function geminiGenerateWithFunction(
  apiKey: string,
  model: string,
  options: {
    messages: GeminiChatMessage[];
    functionName: string;
    description: string;
    functionSchema: Record<string, unknown>;
    temperature?: number;
  },
): Promise<Record<string, unknown>> {
  const { systemInstruction, contents } = splitMessages(options.messages);
  const body: Record<string, unknown> = {
    contents,
    tools: [
      {
        functionDeclarations: [
          {
            name: options.functionName,
            description: options.description,
            parameters: options.functionSchema,
          },
        ],
      },
    ],
    toolConfig: {
      functionCallingConfig: {
        mode: "ANY",
        allowedFunctionNames: [options.functionName],
      },
    },
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  if (options.temperature != null) {
    body.generationConfig = { temperature: options.temperature };
  }

  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseGeminiError(res);

  const json = (await res.json()) as Record<string, unknown>;
  const parts = (
    (json.candidates as Array<Record<string, unknown>> | undefined)?.[0]?.content as
      | Record<string, unknown>
      | undefined
  )?.parts as Array<Record<string, unknown>> | undefined;

  for (const part of parts ?? []) {
    const fc = part.functionCall as { name?: string; args?: Record<string, unknown> } | undefined;
    if (fc?.args && typeof fc.args === "object") return fc.args;
  }

  const text = extractTextFromResponse(json);
  if (text) {
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new GeminiError("invalid function json", 500);
    }
  }
  throw new GeminiError("empty function response", 500);
}

export async function geminiEmbedText(
  apiKey: string,
  text: string,
  model?: string,
): Promise<number[]> {
  const m = normalizeGeminiModel(model, defaultEmbeddingModel());
  const url = `${GEMINI_BASE}/models/${m}:embedContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
    }),
  });
  if (!res.ok) throw await parseGeminiError(res);
  const json = (await res.json()) as Record<string, unknown>;
  const embedding = json.embedding as Record<string, unknown> | undefined;
  const values = embedding?.values as number[] | undefined;
  if (!values?.length) throw new GeminiError("empty embedding", 500);
  return values;
}

export function defaultVisionModel(): string {
  return (
    Deno.env.get("GEMINI_MODEL_VISION") ??
    Deno.env.get("GEMINI_MODEL") ??
    geminiModels.models.vision
  );
}

/** Block SSRF — only Anthem project-media paths owned by the user. */
export function assertSafeAnthemImageUrl(url: string, userId: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new GeminiError("invalid image url", 400);
  }
  if (parsed.protocol !== "https:") {
    throw new GeminiError("https required", 400);
  }

  const blockedHost =
    /^(localhost|127\.0\.0\.1|0\.0\.0\.0|metadata\.google\.internal)$/i.test(parsed.hostname) ||
    /\.(local|internal)$/i.test(parsed.hostname) ||
    /^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname);
  if (blockedHost) {
    throw new GeminiError("image url not allowed", 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) throw new GeminiError("server misconfiguration", 500);

  const base = new URL(supabaseUrl);
  if (parsed.origin !== base.origin || !parsed.pathname.includes("/storage/v1/object/")) {
    throw new GeminiError("storage url required", 400);
  }

  const objectPath = parsed.pathname.split("/object/")[1] ?? "";
  const normalized = decodeURIComponent(objectPath).replace(/^\/+/, "");
  const segments = normalized.split("/");
  const pathInBucket =
    segments[0] === "public" || segments[0] === "authenticated" || segments[0] === "sign"
      ? segments.slice(2).join("/")
      : segments.slice(1).join("/");

  const allowed =
    pathInBucket.startsWith(`anthem/${userId}/`) || pathInBucket.startsWith(`${userId}/`);
  if (!allowed) {
    throw new GeminiError("image access denied", 403);
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export async function fetchUrlAsInlinePart(
  url: string,
  userId: string,
): Promise<{ inlineData: { mimeType: string; data: string } }> {
  assertSafeAnthemImageUrl(url, userId);
  const res = await fetch(url);
  if (!res.ok) throw new GeminiError(`image fetch failed: ${res.status}`, 502);
  const buf = new Uint8Array(await res.arrayBuffer());
  const mimeType = (res.headers.get("content-type") ?? "image/webp").split(";")[0]!.trim();
  return { inlineData: { mimeType, data: bytesToBase64(buf) } };
}

export async function geminiGenerateWithParts(
  apiKey: string,
  model: string,
  options: {
    systemInstruction: string;
    userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
    temperature?: number;
    maxOutputTokens?: number;
    json?: boolean;
  },
): Promise<string> {
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const gen: Record<string, unknown> = {};
  if (options.temperature != null) gen.temperature = options.temperature;
  if (options.maxOutputTokens != null) gen.maxOutputTokens = options.maxOutputTokens;
  if (options.json) gen.responseMimeType = "application/json";

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: options.userParts }],
    systemInstruction: { parts: [{ text: options.systemInstruction }] },
  };
  if (Object.keys(gen).length > 0) body.generationConfig = gen;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await parseGeminiError(res);

  const json = (await res.json()) as Record<string, unknown>;
  return extractTextFromResponse(json).trim();
}
