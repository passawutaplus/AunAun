import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  Award,
  BadgeCheck,
  Briefcase,
  GraduationCap,
  History,
  Languages,
  Link2,
  Monitor,
  Sparkles,
  User,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateProfile } from "@/hooks/useProfile";
import {
  experienceItemSchema,
  formatExperiencePeriod,
  normalizeExperienceItem,
  type ExperienceItem,
  type SocialLinkItem,
} from "@/lib/validators";
import { parseSocialLinks } from "@/lib/parseSocialLinks";
import {
  parseProfileCv,
  partitionSkillsAndSoftware,
  profileCvToJson,
  composeFullName,
  isSimpleEmail,
  isSimpleThaiPhone,
  type AwardItem,
  type CertificationItem,
  type CvLanguageItem,
  type EducationItem,
} from "@/lib/profileCv";
import {
  formatProfileAddressShort,
  parseProfileAddressOrLocation,
  profileAddressToJson,
  type ProfileAddress,
} from "@/lib/profileAddress";
import ExperienceEditor from "@/components/profile/ExperienceEditor";
import EducationEditor from "@/components/profile/EducationEditor";
import LanguageEditor from "@/components/profile/LanguageEditor";
import CertificationEditor from "@/components/profile/CertificationEditor";
import AwardEditor from "@/components/profile/AwardEditor";
import CvPhotoEditor from "@/components/profile/CvPhotoEditor";
import SkillsEditor from "@/components/profile/SkillsEditor";
import CvToolsEditor from "@/components/profile/CvToolsEditor";
import ContactEditor from "@/components/profile/ContactEditor";
import ProfileLinksEditor from "@/components/profile/ProfileLinksEditor";
import ProfileAddressEditor from "@/components/profile/ProfileAddressEditor";
import { AboutEditLangToggle, AboutEditLocaleProvider, useAboutEditLocale } from "@/components/profile/AboutEditLocale";
import { cn } from "@/lib/utils";

type ProfileLike = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  cv_photo_url?: string | null;
  cv?: unknown;
  bio?: string | null;
  role?: string | null;
  email?: string | null;
  website?: string | null;
  line_id?: string | null;
  phone?: string | null;
  skills?: unknown;
  experience?: unknown;
  social_links?: unknown;
  location?: string | null;
  profile_address?: unknown;
};

type FormState = {
  firstName: string;
  lastName: string;
  desiredRole: string;
  birthDate: string;
  contactEmail: string;
  contactLine: string;
  contactPhone: string;
  contactPublic: boolean;
  bio: string;
  website: string;
  socialLinks: SocialLinkItem[];
  skills: string[];
  experience: ExperienceItem[];
  cvPhotoUrl: string;
  education: EducationItem[];
  cvTools: string[];
  cvLanguages: CvLanguageItem[];
  certifications: CertificationItem[];
  awards: AwardItem[];
  portfolioUrl: string;
  profileAddress: ProfileAddress;
};

type SectionId =
  | "identity"
  | "contact"
  | "skills"
  | "experience"
  | "education"
  | "certification"
  | "awards"
  | "languages";

const ABOUT_EDIT_GROUPS: {
  id: "profile" | "work" | "background";
  icon: ComponentType<{ className?: string }>;
  items: { id: SectionId; icon: ComponentType<{ className?: string }> }[];
}[] = [
  {
    id: "profile",
    icon: UserRound,
    items: [
      { id: "identity", icon: User },
      { id: "contact", icon: Link2 },
    ],
  },
  {
    id: "work",
    icon: Briefcase,
    items: [
      { id: "skills", icon: Sparkles },
      { id: "experience", icon: Briefcase },
    ],
  },
  {
    id: "background",
    icon: History,
    items: [
      { id: "education", icon: GraduationCap },
      { id: "certification", icon: BadgeCheck },
      { id: "awards", icon: Award },
      { id: "languages", icon: Languages },
    ],
  },
];

const ABOUT_EDIT_ITEMS = ABOUT_EDIT_GROUPS.flatMap((group) => group.items);

const parseSkills = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];

const parseExperience = (raw: unknown): ExperienceItem[] =>
  Array.isArray(raw)
    ? raw.map(normalizeExperienceItem).filter((x): x is ExperienceItem => !!x)
    : [];

