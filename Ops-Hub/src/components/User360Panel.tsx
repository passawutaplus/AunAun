import { Link } from "react-router-dom";
import { Crown, ExternalLink } from "lucide-react";
import type { User360Data } from "@/hooks/useUser360";
import { anthemAdmin, so1oAdmin } from "@/lib/links";
import { eventLabel } from "@/hooks/usePlatformEvents";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

export function User360Panel({ data }: { data: User360Data }) {
  const p = data.profile;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{p.display_name ?? p.username ?? "ไม่มีชื่อ"}</h2>
            {p.username ? <p className="text-sm text-muted">@{p.username}</p> : null}
            <p className="mt-1 font-mono text-[10px] text-muted">{p.user_id}</p>
          </div>
          <div className="flex items-center gap-2">
            {p.subscription_tier && p.subscription_tier !== "free" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                <Crown className="h-3 w-3" /> {p.subscription_tier}
              </span>
            ) : (
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">free</span>
            )}
            <span className="text-xs text-muted">สมัคร {fmtDate(p.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-xl border border-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-brand">So1o</h3>
          <ul className="space-y-1 text-sm">
            <li>ใบเสนอราคา: <strong>{data.so1o.quotations}</strong></li>
            <li>ตั๋วเปิด: <strong>{data.so1o.open_tickets}</strong></li>
          </ul>
          <a
            href={so1oAdmin("users")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-brand hover:underline"
          >
            So1o Admin <ExternalLink className="h-3 w-3" />
          </a>
        </section>
        <section className="rounded-xl border border-border bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-an1hem">an1hem</h3>
          <ul className="space-y-1 text-sm">
            <li>ผลงาน: <strong>{data.an1hem.projects}</strong> (เผยแพร่ {data.an1hem.published})</li>
            <li>ฟีดแบ็ก: <strong>{data.an1hem.feedback}</strong></li>
          </ul>
          <a
            href={anthemAdmin("/users")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-an1hem hover:underline"
          >
            an1hem Admin <ExternalLink className="h-3 w-3" />
          </a>
        </section>
        <section className="rounded-xl border border-dashed border-brand/30 bg-brand-soft/10 p-4">
          <h3 className="mb-2 text-sm font-semibold">Ecosystem</h3>
          <ul className="space-y-1 text-sm">
            <li>Cross-links: <strong>{data.ecosystem.cross_links}</strong></li>
            <li>Converted: <strong>{data.ecosystem.converted_links}</strong></li>
          </ul>
          <Link to="/connections" className="mt-3 inline-block text-xs text-brand hover:underline">
            ดู Connections
          </Link>
        </section>
      </div>

      {data.recent_links.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Cross-links ล่าสุด</h3>
          <ul className="space-y-1">
            {data.recent_links.map((l) => (
              <li key={l.id} className="rounded-lg border border-border bg-white px-3 py-2 text-xs">
                <span className="font-medium">{l.source_app}</span> · {l.source_page ?? "—"}
                <span className="ml-2 text-muted">{fmtDate(l.created_at)}</span>
                {l.converted ? (
                  <span className="ml-2 text-emerald-600">✓ converted</span>
                ) : (
                  <span className="ml-2 text-amber-600">รอ convert</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.recent_events.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold">กิจกรรมล่าสุด</h3>
          <ul className="space-y-1">
            {data.recent_events.map((ev, i) => (
              <li key={`${ev.event_type}-${i}`} className="rounded-lg border border-border bg-white px-3 py-2 text-xs">
                {eventLabel(ev.event_type)}
                <span className="ml-2 text-muted">{fmtDate(ev.created_at)}</span>
              </li>
            ))}
          </ul>
          <Link to="/activity" className="mt-2 inline-block text-xs text-brand hover:underline">
            ดู Activity ทั้งหมด
          </Link>
        </section>
      ) : null}
    </div>
  );
}
