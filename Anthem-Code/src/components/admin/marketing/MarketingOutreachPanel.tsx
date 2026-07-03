import { useMemo, useState } from "react";
import { AlertTriangle, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { useMarketingBusinesses } from "@/hooks/admin/useMarketingBusinesses";
import { useMarketingLeads } from "@/hooks/admin/useMarketingLeads";
import { useMarketingInsights } from "@/hooks/admin/useMarketingInsights";
import { useMarketingInternalSignals } from "@/hooks/admin/useMarketingInternalSignals";
import {
  OUTREACH_TEMPLATES,
  useMarketingOutreach,
  type OutreachChannel,
  type OutreachTemplate,
} from "@/hooks/admin/useMarketingOutreach";
import { isInternalLead } from "@/lib/marketing/compliance";
import { MarketingCard } from "./MarketingShell";

export default function MarketingOutreachPanel() {
  const { activeBusiness, activeBusinessId } = useMarketingBusinesses();
  const { leads } = useMarketingLeads(activeBusinessId);
  const { signals } = useMarketingInternalSignals(activeBusinessId);
  const { runInsight, isRunning } = useMarketingInsights(activeBusinessId);
  const outreach = useMarketingOutreach(activeBusinessId);

  const [audience, setAudience] = useState<"internal" | "external">("internal");
  const [template, setTemplate] = useState<OutreachTemplate>("creator_publish");
  const [channel, setChannel] = useState<OutreachChannel>("in_app");
  const [userIdInput, setUserIdInput] = useState("");
  const [complianceOk, setComplianceOk] = useState(false);

  const tpl = OUTREACH_TEMPLATES[template];
  const [title, setTitle] = useState(tpl.title);
  const [message, setMessage] = useState(tpl.body);
  const [link, setLink] = useState(tpl.link);

  const qualifiedExternal = useMemo(
    () =>
      leads.filter(
        (l) =>
          !isInternalLead(l) &&
          (l.status === "qualified" || (l.lead_score ?? 0) >= 80) &&
          l.source_url.startsWith("http"),
      ),
    [leads],
  );

  const internalUserIds = useMemo(
    () =>
      signals
        .map((s) => s.userId)
        .filter((id): id is string => !!id)
        .slice(0, 20),
    [signals],
  );

  const applyTemplate = (key: OutreachTemplate) => {
    setTemplate(key);
    const t = OUTREACH_TEMPLATES[key];
    setTitle(t.title);
    setMessage(t.body);
    setLink(t.link);
  };

  const generate = async () => {
    try {
      const row = await runInsight({
        insightType: "outreach",
        title: "Outreach draft",
        context: {
          business: activeBusiness?.business_name ?? "",
          template,
          audience,
        },
      });
      setMessage(row.recommendation ?? message);
      toast.success("Outreach template updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const send = async () => {
    if (!complianceOk) {
      toast.error("ยืนยัน compliance ก่อนส่ง");
      return;
    }
    const ids =
      audience === "internal"
        ? userIdInput
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .concat(internalUserIds)
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 50)
        : [];
    if (audience === "internal" && ids.length === 0) {
      toast.error("ระบุ user_id หรือ sync signals ที่มี creator");
      return;
    }
    if (audience === "external") {
      toast.message("External: ใช้ draft + copy / mailto — ไม่ส่งอัตโนมัติ");
      return;
    }
    try {
      const result = await outreach.mutateAsync({
        channel,
        userIds: ids,
        title,
        body: message,
        link,
        template,
      });
      toast.success(`ส่ง in-app แล้ว ${result.sent}/${result.total}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    }
  };

  return (
    <div className="space-y-4">
      <MarketingCard className="marketing-callout-warn p-4">
        <div className="flex gap-2 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Anti-spam: ส่งเฉพาะ lead ที่มีสิทธิ์ติดต่อ โปร่งใส มี opt-out — ห้าม bulk DM โซเชียลภายนอก
        </div>
      </MarketingCard>

      <MarketingCard className="p-5">
        <h2 className="text-lg font-semibold text-admin-fg">Outreach</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            className="h-9 rounded-lg border border-admin-border px-2 text-sm"
            value={audience}
            onChange={(e) => setAudience(e.target.value as "internal" | "external")}
          >
            <option value="internal">Internal (in-app)</option>
            <option value="external">External (draft only)</option>
          </select>
          <select
            className="h-9 rounded-lg border border-admin-border px-2 text-sm"
            value={template}
            onChange={(e) => applyTemplate(e.target.value as OutreachTemplate)}
          >
            {Object.entries(OUTREACH_TEMPLATES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.labelTh}
              </option>
            ))}
          </select>
          {audience === "internal" && (
            <select
              className="h-9 rounded-lg border border-admin-border px-2 text-sm"
              value={channel}
              onChange={(e) => setChannel(e.target.value as OutreachChannel)}
            >
              <option value="in_app">In-app notification</option>
              <option value="email">Email (opt-in)</option>
              <option value="line">LINE (linked)</option>
            </select>
          )}
        </div>

        {audience === "internal" && (
          <input
            className="mt-3 h-9 w-full rounded-lg border border-admin-border px-3 text-sm"
            placeholder="user_id (คั่นด้วย comma) — หรือใช้จาก signals อัตโนมัติ"
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
          />
        )}

        {audience === "external" && (
          <p className="mt-2 text-sm text-admin-muted">
            Qualified external: {qualifiedExternal.length} — ใช้ copy ด้านล่างหรือ{" "}
            <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`}>
              mailto:
            </a>
          </p>
        )}

        <input
          className="mt-3 h-9 w-full rounded-lg border border-admin-border px-3 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <textarea
          className="mt-3 h-40 w-full rounded-lg border border-admin-border p-3 text-sm"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <input
          className="mt-2 h-9 w-full rounded-lg border border-admin-border px-3 text-sm"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link path e.g. /projects/new"
        />

        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={complianceOk} onChange={(e) => setComplianceOk(e.target.checked)} />
          ยืนยัน outreach โปร่งใส ไม่ spam และมีสิทธิ์ติดต่อ
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => void generate()}
            className="rounded-lg border border-admin-border px-4 py-2 text-sm"
          >
            Generate with AI
          </button>
          {audience === "internal" ? (
            <button
              type="button"
              disabled={outreach.isPending}
              onClick={() => void send()}
              className="marketing-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
            >
              <Send className="h-4 w-4" />
              Send {channel}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(message);
                toast.success("Copied draft");
              }}
              className="marketing-btn-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
            >
              <Mail className="h-4 w-4" />
              Copy draft
            </button>
          )}
        </div>
      </MarketingCard>
    </div>
  );
}