function formFromProfile(profile: ProfileLike): FormState {
  const cv = parseProfileCv(profile.cv);
  const { craftSkills, software } = partitionSkillsAndSoftware(parseSkills(profile.skills), cv.tools);
  return {
    firstName: cv.firstName,
    lastName: cv.lastName,
    desiredRole: cv.desiredRole,
    birthDate: cv.birthDate,
    contactEmail: cv.contactEmail,
    contactLine: cv.contactLine || (profile.line_id ?? "").trim(),
    contactPhone: cv.contactPhone || (profile.phone ?? "").trim(),
    contactPublic: cv.contactPublic,
    bio: profile.bio ?? "",
    website: profile.website ?? "",
    socialLinks: parseSocialLinks(profile.social_links),
    skills: craftSkills,
    experience: parseExperience(profile.experience),
    cvPhotoUrl: profile.cv_photo_url ?? "",
    education: cv.education,
    cvTools: software,
    cvLanguages: cv.languages,
    certifications: cv.certifications,
    awards: cv.awards,
    portfolioUrl: cv.portfolioUrl,
    profileAddress: parseProfileAddressOrLocation(profile.profile_address, profile.location),
  };
}

function sectionCount(id: SectionId, form: FormState): number | null {
  if (id === "experience") return form.experience.length || null;
  if (id === "education") return form.education.length || null;
  if (id === "certification") return form.certifications.length || null;
  if (id === "awards") return form.awards.length || null;
  if (id === "languages") return form.cvLanguages.length || null;
  if (id === "skills") {
    const n = form.skills.length + form.cvTools.length;
    return n || null;
  }
  return null;
}

type Props = {
  userId: string;
  profile: ProfileLike;
  onSaved: () => void;
  sectionClassName?: string;
};

export default function ProfileAboutEditor(props: Props) {
  return (
    <AboutEditLocaleProvider>
      <ProfileAboutEditorInner {...props} />
    </AboutEditLocaleProvider>
  );
}

