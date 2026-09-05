import { describe, expect, it } from "vitest";
import { applyLenyShowcase, catalogJobId, LENY_SHOWCASE } from "./jobShowcase";
import type { JobPost } from "@/hooks/useJobs";

const seedJob = (id: string): JobPost =>
  ({
    id,
    studio_id: null,
    posted_by: "user",
    title: "seed title",
    role_category: "Design",
    description: "ประกาศงานจากสตูดิโอในชุมชน an1hem",
    skills: ["Figma"],
    budget_min: 1,
    budget_max: 2,
    budget_type: "fixed",
    location_type: "onsite",
    location: "Bangkok",
    deadline: null,
    status: "open",
    applicants_count: 0,
    views: 0,
    created_at: "",
    updated_at: "",
    post_type: "hiring",
    poster_role: "studio",
    employment_type: "project",
    attached_cv_url: null,
    attached_portfolio_ids: [],
    cover_image_url: null,
  }) as JobPost;

describe("applyLenyShowcase", () => {
  it("overlays a full job brief onto catalog seed posts", () => {
    const photographer = LENY_SHOWCASE.find((j) => j.id === catalogJobId(2));
    expect(photographer).toBeTruthy();
    const [job] = applyLenyShowcase([seedJob(catalogJobId(2))]);
    expect(job.title).toBe(photographer!.title);
    expect(job.description).toContain("lookbook");
    expect(job.requirements_must?.length).toBeGreaterThanOrEqual(3);
    expect(job.perks?.length).toBeGreaterThan(0);
    expect(job.deliverables?.length).toBeGreaterThan(0);
    expect(job.deliverables?.[0]).not.toBe(job.perks?.[0]);
    expect(job.exclusions_note).toBeTruthy();
    expect(job.workplace_address).toBeTruthy();
    expect(job.gallery_urls).toHaveLength(6);
    expect(job.gallery_urls).not.toContain(job.cover_image_url);
  });
});
