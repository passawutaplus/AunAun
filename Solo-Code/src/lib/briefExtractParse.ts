import type { AiBriefExtractResult } from "@/lib/briefExtractTypes";

export function parseBriefExtractJson(content: string): AiBriefExtractResult {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI ตอบกลับในรูปแบบไม่ถูกต้อง");
  }

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const obj = (v: unknown): Record<string, unknown> =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const client = obj(parsed.client);
  const timeline = obj(parsed.timeline);
  const deliverables = Array.isArray(parsed.deliverables)
    ? parsed.deliverables
        .map((d) => {
          const o = obj(d);
          const formats = Array.isArray(o.formats)
            ? o.formats.filter((x): x is string => typeof x === "string")
            : [];
          const qRaw = o.quantity;
          const quantity =
            typeof qRaw === "number"
              ? Math.max(1, Math.round(qRaw))
              : typeof qRaw === "string"
                ? Math.max(1, parseInt(qRaw, 10) || 1)
                : 1;
          return { name: str(o.name), quantity, formats };
        })
        .filter((d) => d.name)
    : [];

  return {
    client: {
      name: str(client.name),
      brand: str(client.brand),
      contact: str(client.contact),
    },
    proposition: str(parsed.proposition),
    goal: str(parsed.goal),
    deliverables,
    element_design: str(parsed.element_design),
    reference: str(parsed.reference),
    style: str(parsed.style),
    timeline: {
      start: str(timeline.start),
      deadline: str(timeline.deadline),
    },
    budget: str(parsed.budget),
    note: str(parsed.note),
  };
}
