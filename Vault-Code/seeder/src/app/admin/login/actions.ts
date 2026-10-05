"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/admin/login?error=missing");

  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/admin/login?error=invalid");
  redirect("/admin");
}

export async function signInWithGoogle() {
  const origin = (await headers()).get("origin") ?? process.env.SEEDER_SITE_URL ?? "";
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/admin/login?error=oauth");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
