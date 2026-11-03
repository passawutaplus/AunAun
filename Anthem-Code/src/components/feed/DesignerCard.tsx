import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import type { DesignerCardData } from "@/hooks/useDesigners";
import type { FollowedByPerson } from "@/hooks/useFollowedBy";
import { highlight } from "@/lib/highlight";
import { naturalFeedCoverUrl, thumbFeedCoverUrl } from "@/lib/feedProjectCover";
import { displayProfileAddress } from "@/lib/profileAddress";
import { cn } from "@/lib/utils";

interface Props {
  data: DesignerCardData;
  search?: string;
  /** People you follow who also follow this designer (kept for callers; not shown on this card). */
  followedBy?: FollowedByPerson[];
  /** Works posted since you last looked (Portfolio → Creators). */
  newWorkCount?: number;
}

const THUMBS = 4;

/** Availability dot + label from the profile's opportunity status. */
const STATUS: Record<string, { label: string; dot: string }> = {
  open_to_opportunities: { label: "Available for Work", dot: "bg-emerald-500" },
  soft_open: { label: "Open to Talk", dot: "bg-amber-500" },
  not_available: { label: "Not Available", dot: "bg-muted-foreground/60" },
};

type Project = DesignerCardData["projects"][number];

const coverSrc = (p: Project | undefined) => (p ? p.cover_url || p.gallery_urls?.[0] || "" : "");

/**
 * Creator card: cover banner (profile cover, else their most-viewed work), avatar over its edge,
 * name + availability, role, short bio, work count + place, a strip of works and "View Profile".
 */
const DesignerCard = ({ data, search = "", newWorkCount = 0 }: Props) => {
  const { profile, projects } = data;
  const profileUserId = (profile as { user_id?: string; id?: string }).user_id ?? profile.id;
  const profilePath = search ? `/u/${profileUserId}?q=${encodeURIComponent(search)}` : `/u/${profileUserId}`;

  const name = profile.display_name || profile.username || "Creator";
  const role = (profile.role || "Designer").trim();
  const bio = ((profile as { bio?: string | null }).bio ?? "").trim();
  const status = STATUS[(profile as { opportunity_status?: string | null }).opportunity_status ?? ""];
  const place = displayProfileAddress(
    (profile as { profile_address?: unknown }).profile_address,
    (profile as { location?: string | null }).location,
    "short",
  );
  const workCount = data.projectCount || projects.length;

  // No profile cover yet: borrow the cover of their most-viewed work.
  const mostViewed = [...projects].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];
  const profileCover = (profile as { cover_url?: string | null }).cover_url;
  const cover = profileCover || naturalFeedCoverUrl(coverSrc(mostViewed));
  const thumbs = projects.slice(0, THUMBS);

  return (
    <article className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <Link to={profilePath} className="relative block aspect-[16/7] overflow-hidden bg-muted" tabIndex={-1} aria-hidden>
        {cover ? (
          <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : null}
        {/* Fade into the card so the avatar and text read cleanly over any photo. */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card to-transparent" />
      </Link>

      <div className="absolute right-3 top-3">
        <FollowButton
          freelancerId={profileUserId}
          iconOnly
          size="sm"
          tone="muted"
          className="bg-background/70 backdrop-blur-sm"
          announceName={name}
        />
      </div>

      <div className="relative -mt-10 flex flex-1 flex-col gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="flex items-end gap-3">
          <Link to={profilePath} className="shrink-0 rounded-full ring-4 ring-card focus-visible:outline-none focus-visible:ring-foreground">
            <UserAvatar
              src={profile.avatar_url}
              name={name}
              username={profile.username}
              className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
            />
          </Link>
          <div className="min-w-0 pb-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <Link
                to={profilePath}
                className="inline-flex min-w-0 items-center gap-1 text-base font-semibold text-foreground hover:underline focus-visible:underline focus-visible:outline-none"
              >
                <span className="truncate">{highlight(name, search)}</span>
                {(profile as { is_verified?: boolean | null }).is_verified ? <VerifiedBadge className="h-4 w-4 shrink-0" /> : null}
              </Link>
              {status ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} aria-hidden />
                  {status.label}
                </span>
              ) : null}
            </div>
            <p className="truncate text-sm text-muted-foreground">{highlight(role, search)}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <p className="line-clamp-2 min-h-[2.5rem] min-w-0 flex-1 text-sm text-foreground/80">
            {bio ? highlight(bio, search) : <span className="text-muted-foreground">ยังไม่มีคำแนะนำตัว</span>}
          </p>
          <dl className="flex shrink-0 divide-x divide-border text-center">
            <div className="px-3 first:pl-0">
              <dt className="sr-only">ผลงาน</dt>
              <dd className="text-base font-semibold leading-tight text-foreground tabular-nums">{workCount}</dd>
              <dd className="text-[11px] text-muted-foreground">Projects</dd>
            </div>
            {place ? (
              <div className="max-w-[6.5rem] px-3 last:pr-0">
                <dt className="sr-only">ที่อยู่</dt>
                <dd className="flex justify-center">
                  <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden />
                </dd>
                <dd className="truncate text-[11px] text-muted-foreground">{place}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center">
          {thumbs.length ? (
            <ul className="grid min-w-0 flex-1 grid-cols-4 gap-1.5">
              {thumbs.map((p, i) => (
                <li key={p.id} className="relative">
                  <Link
                    to={`/showcase/${p.id}`}
                    className="block aspect-[4/3] overflow-hidden rounded-md bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                    aria-label={p.title}
                  >
                    {coverSrc(p) ? (
                      <img src={thumbFeedCoverUrl(coverSrc(p))} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : null}
                  </Link>
                  {i === 0 && newWorkCount > 0 ? (
                    <span className="absolute left-1 top-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-semibold leading-none text-neutral-950">
                      +{Math.min(newWorkCount, 6)} ใหม่
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex-1 text-xs text-muted-foreground">ยังไม่มีผลงานที่เผยแพร่</p>
          )}
          <Link
            to={profilePath}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-foreground/25 px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            View Profile <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default DesignerCard;
