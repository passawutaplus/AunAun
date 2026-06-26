import { Link } from "react-router-dom";
import { useMyJobPosts, useMyApplications, useMySavedJobs } from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import JobCard from "@/components/jobs/JobCard";
import { Badge } from "@/components/ui/badge";
import { applicationStatusLabel } from "@/components/jobs/jobCardUtils";
import { cn } from "@/lib/utils";

type SubTab = "posted" | "applied" | "invited" | "saved";

interface Props {
  subTab: SubTab;
  onSubTabChange: (t: SubTab) => void;
}

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "posted", label: "ที่โพสต์" },
  { id: "applied", label: "ที่สมัคร" },
  { id: "invited", label: "ถูกชวน" },
  { id: "saved", label: "ที่บันทึก" },
];

const MyWorkPanel = ({ subTab, onSubTabChange }: Props) => {
  const { user } = useAuth();
  const { data: posted = [], isLoading: loadingPosted } = useMyJobPosts();
  const { data: applied = [], isLoading: loadingApplied } = useMyApplications();
  const { data: saved = [], isLoading: loadingSaved } = useMySavedJobs();

  const { data: invited = [], isLoading: loadingInvited } = useQuery({
    queryKey: ["my-hire-invites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hiring_requests")
        .select("*, job_post:job_posts(id, title, status)")
        .eq("freelancer_id", user!.id)
        .not("job_post_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading =
    (subTab === "posted" && loadingPosted) ||
    (subTab === "applied" && loadingApplied) ||
    (subTab === "saved" && loadingSaved) ||
    (subTab === "invited" && loadingInvited);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onSubTabChange(t.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              subTab === t.id ? "bg-gradient-brand text-white" : "glass-chip text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="h-48 rounded-2xl animate-pulse bg-muted/50" />)}
        </div>
      ) : subTab === "posted" ? (
        posted.length === 0 ? (
          <EmptyState text="ยังไม่มีประกาศที่โพสต์" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posted.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        )
      ) : subTab === "applied" ? (
        applied.length === 0 ? (
          <EmptyState text="ยังไม่ได้สมัครงาน" />
        ) : (
          <div className="space-y-2">
            {applied.map((a) => (
              <Link
                key={a.id}
                to={a.job ? `/jobs/${a.job_id}` : "#"}
                className="block glass-panel rounded-xl p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium thai-display text-sm">{(a.job as { title?: string })?.title ?? "ประกาศงาน"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      สมัคร {new Date(a.created_at).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {applicationStatusLabel[a.status] ?? a.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : subTab === "invited" ? (
        invited.length === 0 ? (
          <EmptyState text="ยังไม่มีคำชวน" />
        ) : (
          <div className="space-y-2">
            {invited.map((inv: { id: string; project_title: string; job_post_id: string | null; job_post?: { title?: string }; created_at: string; status: string }) => (
              <Link
                key={inv.id}
                to={inv.job_post_id ? `/jobs/${inv.job_post_id}` : "#"}
                className="block glass-panel rounded-xl p-4 hover:border-primary/30 transition-colors"
              >
                <p className="font-medium text-sm">{inv.job_post?.title ?? inv.project_title}</p>
                <p className="text-xs text-muted-foreground">ชวนเมื่อ {new Date(inv.created_at).toLocaleDateString("th-TH")} · {inv.status}</p>
              </Link>
            ))}
          </div>
        )
      ) : saved.length === 0 ? (
        <EmptyState text="ยังไม่มีประกาศที่บันทึก" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {saved.map((j) => <JobCard key={j.id} job={j} />)}
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="text-center py-12 glass-panel rounded-2xl">
    <p className="text-sm text-muted-foreground thai-body">{text}</p>
  </div>
);

export default MyWorkPanel;
