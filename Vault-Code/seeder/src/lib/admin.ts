import { redirect } from "next/navigation";
import { createUserClient } from "./supabase/server";

export type AdminCheck = { status: "ok"; email: string } | { status: "forbidden"; email: string };

/** Signed-in user + `is_vault_super_admin()` on the database. Redirects to login when signed out. */
export async function checkAdmin(): Promise<AdminCheck> {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data, error } = await supabase.rpc("is_vault_super_admin");
  const email = user.email ?? "";
  if (error || data !== true) return { status: "forbidden", email };
  return { status: "ok", email };
}

/** For server actions: throws instead of rendering a page. */
export async function assertAdmin(): Promise<string> {
  const check = await checkAdmin();
  if (check.status !== "ok") throw new Error("not authorized");
  return check.email;
}
