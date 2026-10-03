import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const target = new URL("/admin", request.nextUrl.origin);
  if (!code) return NextResponse.redirect(new URL("/admin/login?error=callback", request.nextUrl.origin));

  const supabase = await createUserClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/admin/login?error=callback", request.nextUrl.origin));
  return NextResponse.redirect(target);
}
