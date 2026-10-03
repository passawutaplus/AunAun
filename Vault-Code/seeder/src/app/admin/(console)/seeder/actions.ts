"use server";

import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";
import { runRequested } from "@/inngest/events";
import { isSourceKey } from "@/seeder/adapters";
import { SupabaseSeederRepo } from "@/seeder/repo";
import { assertAdmin } from "@/lib/admin";
import { audit } from "@/lib/admin-rpc";

const PATH = "/admin/seeder";

export async function setPaused(formData: FormData) {
  await assertAdmin();
  const paused = formData.get("paused") === "true";
  await new SupabaseSeederRepo().setPaused(paused);
  await audit(paused ? "seeder.pause" : "seeder.resume", "seeder", "");
  revalidatePath(PATH);
}

export async function runNow(formData: FormData) {
  const email = await assertAdmin();
  const repo = new SupabaseSeederRepo();
  if (await repo.isPaused()) throw new Error("Seeder is paused. Resume before running.");
  const category = String(formData.get("category") ?? "").trim() || undefined;
  await inngest.send(runRequested.create({ category, requestedBy: email }));
  await audit("seeder.run", "seeder", category ?? "all");
  revalidatePath(PATH);
}

export async function updateTarget(formData: FormData) {
  await assertAdmin();
  const category = String(formData.get("category") ?? "");
  const source = String(formData.get("source") ?? "");
  if (!category || !isSourceKey(source)) throw new Error("invalid target");

  const targetCount = Number.parseInt(String(formData.get("target_count") ?? ""), 10);
  const patch: { target_count?: number; enabled?: boolean; exhausted?: boolean } = {
    enabled: formData.get("enabled") === "on",
  };
  if (Number.isFinite(targetCount) && targetCount > 0 && targetCount <= 100_000) patch.target_count = targetCount;
  if (formData.get("reset_exhausted") === "on") patch.exhausted = false;

  await new SupabaseSeederRepo().updateTarget(category, source, patch);
  await audit("seeder.target", "seed_target", `${category}/${source}`, patch);
  revalidatePath(PATH);
}

export async function setItemVisibility(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "published" ? "published" : "hidden";
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("invalid id");
  await new SupabaseSeederRepo().setItemStatus(id, status);
  await audit(`discover.${status}`, "discover_item", id);
  revalidatePath(PATH);
}
