export type AiBriefExtractResult = {
  client: { name: string; brand: string; contact: string };
  proposition: string;
  goal: string;
  deliverables: { name: string; quantity: number; formats: string[] }[];
  element_design: string;
  reference: string;
  style: string;
  timeline: { start: string; deadline: string };
  budget: string;
  note: string;
};
