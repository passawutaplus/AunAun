import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, Wrench, Bug } from "lucide-react";

type Entry = {
  id: string;
  version: string;
  title: string;
  body: string;
  tag: string;
  released_at: string;
};

const TAG_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  feature: {
    label: "ใหม่",
    color: "bg-orange-100 text-[#FF5F05]",
    icon: <Sparkles className="h-3 w-3" />,
  },
  improvement: {
    label: "ปรับปรุง",
    color: "bg-blue-100 text-blue-700",
    icon: <Wrench className="h-3 w-3" />,
  },
  fix: {
    label: "แก้บั๊ก",
    color: "bg-green-100 text-green-700",
    icon: <Bug className="h-3 w-3" />,
  },
};

export function SupportChangelog() {
  const [items, setItems] = React.useState<Entry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("changelog_entries")
        .select("id, version, title, body, tag, released_at")
        .eq("is_published", true)
        .order("released_at", { ascending: false })
        .limit(30);
      setItems((data as Entry[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="h-full overflow-y-auto p-4">
      {loading ? (
        <div className="text-center py-10 text-xs text-gray-400">
          <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
          กำลังโหลด...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-xs text-gray-500">ยังไม่มีอัปเดต</div>
      ) : (
        <div className="space-y-3">
          {items.map((e) => {
            const meta = TAG_META[e.tag] ?? TAG_META.feature;
            return (
              <div key={e.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${meta.color}`}
                    >
                      {meta.icon}
                      {meta.label}
                    </span>
                    <span className="text-[11px] font-mono text-gray-500">{e.version}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(e.released_at).toLocaleDateString("th-TH", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">{e.title}</h4>
                {e.body && (
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {e.body}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
