import { useQuery } from "@tanstack/react-query";
import { MessageSquareQuote, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import { formatThaiDate } from "@/lib/format";
import { profilesPublicFrom } from "@/lib/profileAccess";

type ReviewRow = {
  id: string;
  rating: number | null;
  body: string | null;
  created_at: string;
  reply_body: string | null;
  author_user_id: string;
};

type AuthorRow = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

function usePackageReviews(serviceId: string) {
  return useQuery({
    queryKey: ["package-reviews", serviceId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_reviews" as never)
        .select("id, rating, body, created_at, reply_body, author_user_id")
        .eq("service_id", serviceId)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const rows = (data ?? []) as unknown as ReviewRow[];
      const ids = [...new Set(rows.map((r) => r.author_user_id))];
      let authors: AuthorRow[] = [];
      if (ids.length) {
        const res = await profilesPublicFrom().select("user_id, display_name, username, avatar_url").in("user_id", ids);
        authors = ((res.data ?? []) as { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null }[]).map(
          (p) => ({ id: p.user_id, display_name: p.display_name, username: p.username, avatar_url: p.avatar_url }),
        );
      }
      const byId = new Map(authors.map((a) => [a.id, a]));
      return rows.map((r) => ({ ...r, author: byId.get(r.author_user_id) ?? null }));
    },
  });
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} ดาว`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={i <= Math.round(value) ? "h-3.5 w-3.5 fill-amber-400 text-amber-400" : "h-3.5 w-3.5 text-muted-foreground/40"}
          aria-hidden
        />
      ))}
    </span>
  );
}

/**
 * Reviews left on this package after a finished job. The write flow (hire → deliver → review) comes later;
 * until then this shows what exists, or an empty state.
 */
export default function ServicePackageReviews({ serviceId }: { serviceId: string }) {
  const { data: reviews = [], isLoading } = usePackageReviews(serviceId);
  const rated = reviews.filter((r) => Number(r.rating) > 0);
  const avg = rated.length ? rated.reduce((s, r) => s + Number(r.rating), 0) / rated.length : null;

  return (
    <section className="space-y-3" aria-labelledby="package-reviews-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="package-reviews-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
          <MessageSquareQuote className="h-4 w-4" aria-hidden />
          รีวิว
          {reviews.length ? <span className="text-sm font-normal text-muted-foreground">({reviews.length})</span> : null}
        </h2>
        {avg != null ? (
          <span className="flex items-center gap-1.5 text-sm tabular-nums text-foreground">
            <Stars value={avg} />
            {avg.toFixed(1)}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
      ) : reviews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
          ยังไม่มีรีวิว — รีวิวจะขึ้นเมื่อลูกค้าจ้างงานผ่านแพ็กเกจนี้และปิดงานแล้ว
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => {
            const name = r.author?.display_name?.trim() || r.author?.username?.trim() || "ลูกค้า";
            return (
              <li key={r.id} className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-3.5">
                <div className="flex items-center gap-2.5">
                  <UserAvatar src={r.author?.avatar_url} name={name} username={r.author?.username} className="h-7 w-7" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatThaiDate(r.created_at)}</p>
                  </div>
                  {Number(r.rating) > 0 ? <Stars value={Number(r.rating)} /> : null}
                </div>
                {r.body?.trim() ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{r.body}</p>
                ) : null}
                {r.reply_body?.trim() ? (
                  <p className="border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">ตอบกลับจากครีเอเตอร์: </span>
                    {r.reply_body}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
