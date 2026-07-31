import type { ReactNode } from "react";
import {
  Briefcase,
  Layers,
  Link2,
  MapPin,
  Monitor,
  Search,
  User,
} from "lucide-react";
import ExperienceTimeline from "@/components/profile/ExperienceTimeline";
import SkillsList from "@/components/profile/SkillsList";
import ContactCards from "@/components/profile/ContactCards";
import ProfileLinksList from "@/components/profile/ProfileLinksList";
import type { ExperienceItem, SocialLinkItem } from "@/lib/validators";
import { WORK_DISCIPLINE_LABELS, type WorkDisciplineId } from "@/data/workDisciplineOptions";
import { labelOpportunityType } from "@/lib/opportunity";
import { displayProfileAddress } from "@/lib/profileAddress";
import { safeHttpUrl } from "@/lib/safeUrl";
import { cn } from "@/lib/utils";

type ProfileAbout = {
  role: string | null;
  location: string | null;
  profile_address?: unknown;
  bio: string | null;
  email: string | null;
  website: string | null;
  line_id: string | null;
  facebook: string | null;
  instagram: string | null;
};

type Props = {
  profile: ProfileAbout;
  experience: ExperienceItem[];
  skills: string[];
  disciplines?: string[];
  opportunityTypes?: string[];
  socialLinks?: SocialLinkItem[];
  /** owner = แสดงช่องว่างเป็น hint · public = ซ่อนหมวดที่ว่าง */
  mode?: "owner" | "public";
};

function DisciplineList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((id) => (
        <span
          key={id}
          className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium bg-secondary text-foreground border border-border"
        >
          {WORK_DISCIPLINE_LABELS[id as WorkDisciplineId] ?? id}
        </span>
      ))}
    </div>
  );
}

function LookingList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((id) => (
        <span
          key={id}
          className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
        >
          {labelOpportunityType(id)}
        </span>
      ))}
    </div>
  );
}

/**
 * ลำดับ About (พรีวิว / มุมมองคนอื่น / แท็บ About):
 * แนะนำตัว → กำลังมองหา → ตำแหน่งงาน → สายงาน → ความชำนาญ → ประสบการณ์ → ที่อยู่ → โซเชียล
 */
