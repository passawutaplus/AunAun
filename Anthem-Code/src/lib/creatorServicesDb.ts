/**
 * Typed access for anthem.creator_services (+ views) until generated Database
 * types include these tables. Call sites should use helpers here instead of
 * scattering `as never`.
 */
import { supabase } from "@/integrations/supabase/client";

export const CREATOR_SERVICES_SELECT =
  "id, owner_id, title, price_thb, price_min_thb, summary, deliverables, duration_label, concepts_label, revisions_label, cover_url, gallery_urls, category, tags, status, sort_order, created_at, updated_at";

export type CreatorServiceRow = {
  id: string;
  owner_id: string;
  title: string;
  price_thb: number;
  price_min_thb: number | null;
  summary: string;
  deliverables: string[] | null;
  duration_label: string;
  concepts_label: string;
  revisions_label: string;
  cover_url: string | null;
  gallery_urls: string[] | null;
  category: string | null;
  tags: string[] | null;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CreatorServiceInsert = {
  owner_id: string;
  title: string;
  price_thb: number;
  price_min_thb: number;
  summary: string;
  deliverables: string[];
  duration_label: string;
  concepts_label: string;
  revisions_label: string;
  cover_url: string | null;
  gallery_urls: string[];
  category: string;
  tags: string[];
  status: string;
  sort_order: number;
  updated_at: string;
};

export type CreatorServiceUpdate = Partial<CreatorServiceInsert> & {
  sort_order?: number;
  updated_at?: string;
};

export type CreatorServiceViewRow = {
  viewer_id: string;
  service_id: string;
  owner_id: string;
  viewed_at: string;
  referrer_project_id: string | null;
};

/**
 * Anthem tables missing from generated Database types.
 * Returns an untyped PostgREST builder; row narrowing happens via asCreatorServiceRow*.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnthemTableClient = { from: (table: string) => any };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromCreatorServices(): any {
  return (supabase as unknown as AnthemTableClient).from("creator_services");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromCreatorServiceViews(): any {
  return (supabase as unknown as AnthemTableClient).from("creator_service_views");
}

/** Narrow query results to CreatorServiceRow without `as never` at call sites. */
export function asCreatorServiceRows(data: unknown): CreatorServiceRow[] {
  if (!Array.isArray(data)) return [];
  return data as CreatorServiceRow[];
}

export function asCreatorServiceRow(data: unknown): CreatorServiceRow | null {
  if (!data || typeof data !== "object") return null;
  return data as CreatorServiceRow;
}
