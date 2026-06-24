import BriefcaseIcon from "../icons/BriefcaseIcon";
import { Link } from "react-router-dom";
import { useOpenJobs } from "@/hooks/useJobs";
import JobCard from "./JobCard";
import { ArrowRight } from "lucide-react";

/** Sticky job board rail shown on the right side of feed (desktop only). */
const JobBoardRail = () => {
  const { data: jobs = [], isLoading } = useOpenJobs({ limit: 5 });

  return (
    <aside className="hidden xl:block w-[320px] shrink-0">
      <div className="sticky top-[120px] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BriefcaseIcon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-medium tracking-tight thai-display">งานจาก Studio</h2>
          </div>
          <Link to="/jobs" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            ดูทั้งหมด <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl h-52 animate-pulse bg-muted/50 border border-border/40" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="glass-panel rounded-2xl p-5 text-center">
            <p className="text-xs text-muted-foreground thai-body">ยังไม่มีประกาศงานใหม่</p>
            <Link to="/studio/new" className="text-xs text-primary hover:underline mt-2 inline-block">
              ก่อตั้ง Studio เพื่อโพสต์งาน
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((j) => <JobCard key={j.id} job={j} compact />)}
          </div>
        )}
      </div>
    </aside>
  );
};

export default JobBoardRail;
