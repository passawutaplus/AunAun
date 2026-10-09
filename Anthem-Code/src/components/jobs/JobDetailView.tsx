import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bookmark, Check, Expand, Loader2, Mail, MapPin, MessageCircle, Phone, Send, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { requireAuth } from "@/lib/requireAuth";
import { useSavedJobIds, useToggleSaveJob, type ApplicationStatus, type JobPost } from "@/hooks/useJobs";
import { canApplicantOpenJobChat } from "@/lib/jobApplicationReview";
import HireTargetProfilePreview from "@/components/opportunity/HireTargetProfilePreview";
import ImageLightbox from "@/components/project/ImageLightbox";
import { cn } from "@/lib/utils";
import { empLabel, fmtBudget, fmtDeadlineChip, getPosterInfo } from "@/components/jobs/jobCardUtils";
import { showcaseCoverUrl } from "@/components/jobs/jobShowcase";
import { JOB_APPLY_PLATFORM_DISCLAIMER } from "@/lib/legalSignupCopy";
import { parseSocialLinks, SOCIAL_KIND_LABEL, normalizeSocialUrl } from "@/lib/hiringOrg";
import { jobDescriptionParts, jobResponsibilities } from "@/lib/jobBrief";
import { safeHttpUrl } from "@/lib/safeUrl";

type Props = {
  job: JobPost;
  alreadyApplied?: boolean;
  applicationStatus?: ApplicationStatus | null;
  conversationId?: string | null;
  rejectReasonLabel?: string | null;
  isOwner?: boolean;
  applyBusy?: boolean;
  onApply: () => void;
  onOpenChat?: () => void;
  onManage?: () => void;
};

