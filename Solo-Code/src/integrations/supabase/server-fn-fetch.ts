// Browser-side fetch interceptor that attaches the current Supabase session
// access token to every TanStack server-function request (`/_serverFn/*`).
//
// Without this, server functions protected by `requireSupabaseAuth` always
// 401 because the client never sends an Authorization header on its own.
import { supabase } from "./client";

const FLAG = "__lovable_serverfn_fetch_patched__";

if (typeof window !== "undefined" && !(window as any)[FLAG]) {
  (window as any)[FLAG] = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      const isServerFn = typeof url === "string" && url.includes("/_serverFn/");

      if (isServerFn) {
        const headers = new Headers(
          init?.headers ?? (input instanceof Request ? input.headers : undefined),
        );
        if (!headers.has("authorization") && !headers.has("Authorization")) {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (token) {
            headers.set("Authorization", `Bearer ${token}`);
            return originalFetch(input, { ...init, headers });
          }
        }
      }
    } catch {
      // Fall through to original fetch on any unexpected error
    }
    return originalFetch(input, init);
  };
}

export {};
