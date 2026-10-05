"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin";
import { audit } from "@/lib/admin-rpc";
import { OpsRepo } from "@/ops/repo";
import { SupabaseSeederRepo } from "@/seeder/repo";

const UUID = /^[0-9a-f-]{36}$/i;
const TERM_ID = /^[a-z0-9_.]{3,80}$/;

function uuid(formData: FormData, key = "id"): string {
  const v = String(formData.get(key) ?? "");
  if (!UUID.test(v)) throw new Error(`invalid ${key}`);
  return v;
}

export async function approveItem(formData: FormData) {
  const by = await assertAdmin();
  const id = uuid(formData);
  await new OpsRepo().approveReview(id, by);
  await audit("review.approve", "discover_item", id);
  revalidatePath("/admin/review");
}

export async function rejectItem(formData: FormData) {
  const by = await assertAdmin();
  const id = uuid(formData);
  await new OpsRepo().rejectReview(id, by);
  await audit("review.reject", "discover_item", id);
  revalidatePath("/admin/review");
}

export async function proposeSynonym(formData: FormData) {
  await assertAdmin();
  const term = String(formData.get("term") ?? "").trim().slice(0, 40);
  const lang = ["th", "en", "mixed", "und"].includes(String(formData.get("lang"))) ? String(formData.get("lang")) : "und";
  const termId = String(formData.get("term_id") ?? "").trim();
  if (term.length < 2 || !TERM_ID.test(termId)) throw new Error("ใส่ id ของคำให้ถูก เช่น sty.minimal");
  await new OpsRepo().proposeSynonym(term, lang, termId);
  await audit("taxonomy.propose", "unknown_term", term, { termId, lang });
  revalidatePath("/admin/review");
}

export async function ignoreTerm(formData: FormData) {
  await assertAdmin();
  const term = String(formData.get("term") ?? "").slice(0, 40);
  const lang = String(formData.get("lang") ?? "und");
  await new OpsRepo().ignoreUnknown(term, lang);
  revalidatePath("/admin/review");
}

/** Takedown follow-ups used from /admin/reports. */
export async function restoreItem(formData: FormData) {
  await assertAdmin();
  const id = uuid(formData);
  await new SupabaseSeederRepo().setItemStatus(id, "published");
  await audit("takedown.restore", "discover_item", id);
  revalidatePath("/admin/reports");
}

export async function deleteItemPermanently(formData: FormData) {
  const by = await assertAdmin();
  const id = uuid(formData);
  await new OpsRepo().deleteTakedown(id, by);
  await audit("takedown.delete", "discover_item", id);
  revalidatePath("/admin/reports");
}