const workMode = (job: JobPost) => {
  if (job.location_type === "remote") return "WFH 100%";
  if (job.location_type === "hybrid") return "Hybrid";
  return "Onsite";
};

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((d, i) => (
          <li key={`${d}-${i}`} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{d}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function JobDetailView({
  job,
  alreadyApplied,
  applicationStatus,
  conversationId,
  rejectReasonLabel,
  isOwner,
  applyBusy,
  onApply,
  onOpenChat,
  onManage,
}: Props) {
  const { user } = useAuth();
  const { data: savedIds } = useSavedJobIds();
  const toggleSave = useToggleSaveJob();
  const isSaved = savedIds?.has(job.id) ?? false;
  const { name, avatar, verified } = getPosterInfo(job);
  const media = useMemo(() => {
    const urls = [showcaseCoverUrl(job.id) ?? job.cover_image_url, ...(job.gallery_urls ?? [])].filter((u): u is string => !!u?.trim());
    return Array.from(new Set(urls));
  }, [job.id, job.cover_image_url, job.gallery_urls]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const active = media[Math.min(activeIdx, Math.max(0, media.length - 1))] ?? null;
  const socials = parseSocialLinks(job.social_links);
  const must = (job.requirements_must ?? []).map((s) => s.trim()).filter(Boolean);
  const nice = (job.requirements_nice ?? []).map((s) => s.trim()).filter(Boolean);
  const perks = (job.perks ?? []).map((s) => s.trim()).filter(Boolean);
  const duties = jobResponsibilities(job);
  const { intro, after } = jobDescriptionParts(job);
  const deadline = fmtDeadlineChip(job.deadline);
  const chips = [job.role_category, empLabel[job.employment_type], workMode(job)].filter(Boolean);
  const email = job.contact_email?.trim();
  const phone = job.contact_phone?.trim();
  const workplace = job.workplace_address?.trim() || job.location?.trim();
  const meeting = job.meeting_location?.trim();
  const showMeeting = !!meeting;

  const mailtoHref = email
    ? `mailto:${email}?subject=${encodeURIComponent(`สมัครงาน ${job.title}`)}`
    : null;

  const saveBtn = !isOwner ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-11 w-11 rounded-full shrink-0 border border-border/70"
      onClick={() => requireAuth(user, () => toggleSave.mutate({ jobId: job.id, saved: isSaved }))}
      aria-label={isSaved ? "ลบจากที่บันทึก" : "บันทึกงาน"}
    >
      <Bookmark className={cn("w-5 h-5", isSaved && "fill-primary text-primary")} />
    </Button>
  ) : null;

  const withSave = (main: ReactNode) =>
    saveBtn ? (
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">{main}</div>
        {saveBtn}
      </div>
    ) : (
      main
    );

  const primaryCta = () => {
    if (isOwner) {
      return (
        <Button type="button" className="w-full rounded-full min-h-11" onClick={onManage}>
          ดูผู้สมัคร
        </Button>
      );
    }
    if (job.status !== "open") {
      return withSave(
        <Button type="button" className="w-full rounded-full min-h-11" disabled>
          ปิดรับแล้ว
        </Button>,
      );
    }
    if (alreadyApplied) {
      if (canApplicantOpenJobChat(applicationStatus, conversationId) && onOpenChat) {
        return withSave(
          <Button type="button" className="w-full rounded-full min-h-11 gap-1.5" onClick={onOpenChat}>
            <MessageCircle className="w-4 h-4" />
            เปิดแชทกับบริษัท
          </Button>,
        );
      }
      if (applicationStatus === "rejected") {
        return withSave(
          <Button type="button" className="w-full rounded-full min-h-11" disabled>
            {rejectReasonLabel ? `ไม่ผ่าน · ${rejectReasonLabel}` : "ไม่ผ่านการพิจารณา"}
          </Button>,
        );
      }
      return withSave(
        <Button type="button" className="w-full rounded-full min-h-11" disabled>
          ส่งแล้ว · รอบริษัทติดต่อ
        </Button>,
      );
    }
    return withSave(
      <Button type="button" className="w-full rounded-full min-h-11 gap-1.5" disabled={applyBusy} onClick={onApply}>
        {applyBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        สมัครงาน
      </Button>,
    );
  };

  const priceBlock = (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <p className="text-2xl font-semibold text-primary tabular-nums lg:text-[1.75rem]">{fmtBudget(job)}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          {empLabel[job.employment_type]} · <span className="text-foreground font-medium">{workMode(job)}</span>
        </span>
        {deadline ? (
          <span>
            ปิดรับ: <span className="text-foreground font-medium">{deadline}</span>
          </span>
        ) : job.headcount ? (
          <span>
            รับ: <span className="text-foreground font-medium">{job.headcount} คน</span>
          </span>
        ) : null}
      </div>
      <div className="hidden md:block space-y-2">
        {primaryCta()}
        {!isOwner && job.status === "open" && mailtoHref ? (
          <Button type="button" variant="outline" className="w-full rounded-full min-h-11 gap-1.5" asChild>
            <a href={mailtoHref}>
              <Mail className="w-4 h-4" />
              ส่งเมลสมัครงาน
            </a>
          </Button>
        ) : null}
        <p className="text-center text-[11px] text-muted-foreground leading-relaxed">{JOB_APPLY_PLATFORM_DISCLAIMER}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-0">
      <div className="grid grid-cols-1 items-start md:grid-cols-[1.35fr_1fr] lg:grid-cols-[1.45fr_1fr]">
        <div className="space-y-3 p-4 md:p-5 lg:p-6 md:border-r border-border/50">
          <HireTargetProfilePreview
            name={name}
            username={job.hiring_org ? undefined : job.poster?.username}
            avatarUrl={avatar}
            role={verified ? "นิติบุคคลยืนยันแล้ว" : job.hiring_org?.province || undefined}
            label="ผู้จ้างงาน"
            freelancerId={job.posted_by}
          />

          <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/20">
            <div className="aspect-[4/3] bg-black/20">
              {active ? (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="group relative block h-full w-full cursor-zoom-in"
                  aria-label="ดูภาพเต็ม"
                >
                  <img loading="lazy" decoding="async" src={active} alt="" className="h-full w-full object-cover" />
                  <span className="pointer-events-none absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white">
                    <Expand className="h-3.5 w-3.5" />
                  </span>
                </button>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground px-6 text-center">
                  {job.title}
                </div>
              )}
            </div>
          </div>

          {media.length > 1 ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {media.slice(1, 7).map((url, i) => {
                const idx = i + 1;
                return (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={cn(
                      "relative aspect-[4/3] overflow-hidden rounded-lg border",
                      idx === activeIdx ? "border-primary ring-1 ring-primary" : "border-border/60",
                    )}
                    aria-label={`ดูภาพเพิ่ม ${i + 1}`}
                  >
                    <img loading="lazy" decoding="async" src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          ) : null}

          <h2 className="text-xl md:text-2xl font-semibold tracking-tight leading-tight">{job.title}</h2>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((tag) => (
              <Link
                key={tag}
                to={`/hiring?q=${encodeURIComponent(tag)}`}
                className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium hover:border-primary/40 hover:text-primary"
              >
                {tag}
              </Link>
            ))}
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">รายละเอียด</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {intro || "ไม่มีรายละเอียดเพิ่มเติม"}
              </p>
            </div>

            <DetailList title="หน้าที่หลัก" items={duties} />

            {after ? (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{after}</p>
            ) : null}

            {job.skills?.filter((s) => s.trim()).length ? (
              <div className="flex flex-wrap gap-1.5">
                {job.skills.filter((s) => s.trim()).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 md:p-5 lg:p-6 pb-24 md:pb-6 md:self-start min-w-0">
          {priceBlock}

          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
            <DetailList title="คุณสมบัติที่ต้องมี" items={must} />
            <DetailList title="จะมีด้วยดี" items={nice} />
            <DetailList title="สิ่งที่ตำแหน่งนี้ได้" items={perks} />

            {job.exclusions_note?.trim() ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">งานนี้ไม่รวม</h3>
                <p className="flex items-start gap-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  <X className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{job.exclusions_note}</span>
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
            <h3 className="text-sm font-semibold">ติดต่อบริษัท</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {email ? (
                <li className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                  <a className="hover:text-primary break-all" href={`mailto:${email}`}>{email}</a>
                </li>
              ) : null}
              {phone ? (
                <li className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                  <a className="hover:text-primary" href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
                </li>
              ) : null}
              {workplace ? (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span><span className="text-foreground">Location</span> — {workplace}</span>
                </li>
              ) : null}
              {showMeeting ? (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span><span className="text-foreground">จุดนัดเจอ</span> — {meeting}</span>
                </li>
              ) : null}
              {socials.map((s) => {
                const href = normalizeSocialUrl(s.url) || safeHttpUrl(s.url);
                if (!href) return null;
                return (
                  <li key={`${s.kind}-${s.url}`}>
                    <a href={href} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                      {s.label || SOCIAL_KIND_LABEL[s.kind]}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {!isOwner && job.status === "open" && mailtoHref ? (
            <div className="md:hidden">
              <Button type="button" variant="outline" className="w-full rounded-full min-h-11 gap-1.5" asChild>
                <a href={mailtoHref}>
                  <Mail className="w-4 h-4" />
                  ส่งเมลสมัครงาน
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {!isOwner ? (
        <div className="md:hidden sticky bottom-0 z-10 border-t border-border/60 bg-card/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-lg mx-auto space-y-2">
            <p className="text-base font-semibold text-primary tabular-nums truncate">{fmtBudget(job)}</p>
            {primaryCta()}
          </div>
        </div>
      ) : null}

      <ImageLightbox
        images={media}
        index={Math.min(activeIdx, Math.max(0, media.length - 1))}
        open={lightboxOpen && media.length > 0}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setActiveIdx}
        alt={job.title}
      />
    </div>
  );
}
