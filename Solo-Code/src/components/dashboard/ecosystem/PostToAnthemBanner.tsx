import * as React from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { anthemPortfolioNewUrl, trackCrossLink } from "@/lib/crossLink";

type Props = {
  jobId?: string;
  jobTitle: string;
  clientName?: string | null;
  previewImageUrl?: string | null;
  tags?: string[];
};

/** Deep-link to Anthem project editor with prefill + ecosystem_links tracking. */
export function PostToAnthemBanner({ jobId, jobTitle, clientName, previewImageUrl, tags }: Props) {
  const [href, setHref] = React.useState(() =>
    anthemPortfolioNewUrl({
      jobTitle,
      clientName,
      jobId,
      coverUrl: previewImageUrl ?? undefined,
      tags,
    }),
  );

  React.useEffect(() => {
    let cancelled = false;
    void trackCrossLink({
      source: "job_tracker_post_anthem",
      refId: jobId,
      meta: {
        job_title: jobTitle.slice(0, 80),
        has_preview: previewImageUrl ? 1 : 0,
      },
    }).then((linkId) => {
      if (cancelled) return;
      setHref(
        anthemPortfolioNewUrl({
          jobTitle,
          clientName,
          jobId,
          linkId: linkId ?? undefined,
          coverUrl: previewImageUrl ?? undefined,
          tags,
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [jobId, jobTitle, clientName, previewImageUrl, tags]);

  const openAnthem = () => {
    window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">ปิดลูป — โพสต์ผลงานบน Pixel100</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            งานเสร็จแล้ว? นำผลงานไปหน้าร้านเพื่อรับงานใหม่ — ชื่อโปรเจกต์จะถูก prefill จาก Job
            Tracker
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 gap-1.5 border-primary/30"
        onClick={openAnthem}
      >
        โพสต์ผลงาน
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
