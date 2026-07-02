import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useKuyRadarBusinesses } from "@/hooks/admin/useKuyRadarBusinesses";
import { useKuyRadarContent } from "@/hooks/admin/useKuyRadarContent";
import { KUY_PLATFORMS } from "@/lib/kuy-radar/types";
import { KuyRadarCard } from "./KuyRadarShell";

export default function KuyContentTable() {
  const { activeBusinessId } = useKuyRadarBusinesses();
  const { contentItems, createContent } = useKuyRadarContent(activeBusinessId);
  const [form, setForm] = useState({
    title: "",
    platform: KUY_PLATFORMS[0],
    content_url: "",
    hook: "",
  });

  const add = async () => {
    try {
      await createContent({
        competitor_id: null,
        platform: form.platform,
        content_url: form.content_url,
        content_type: "post",
        title: form.title || null,
        caption: null,
        hook: form.hook || null,
        cta: null,
        engagement: null,
        hashtags: null,
        sentiment: null,
        ai_summary: null,
        why_it_worked: null,
        suggested_adaptation: null,
      });
      toast.success("Content tracked");
      setForm({ title: "", platform: KUY_PLATFORMS[0], content_url: "", hook: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <KuyRadarCard className="p-5">
        <h2 className="text-lg font-semibold text-admin-fg">Track content URL</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            className="rounded-lg border border-admin-border px-3 py-2 text-sm"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <select
            className="rounded-lg border border-admin-border px-3 py-2 text-sm"
            value={form.platform}
            onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
          >
            {KUY_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            className="md:col-span-2 rounded-lg border border-admin-border px-3 py-2 text-sm"
            placeholder="Content URL"
            value={form.content_url}
            onChange={(e) => setForm((f) => ({ ...f, content_url: e.target.value }))}
          />
          <input
            className="md:col-span-2 rounded-lg border border-admin-border px-3 py-2 text-sm"
            placeholder="Hook"
            value={form.hook}
            onChange={(e) => setForm((f) => ({ ...f, hook: e.target.value }))}
          />
        </div>
        <button type="button" onClick={() => void add()} className="kuy-btn-primary mt-3 rounded-lg px-4 py-2 text-sm">
          Save
        </button>
      </KuyRadarCard>
      <KuyRadarCard className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-admin-hover/50 text-xs uppercase text-admin-muted">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Platform</th>
              <th className="px-4 py-3 text-left">Hook</th>
              <th className="px-4 py-3 text-left">URL</th>
            </tr>
          </thead>
          <tbody>
            {contentItems.map((c) => (
              <tr key={c.id} className="border-b border-admin-border">
                <td className="px-4 py-3 font-medium">{c.title}</td>
                <td className="px-4 py-3">{c.platform}</td>
                <td className="px-4 py-3 text-admin-muted">{c.hook}</td>
                <td className="px-4 py-3">
                  <a href={c.content_url} target="_blank" rel="noopener noreferrer" className="kuy-link inline-flex gap-1">
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </KuyRadarCard>
    </div>
  );
}
