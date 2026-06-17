import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, User } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useUserSearch } from "@/hooks/useUser360";
import { NAV_LABELS } from "@/lib/labels-th";

export default function UsersPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const { data, isLoading, error } = useUserSearch(debounced);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebounced(query);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title={NAV_LABELS.users}
        subtitle="ค้นหาบัญชี — ดู So1o + Pixel100 + ecosystem จากที่เดียว"
      />

      <main className="space-y-6 p-6">
        <form onSubmit={onSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ชื่อ, username หรือ user_id..."
              className="w-full rounded-xl border border-border py-2.5 pl-10 pr-4 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
          >
            ค้นหา
          </button>
        </form>

        {error ? (
          <p className="text-sm text-red-600">ค้นหาไม่สำเร็จ — ตรวจ migration admin_search_users</p>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ul className="space-y-2">
            {(data ?? []).map((u) => (
              <li key={u.user_id}>
                <Link
                  to={`/users/${u.user_id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 transition hover:border-brand/40 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                    <User className="h-5 w-5 text-muted" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {u.display_name ?? u.username ?? "ไม่มีชื่อ"}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {u.username ? `@${u.username} · ` : ""}
                      {u.subscription_tier ?? "free"} · {u.user_id.slice(0, 8)}…
                    </p>
                  </div>
                </Link>
              </li>
            ))}
            {!isLoading && debounced === "" && (data ?? []).length === 0 ? (
              <p className="text-sm text-muted">พิมพ์คำค้นแล้วกด ค้นหา — หรือเว้นว่างเพื่อดูสมาชิกล่าสุด</p>
            ) : null}
          </ul>
        )}
      </main>
    </div>
  );
}
