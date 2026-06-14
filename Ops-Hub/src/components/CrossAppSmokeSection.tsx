import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { SO1O_APP_URL, ANTHEM_APP_URL } from "@/lib/links";

const SMOKE_CHECKS = [
  {
    id: "so1o_health",
    label: "So1o public",
    url: SO1O_APP_URL,
    handoff: null,
  },
  {
    id: "an1hem_health",
    label: "an1hem public",
    url: ANTHEM_APP_URL,
    handoff: null,
  },
  {
    id: "so1o_dashboard",
    label: "So1o dashboard (handoff target)",
    url: `${SO1O_APP_URL}/dashboard?from=anthem&tab=finance&sub=quotations`,
    handoff: "Anthem → Quotation",
  },
  {
    id: "an1hem_portfolio",
    label: "an1hem portfolio new (handoff target)",
    url: `${ANTHEM_APP_URL}/portfolio/new?from=so1o`,
    handoff: "So1o → Portfolio",
  },
];

export function CrossAppSmokeSection() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Cross-app smoke links</h2>
        <p className="mt-0.5 text-xs text-muted">
          เปิดลิงก์ handoff ด้วยตนเอง — ตรวจว่า query params ยัง prefill ได้
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {SMOKE_CHECKS.map((c) => (
          <a
            key={c.id}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3 text-sm hover:border-brand/40"
          >
            <div>
              <p className="font-medium">{c.label}</p>
              {c.handoff ? <p className="text-[10px] text-muted">{c.handoff}</p> : null}
            </div>
            <ExternalLink className="h-4 w-4 text-muted" />
          </a>
        ))}
      </div>
      <Link to="/connections" className="text-xs text-brand hover:underline">
        ดู conversion metrics ที่ Connections →
      </Link>
    </section>
  );
}
