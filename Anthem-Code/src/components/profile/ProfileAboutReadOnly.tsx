import { MapPin } from "lucide-react";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import ExperienceTimeline from "@/components/profile/ExperienceTimeline";
import SkillsList from "@/components/profile/SkillsList";
import ContactCards from "@/components/profile/ContactCards";
import type { ExperienceItem } from "@/lib/validators";

type ProfileAbout = {
  role: string | null;
  location: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  line_id: string | null;
  facebook: string | null;
  instagram: string | null;
};

type Props = {
  profile: ProfileAbout;
  experience: ExperienceItem[];
  skills: string[];
};

export function ProfileAboutReadOnly({ profile, experience, skills }: Props) {
  return (
    <div className="space-y-0">
      <AboutRow title="ตำแหน่ง / สาขา">
        {profile.role ? (
          <p className="text-sm text-foreground flex items-center gap-2">
            <BriefcaseIcon className="w-4 h-4 text-primary shrink-0" />
            {profile.role}
          </p>
        ) : (
          <EmptyLine text="ยังไม่ได้ระบุตำแหน่งหรือสาขา" />
        )}
      </AboutRow>

      <AboutRow title="เมือง / ที่อยู่">
        {profile.location ? (
          <p className="text-sm text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            {profile.location}
          </p>
        ) : (
          <EmptyLine text="ยังไม่ได้ระบุเมืองหรือที่อยู่" />
        )}
      </AboutRow>

      <AboutRow title="แนะนำตัว">
        {profile.bio ? (
          <p className="text-base text-foreground leading-7 whitespace-pre-wrap">{profile.bio}</p>
        ) : (
          <EmptyLine text="ยังไม่ได้แนะนำตัว" />
        )}
      </AboutRow>

      <AboutRow title="ประสบการณ์ทำงาน">
        {experience.length ? (
          <ExperienceTimeline items={experience} />
        ) : (
          <EmptyLine text="ยังไม่ได้เพิ่มประวัติการทำงาน" />
        )}
      </AboutRow>

      <AboutRow title="ความชำนาญ" count={skills.length}>
        <SkillsList skills={skills} />
      </AboutRow>

      <AboutRow title="ข้อมูลติดต่อ">
        <ContactCards
          email={profile.email}
          phone={profile.phone}
          website={profile.website}
          lineId={profile.line_id}
          facebook={profile.facebook}
          instagram={profile.instagram}
        />
      </AboutRow>
    </div>
  );
}

const AboutRow = ({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) => (
  <div className="border-t border-border/60 pt-5 first:border-0 first:pt-0">
    <h3 className="text-sm font-medium text-foreground mb-3">
      {title}
      {typeof count === "number" && (
        <span className="text-muted-foreground font-normal ml-1.5 text-xs">({count})</span>
      )}
    </h3>
    {children}
  </div>
);

const EmptyLine = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground text-center py-4">{text}</p>
);