function ProfileAboutEditorInner({ userId, profile, onSaved, sectionClassName }: Props) {
  const { t } = useAboutEditLocale();
  const updateMut = useUpdateProfile(userId);
  const [form, setForm] = useState<FormState>(() => formFromProfile(profile));
  const [section, setSection] = useState<SectionId>("identity");

  useEffect(() => {
    setForm(formFromProfile(profile));
  }, [profile]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const goSection = (id: SectionId) => {
    setSection(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async (exitAfter: boolean) => {
    const cleanedExperience = form.experience
      .map((it) => {
        const isCurrent = !!it.isCurrent;
        const composed = formatExperiencePeriod(it);
        return {
          title: it.title.trim(),
          company: (it.company ?? "").trim(),
          periodStart: (it.periodStart ?? "").trim(),
          periodEnd: isCurrent ? "" : (it.periodEnd ?? "").trim(),
          isCurrent,
          employmentType: it.employmentType ?? null,
          period: composed || (it.period ?? "").trim(),
          highlights: (it.highlights ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 4),
          description:
            (it.highlights ?? []).map((s) => s.trim()).filter(Boolean).join("\n") ||
            (it.description ?? "").trim(),
        };
      })
      .filter((it) => it.title);
    for (const item of cleanedExperience) {
      const parsedItem = experienceItemSchema.safeParse(item);
      if (!parsedItem.success) {
        goSection("experience");
        toast.error(parsedItem.error.issues[0]?.message ?? t.experienceIncomplete);
        return;
      }
    }
    const existingCv = parseProfileCv(profile.cv);
    const cv = profileCvToJson({
      education: form.education,
      tools: form.cvTools,
      workArrangement: existingCv.workArrangement,
      languages: form.cvLanguages,
      certifications: form.certifications,
      awards: form.awards,
      portfolioUrl: form.portfolioUrl,
      firstName: form.firstName,
      lastName: form.lastName,
      fullName: composeFullName(form.firstName, form.lastName),
      birthDate: form.birthDate,
      desiredRole: form.desiredRole,
      contactEmail: form.contactEmail,
      contactLine: form.contactLine,
      contactPhone: form.contactPhone,
      contactPublic: form.contactPublic,
    });
    if (form.contactEmail.trim() && !isSimpleEmail(form.contactEmail)) {
      goSection("contact");
      toast.error(t.invalidEmail);
      return;
    }
    if (form.contactPhone.trim() && !isSimpleThaiPhone(form.contactPhone)) {
      goSection("contact");
      toast.error(t.invalidPhone);
      return;
    }
    const address = profileAddressToJson(form.profileAddress);
    try {
      await updateMut.mutateAsync({
        bio: form.bio.trim(),
        website: form.website.trim(),
        socialLinks: form.socialLinks,
        skills: form.skills,
        experience: cleanedExperience,
        cvPhotoUrl: form.cvPhotoUrl,
        education: cv.education,
        cvTools: cv.tools,
        workArrangement: cv.workArrangement,
        cvLanguages: cv.languages,
        cvCertifications: cv.certifications,
        cvAwards: cv.awards,
        portfolioUrl: cv.portfolioUrl,
        cvFullName: cv.fullName,
        cvFirstName: cv.firstName,
        cvLastName: cv.lastName,
        cvBirthDate: cv.birthDate,
        cvDesiredRole: cv.desiredRole,
        cvContactEmail: cv.contactEmail,
        cvContactLine: cv.contactLine,
        cvContactPhone: cv.contactPhone,
        cvContactPublic: cv.contactPublic,
        profileAddress: address,
        location: formatProfileAddressShort(address),
      });
      toast.success(exitAfter ? t.saved : t.savedStay);
      if (exitAfter) onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.saveFailed);
    }
  };

  const saveBar = (
    <div className="flex items-center gap-2 shrink-0">
      <AboutEditLangToggle />
      <Button
        type="button"
        size="sm"
        className="rounded-full"
        disabled={updateMut.isPending}
        onClick={() => void handleSave(true)}
      >
        {updateMut.isPending ? t.saving : t.save}
      </Button>
    </div>
  );

  const groupLabel = {
    profile: t.groupProfile,
    work: t.groupWork,
    background: t.groupBackground,
  } as const;
  const SectionIcon = ABOUT_EDIT_ITEMS.find((item) => item.id === section)?.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{t.pageTitle}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t.pageHint}</p>
        </div>
        {saveBar}
      </div>

      <div className={cn("space-y-4", sectionClassName)}>
      <div className="lg:hidden -mx-1">
        <div className="flex gap-1.5 overflow-x-auto pb-1 px-1 [scrollbar-width:thin]">
          {ABOUT_EDIT_ITEMS.map((item) => {
            const active = section === item.id;
            const count = sectionCount(item.id, form);
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => goSection(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs border transition-colors",
                  active
                    ? "bg-primary/10 text-primary border-primary/30 font-medium"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {t[item.id]}
                {count != null ? <span className="ml-1 tabular-nums opacity-70">{count}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label={t.pageTitle}
          className="hidden lg:block sticky top-20 self-start"
        >
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/40">
            {ABOUT_EDIT_GROUPS.map((group, index) => {
              const GroupIcon = group.icon;
              return (
              <div key={group.id} className={cn(index > 0 && "border-t border-border/70")}>
                <p className="flex items-center gap-1.5 px-3.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <GroupIcon className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
                  {groupLabel[group.id]}
                </p>
                <ul className="flex flex-col pb-1.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = section === item.id;
                    const count = sectionCount(item.id, form);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-current={active ? "true" : undefined}
                          onClick={() => goSection(item.id)}
                          className={cn(
                            "relative flex w-full items-center gap-2 py-2 pl-3.5 pr-3 text-left text-sm transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                            active
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                          )}
                        >
                          {active ? (
                            <span
                              className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                              aria-hidden
                            />
                          ) : null}
                          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{t[item.id]}</span>
                          {count != null ? (
                            <span className="text-[11px] tabular-nums opacity-70">{count}</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
              );
            })}
          </div>
        </nav>

        <div className="min-w-0 space-y-6">
          <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
            {SectionIcon ? <SectionIcon className="h-4 w-4 text-primary shrink-0" aria-hidden /> : null}
            {t[section]}
          </h3>

          <SectionPanel id="identity" current={section}>
              <EditorBlock title={t.photo}>
                <CvPhotoEditor
                  userId={userId}
                  cvPhotoUrl={form.cvPhotoUrl}
                  avatarUrl={profile.avatar_url}
                  displayName={profile.display_name}
                  username={profile.username}
                  onChange={(cvPhotoUrl) => update("cvPhotoUrl", cvPhotoUrl)}
                />
              </EditorBlock>
              <EditorBlock title={t.name}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <AboutInput
                    label={t.firstName}
                    value={form.firstName}
                    onChange={(firstName) => update("firstName", firstName)}
                    maxLength={40}
                    placeholder={t.firstName}
                  />
                  <AboutInput
                    label={t.lastName}
                    value={form.lastName}
                    onChange={(lastName) => update("lastName", lastName)}
                    maxLength={40}
                    placeholder={t.lastName}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t.nameHint}
                </p>
              </EditorBlock>
              <EditorBlock title={t.desiredPosition}>
                <input
                  value={form.desiredRole}
                  onChange={(e) => update("desiredRole", e.target.value)}
                  maxLength={60}
                  placeholder={t.desiredPositionPh}
                  className={ABOUT_INPUT_CLASS}
                />
              </EditorBlock>
              <EditorBlock title={t.addressUi.title}>
                <p className="text-xs text-muted-foreground -mt-1">{t.addressUi.hint}</p>
                <ProfileAddressEditor
                  hideHeader
                  idPrefix="about-address"
                  value={form.profileAddress}
                  onChange={(profileAddress) => update("profileAddress", profileAddress)}
                  copy={t.addressUi}
                />
              </EditorBlock>
              <EditorBlock title={t.aboutMe} hint={`${form.bio.length}/500`}>
                <textarea
                  value={form.bio}
                  onChange={(e) => update("bio", e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder={t.aboutMePh}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40"
                />
              </EditorBlock>
          </SectionPanel>

          <SectionPanel id="contact" current={section}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <EditorBlock title={t.email}>
                  <input
                    type="text"
                    inputMode="email"
                    value={form.contactEmail}
                    onChange={(e) => update("contactEmail", e.target.value)}
                    maxLength={120}
                    placeholder="name@email.com"
                    className={ABOUT_INPUT_CLASS}
                  />
                </EditorBlock>
                <EditorBlock title={t.line}>
                  <input
                    type="text"
                    value={form.contactLine}
                    onChange={(e) => update("contactLine", e.target.value)}
                    maxLength={50}
                    placeholder="LINE ID"
                    className={ABOUT_INPUT_CLASS}
                  />
                </EditorBlock>
                <EditorBlock title={t.phone}>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.contactPhone}
                    onChange={(e) => update("contactPhone", e.target.value)}
                    maxLength={16}
                    placeholder="0812345678"
                    className={ABOUT_INPUT_CLASS}
                  />
                </EditorBlock>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                {t.contactHint}
              </p>
              <label className="flex items-start gap-2.5 text-sm text-foreground cursor-pointer select-none">
                <Checkbox
                  checked={form.contactPublic}
                  onCheckedChange={(v) => update("contactPublic", v === true)}
                  className="mt-0.5"
                />
                <span>{t.contactPublic}</span>
              </label>
              <EditorBlock title={t.portfolio}>
                <input
                  id="about-portfolio-url"
                  value={form.portfolioUrl}
                  onChange={(e) => update("portfolioUrl", e.target.value)}
                  placeholder={t.portfolioPh}
                  className={ABOUT_INPUT_CLASS}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t.portfolioHint}
                </p>
              </EditorBlock>
              <ContactEditor
                hideEmail
                value={{ email: "", website: form.website }}
                onChange={(patch) => {
                  if (patch.website !== undefined) update("website", patch.website);
                }}
              />
              <div className="pt-1 border-t border-border/60">
                <ProfileLinksEditor
                  value={form.socialLinks}
                  onChange={(socialLinks) => update("socialLinks", socialLinks)}
                />
              </div>
          </SectionPanel>

          <SectionPanel id="skills" current={section}>
              <EditorBlock icon={Sparkles} title={t.skills}>
                <p className="text-xs text-muted-foreground -mt-1">
                  {t.skillsHint}
                </p>
                <SkillsEditor value={form.skills} onChange={(skills) => update("skills", skills)} />
              </EditorBlock>
              <EditorBlock icon={Monitor} title={t.software}>
                <p className="text-xs text-muted-foreground -mt-1">
                  {t.softwareHint}
                </p>
                <CvToolsEditor value={form.cvTools} onChange={(cvTools) => update("cvTools", cvTools)} />
              </EditorBlock>
          </SectionPanel>

          <SectionPanel id="experience" current={section}>
            <ExperienceEditor
              value={form.experience}
              onChange={(experience) => update("experience", experience)}
            />
          </SectionPanel>

          <SectionPanel id="education" current={section}>
            <EducationEditor
              value={form.education}
              onChange={(education) => update("education", education)}
            />
          </SectionPanel>

          <SectionPanel id="certification" current={section}>
            <CertificationEditor
              value={form.certifications}
              onChange={(certifications) => update("certifications", certifications)}
            />
          </SectionPanel>

          <SectionPanel id="awards" current={section}>
            <AwardEditor value={form.awards} onChange={(awards) => update("awards", awards)} />
          </SectionPanel>

          <SectionPanel id="languages" current={section}>
            <LanguageEditor
              value={form.cvLanguages}
              onChange={(cvLanguages) => update("cvLanguages", cvLanguages)}
            />
          </SectionPanel>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              className="rounded-full"
              disabled={updateMut.isPending}
              onClick={() => void handleSave(false)}
            >
              {updateMut.isPending ? t.saving : t.save}
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function SectionPanel({
  id,
  current,
  children,
}: {
  id: SectionId;
  current: SectionId;
  children: ReactNode;
}) {
  const active = id === current;
  return (
    <div className="space-y-6" hidden={!active} aria-hidden={!active}>
      {children}
    </div>
  );
}

function EditorBlock({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
          {Icon ? <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden /> : null}
          {title}
        </h4>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

const ABOUT_INPUT_CLASS =
  "w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40";

function AboutInput({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  placeholder: string;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className={ABOUT_INPUT_CLASS}
      />
    </div>
  );
}
