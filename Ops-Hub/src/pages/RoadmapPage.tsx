import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useRoadmapItems } from "@/hooks/useOpsIssues";

export default function RoadmapPage() {
  const { data, isLoading, error } = useRoadmapItems();

  const quarters = [...new Set((data?.items ?? []).map((i) => i.quarter))].sort();
  const plannedFs = data?.plannedSuggestions ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Roadmap"
        subtitle="timeline ตาม quarter + feature_suggestions ที่ planned"
      />
      <div className="space-y-8 p-6">
        {error ? (
          <p className="text-sm text-red-600">{(error as Error).message}</p>
        ) : isLoading ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {quarters.length === 0 && plannedFs.length === 0 ? (
              <p className="text-sm text-muted">ยังไม่มี roadmap items</p>
            ) : null}
            {quarters.map((q) => (
              <section key={q}>
                <h2 className="mb-3 text-sm font-semibold">{q}</h2>
                <div className="space-y-2">
                  {(data?.items ?? [])
                    .filter((i) => i.quarter === q)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border bg-white px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.title}</span>
                          <span className="rounded bg-surface px-2 py-0.5 text-[10px]">
                            {item.status}
                          </span>
                          {item.projects?.name ? (
                            <span className="text-[10px] text-muted">{item.projects.name}</span>
                          ) : null}
                        </div>
                        {item.description ? (
                          <p className="mt-1 text-xs text-muted">{item.description}</p>
                        ) : null}
                      </div>
                    ))}
                </div>
              </section>
            ))}
            {plannedFs.length > 0 ? (
              <section>
                <h2 className="mb-3 text-sm font-semibold">Feature Suggestions (planned)</h2>
                <div className="space-y-2">
                  {plannedFs.map((fs: Record<string, unknown>) => (
                    <div
                      key={String(fs.id)}
                      className="rounded-xl border border-dashed border-brand/40 bg-brand-soft/20 px-4 py-3"
                    >
                      <p className="text-sm font-medium">{String(fs.title)}</p>
                      <p className="text-[10px] text-muted">จาก So1o users · upvotes {String(fs.upvotes ?? 0)}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
