import type { JobPost } from "@/hooks/useJobs";
import JobCard from "./JobCard";

export type JobCardPreviewData = {
  title: string;
  description: string;
  role_category: string;
  skills: string[];
  budget_min: number | null;
  budget_max: number | null;
  budget_type: JobPost["budget_type"];
  location_type: JobPost["location_type"];
  location: string;
  employment_type: JobPost["employment_type"];
  post_type: JobPost["post_type"];
  cover_image_url: string | null;
  posterName: string;
  posterAvatar?: string | null;
  studio?: { name: string; avatar_url: string; verified?: boolean };
};

type Props = {
  data: JobCardPreviewData;
};

const JobCardPreview = ({ data }: Props) => {
  const previewJob: JobPost = {
    id: "preview",
    studio_id: null,
    posted_by: "preview",
    title: data.title.trim() || "ชื่อตำแหน่งงาน",
    role_category: data.role_category,
    description: data.description.trim() || "รายละเอียดงานจะแสดงที่นี่",
    skills: data.skills,
    budget_min: data.budget_min,
    budget_max: data.budget_max,
    budget_type: data.budget_type,
    location_type: data.location_type,
    location: data.location,
    deadline: null,
    status: "open",
    applicants_count: 0,
    views: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    post_type: data.post_type,
    poster_role: "company",
    employment_type: data.employment_type,
    attached_cv_url: null,
    attached_portfolio_ids: [],
    cover_image_url: data.cover_image_url,
    studio: data.studio,
    poster: data.studio
      ? undefined
      : {
          display_name: data.posterName,
          avatar_url: data.posterAvatar ?? null,
          username: null,
        },
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">ตัวอย่างการ์ดบนบอร์ด</p>
      <div className="pointer-events-none max-w-sm mx-auto">
        <JobCard job={previewJob} />
      </div>
    </div>
  );
};

export default JobCardPreview;