export function ProfileAboutReadOnly({
  profile,
  experience,
  skills,
  disciplines = [],
  opportunityTypes = [],
  socialLinks = [],
  mode = "owner",
}: Props) {
  const hideEmpty = mode === "public";
  const addressLine = displayProfileAddress(profile.profile_address, profile.location, "full");
  const role = profile.role?.trim() || "";
  const bio = profile.bio?.trim() || "";
  const hasWebsite = !!safeHttpUrl(profile.website);
  const hasLegacyContact = !!(
    profile.line_id?.trim() ||
    profile.facebook?.trim() ||
    profile.instagram?.trim()
  );
  const hasEmail = mode === "owner" && !!profile.email?.trim();
  const hasSocial = socialLinks.length > 0;
  const hasContactBlock = hasWebsite || hasLegacyContact || hasEmail || hasSocial;

  const rows: { key: string; node: ReactNode }[] = [];

  if (bio || !hideEmpty) {
    rows.push({
      key: "bio",
      node: (
        <AboutRow icon={User} title="แนะนำตัว">
          {bio ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{bio}</p>
          ) : (
            <EmptyHint text="ยังไม่ได้แนะนำตัว" />
          )}
        </AboutRow>
      ),
    });
  }

  if (opportunityTypes.length || !hideEmpty) {
    rows.push({
      key: "opportunity",
      node: (
        <AboutRow icon={Search} title="กำลังมองหา" count={opportunityTypes.length || undefined}>
          {opportunityTypes.length ? (
            <LookingList items={opportunityTypes} />
          ) : (
            <EmptyHint text="ยังไม่ได้ระบุว่ากำลังมองหาอะไร" />
          )}
        </AboutRow>
      ),
    });
  }

  if (role || !hideEmpty) {
    rows.push({
      key: "role",
      node: (
        <AboutRow icon={Briefcase} title="ตำแหน่งงาน">
          {role ? (
            <p className="text-sm text-foreground">{role}</p>
          ) : (
            <EmptyHint text="ยังไม่ได้ระบุตำแหน่งงาน" />
          )}
        </AboutRow>
      ),
    });
  }

  if (disciplines.length || !hideEmpty) {
    rows.push({
      key: "disciplines",
      node: (
        <AboutRow icon={Layers} title="สายงาน" count={disciplines.length || undefined}>
          {disciplines.length ? (
            <DisciplineList items={disciplines} />
          ) : (
            <EmptyHint text="ยังไม่ได้เลือกสายงาน" />
          )}
        </AboutRow>
      ),
    });
  }

  if (skills.length || !hideEmpty) {
    rows.push({
      key: "skills",
      node: (
        <AboutRow icon={Monitor} title="ความชำนาญ" count={skills.length || undefined}>
          {skills.length ? <SkillsList skills={skills} /> : <EmptyHint text="ยังไม่ได้เพิ่มความชำนาญ" />}
        </AboutRow>
      ),
    });
  }

  if (experience.length || !hideEmpty) {
    rows.push({
      key: "experience",
      node: (
        <AboutRow icon={Briefcase} title="ประสบการณ์ทำงาน" count={experience.length || undefined}>
          {experience.length ? (
            <ExperienceTimeline items={experience} />
          ) : (
            <EmptyHint text="ยังไม่ได้เพิ่มประวัติการทำงาน" />
          )}
        </AboutRow>
      ),
    });
  }

  if (addressLine || !hideEmpty) {
    rows.push({
      key: "address",
      node: (
        <AboutRow icon={MapPin} title="ที่อยู่">
          {addressLine ? (
            <p className="text-sm text-foreground leading-relaxed">{addressLine}</p>
          ) : (
            <EmptyHint text="ยังไม่ได้ระบุที่อยู่" />
          )}
        </AboutRow>
      ),
    });
  }

  if (hasContactBlock || !hideEmpty) {
    rows.push({
      key: "contact",
      node: (
        <AboutRow
          icon={Link2}
          title="ลิงก์โซเชียล / ติดต่อ"
          count={
            hasContactBlock
              ? socialLinks.length + (hasWebsite || hasEmail || hasLegacyContact ? 1 : 0)
              : undefined
          }
        >
          {hasContactBlock ? (
            <div className="space-y-3">
              {(hasWebsite || hasEmail || hasLegacyContact) && (
                <ContactCards
                  email={hasEmail ? profile.email : null}
                  website={profile.website}
                  lineId={profile.line_id}
                  facebook={profile.facebook}
                  instagram={profile.instagram}
                />
              )}
              {hasSocial ? <ProfileLinksList links={socialLinks} /> : null}
            </div>
          ) : (
            <EmptyHint text="ยังไม่ได้เพิ่มลิงก์หรือช่องทางติดต่อ" />
          )}
        </AboutRow>
      ),
    });
  }

  if (!rows.length) {
    return <EmptyHint text="ยังไม่มีข้อมูลเกี่ยวกับฉัน" />;
  }

  return (
    <div className="space-y-0">
      {rows.map((r, i) => (
        <div
          key={r.key}
          className={i === 0 ? undefined : "border-t border-border/60 pt-8"}
        >
          {r.node}
        </div>
      ))}
    </div>
  );
}

const AboutRow = ({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  children: ReactNode;
}) => (
  <div>
    <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
      <Icon className="w-5 h-5 text-primary shrink-0" aria-hidden />
      <span>
        {title}
        {typeof count === "number" && count > 0 ? (
          <span className="text-muted-foreground font-normal ml-1.5 text-xs">({count})</span>
        ) : null}
      </span>
    </h3>
    {children}
  </div>
);

const EmptyHint = ({ text }: { text: string }) => (
  <p className={cn("text-xs font-light text-muted-foreground/70")}>{text}</p>
);

export default ProfileAboutReadOnly;
