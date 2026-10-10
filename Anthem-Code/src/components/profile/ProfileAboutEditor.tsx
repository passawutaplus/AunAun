import { useDeferredValue, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Award,
  BadgeCheck,
  Briefcase,
  GraduationCap,
  History,
  Languages,
  LayoutGrid,
  Link2,
  Monitor,
  Sparkles,
  User,
  UserRound,
  Users,
  UserRoundCog,
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
import { readAboutEditLang } from "@/lib/aboutEditCopy";
import {
  parseProfileCv,
  partitionSkillsAndSoftware,
  profileCvToJson,
  composeFullName,
  isSimpleEmail,
  isSimpleThaiPhone,
  type AwardItem,
  type CertificationItem,
  type CvAddressDetail,
  type CvTemplate,
  type CvHeadingFont,
  type CvDocLang,
  type CvMilitaryStatus,
  type ReferenceItem,
  CV_MILITARY_STATUSES,
  defaultCvShowPhoto,
  type CvLanguageItem,
  type CvVisibility,
  type CvVisibilityKey,
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
import ProfileLinksEditor from "@/components/profile/ProfileLinksEditor";
import ProfileAddressEditor from "@/components/profile/ProfileAddressEditor";
import CvReferencesEditor from "@/components/profile/CvReferencesEditor";
import CvFeaturedProjectsEditor from "@/components/profile/CvFeaturedProjectsEditor";
import CvLivePreview from "@/components/profile/CvLivePreview";
import CvTemplatePicker from "@/components/profile/CvTemplatePicker";
import CvHeadingFontPicker from "@/components/profile/CvHeadingFontPicker";
import { CV_DOC_COPY } from "@/lib/aboutCvCopy";
import type { CvProjectInput } from "@/lib/aboutCvModel";
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
  nameEn: string;
  docLang: CvDocLang;
  nationality: string;
  military: CvMilitaryStatus | null;
  references: ReferenceItem[];
  featuredProjectIds: string[];
  desiredRole: string;
  birthDate: string;
  contactEmail: string;
  contactLine: string;
  contactPhone: string;
  visibility: CvVisibility;
  addressDetail: CvAddressDetail;
  about: string;
  website: string;
  socialLinks: SocialLinkItem[];
  skills: string[];
  experience: ExperienceItem[];
  cvPhotoUrl: string;
  cvTemplate: CvTemplate;
  cvHeadingFont: CvHeadingFont;
  cvShowPhoto: boolean;
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
  | "details"
  | "skills"
  | "experience"
  | "projects"
  | "education"
  | "certification"
  | "awards"
  | "languages"
  | "references";

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
      { id: "details", icon: UserRoundCog },
    ],
  },
  {
    id: "work",
    icon: Briefcase,
    items: [
      { id: "skills", icon: Sparkles },
      { id: "experience", icon: Briefcase },
      { id: "projects", icon: LayoutGrid },
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
      { id: "references", icon: Users },
    ],
  },
];

const ABOUT_EDIT_ITEMS = ABOUT_EDIT_GROUPS.flatMap((group) => group.items);

const SECTION_CV_KEY: Partial<Record<SectionId, CvVisibilityKey>> = {
  experience: "experience",
  projects: "projects",
  education: "education",
  certification: "certification",
  awards: "awards",
  languages: "languages",
  references: "references",
};

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
    nameEn: cv.nameEn,
    docLang: cv.docLang,
    nationality: cv.nationality,
    military: cv.military,
    references: cv.references,
    featuredProjectIds: cv.featuredProjectIds,
    desiredRole: cv.desiredRole,
    birthDate: cv.birthDate,
    contactEmail: cv.contactEmail,
    contactLine: cv.contactLine || (profile.line_id ?? "").trim(),
    contactPhone: cv.contactPhone || (profile.phone ?? "").trim(),
    visibility: cv.visibility,
    addressDetail: cv.addressDetail,
    about: cv.about.trim() || (profile.bio ?? "").trim(),
    website: profile.website ?? "",
    socialLinks: parseSocialLinks(profile.social_links),
    skills: craftSkills,
    experience: parseExperience(profile.experience),
    cvPhotoUrl: profile.cv_photo_url ?? "",
    cvTemplate: cv.template,
    cvHeadingFont: cv.headingFont,
    cvShowPhoto: defaultCvShowPhoto(profile.cv, readAboutEditLang()),
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
  if (id === "references") return form.references.filter((r) => r.name.trim()).length || null;
  if (id === "projects") return form.featuredProjectIds.length || null;
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
  /** Published projects the owner can feature on the CV. */
  projects?: CvProjectInput[];
  profileUrl?: string | null;
};

/** The cv object exactly as it is saved — also what the live preview renders. */
function buildCvFromForm(form: FormState, existingWorkArrangement: ReturnType<typeof parseProfileCv>["workArrangement"]) {
  return profileCvToJson({
    education: form.education,
    tools: form.cvTools,
    workArrangement: existingWorkArrangement,
    languages: form.cvLanguages,
    certifications: form.certifications,
    awards: form.awards,
    portfolioUrl: form.portfolioUrl,
    firstName: form.firstName,
    lastName: form.lastName,
    fullName: composeFullName(form.firstName, form.lastName),
    nameEn: form.nameEn,
    docLang: form.docLang,
    nationality: form.nationality,
    military: form.military,
    references: form.references,
    featuredProjectIds: form.featuredProjectIds,
    birthDate: form.birthDate,
    desiredRole: form.desiredRole,
    contactEmail: form.contactEmail,
    contactLine: form.contactLine,
    contactPhone: form.contactPhone,
    contactPublic:
      form.visibility.contactEmail || form.visibility.contactLine || form.visibility.contactPhone,
    about: form.about,
    addressDetail: form.addressDetail,
    template: form.cvTemplate,
    headingFont: form.cvHeadingFont,
    showPhoto: form.cvShowPhoto,
    visibility: form.visibility,
  });
}

export default function ProfileAboutEditor(props: Props) {
  return (
    <AboutEditLocaleProvider>
      <ProfileAboutEditorInner {...props} />
    </AboutEditLocaleProvider>
  );
}

function ProfileAboutEditorInner({ userId, profile, onSaved, sectionClassName, projects = [], profileUrl }: Props) {
  const { t, lang } = useAboutEditLocale();
  const updateMut = useUpdateProfile(userId);
  const [form, setForm] = useState<FormState>(() => formFromProfile(profile));
  const [section, setSection] = useState<SectionId>("identity");

  useEffect(() => {
    setForm(formFromProfile(profile));
  }, [profile]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setVis = (key: CvVisibilityKey, value: boolean) =>
    setForm((f) => ({ ...f, visibility: { ...f.visibility, [key]: value } }));

  const sectionVisKey = SECTION_CV_KEY[section];

  const deferredForm = useDeferredValue(form);
  const previewProfile = useMemo(() => {
    const address = profileAddressToJson(deferredForm.profileAddress);
    return {
      display_name: profile.display_name ?? null,
      username: profile.username ?? null,
      avatar_url: profile.avatar_url ?? null,
      cv_photo_url: deferredForm.cvPhotoUrl || null,
      cv: buildCvFromForm(deferredForm, parseProfileCv(profile.cv).workArrangement),
      role: profile.role ?? null,
      location: formatProfileAddressShort(address),
      profile_address: address,
      bio: profile.bio ?? null,
      website: deferredForm.website.trim() || null,
      line_id: profile.line_id ?? null,
      facebook: null,
      instagram: null,
    };
  }, [deferredForm, profile]);

  const goSection = (id: SectionId) => {
    setSection(id);
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
    const cv = buildCvFromForm(form, existingCv.workArrangement);
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
        cvAbout: cv.about,
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
        cvNameEn: cv.nameEn,
        cvDocLang: cv.docLang,
        cvNationality: cv.nationality,
        cvMilitary: cv.military,
        cvReferences: cv.references,
        cvFeaturedProjectIds: cv.featuredProjectIds,
        cvDesiredRole: cv.desiredRole,
        cvContactEmail: cv.contactEmail,
        cvContactLine: cv.contactLine,
        cvContactPhone: cv.contactPhone,
        cvContactPublic: cv.contactPublic,
        cvAddressDetail: cv.addressDetail,
        cvTemplate: cv.template,
        cvHeadingFont: cv.headingFont,
        cvShowPhoto: cv.showPhoto,
        cvVisibility: cv.visibility,
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

      <div className="grid gap-6 lg:grid-cols-[12.5rem_minmax(0,1fr)] xl:grid-cols-[12.5rem_minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
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
          <h3 className="flex items-center justify-between gap-3 text-sm font-medium text-foreground">
            <span className="flex min-w-0 items-center gap-2">
              {SectionIcon ? <SectionIcon className="h-4 w-4 text-primary shrink-0" aria-hidden /> : null}
              {t[section]}
            </span>
            {sectionVisKey ? (
              <ShowOnCvTick
                checked={form.visibility[sectionVisKey]}
                label={t.showOnCv}
                onChange={(v) => setVis(sectionVisKey, v)}
              />
            ) : null}
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
                <div className="mt-3 space-y-1">
                  <ShowOnCvTick
                    checked={form.cvShowPhoto}
                    label={t.photoShowOnCv}
                    onChange={(v) => update("cvShowPhoto", v)}
                  />
                  <p className="text-xs text-muted-foreground">{t.photoShowOnCvHint}</p>
                </div>
              </EditorBlock>
              <EditorBlock title={t.layoutTitle}>
                <CvTemplatePicker value={form.cvTemplate} onChange={(next) => update("cvTemplate", next)} />
                <p className="text-xs text-muted-foreground">{t.layoutHint}</p>
              </EditorBlock>
              <EditorBlock title={t.headingFontTitle}>
                <CvHeadingFontPicker value={form.cvHeadingFont} onChange={(next) => update("cvHeadingFont", next)} />
                <p className="text-xs text-muted-foreground">{t.headingFontHint}</p>
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
                <AboutInput
                  label={t.nameEn}
                  value={form.nameEn}
                  onChange={(nameEn) => update("nameEn", nameEn)}
                  maxLength={80}
                  placeholder={t.nameEnPh}
                />
                <p className="text-xs text-muted-foreground">{t.nameEnHint}</p>
              </EditorBlock>
              <EditorBlock title={t.cvLangTitle}>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.cvLangTitle}>
                  {(["en", "th"] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={form.docLang === id}
                      onClick={() => update("docLang", id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        form.docLang === id
                          ? "border-foreground font-medium text-foreground"
                          : "border-black/20 text-foreground hover:border-foreground",
                      )}
                    >
                      {id === "en" ? "English" : "ไทย"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{t.cvLangHint}</p>
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
              <EditorBlock
                title={t.addressUi.title}
                showOnCv={form.visibility.location}
                showOnCvLabel={t.showOnCv}
                onShowOnCvChange={(v) => setVis("location", v)}
              >
                <p className="text-xs text-muted-foreground -mt-1">{t.addressUi.hint}</p>
                <ProfileAddressEditor
                  hideHeader
                  idPrefix="about-address"
                  value={form.profileAddress}
                  onChange={(profileAddress) => update("profileAddress", profileAddress)}
                  copy={t.addressUi}
                />
                <label className="flex items-start gap-2.5 text-sm text-foreground cursor-pointer select-none">
                  <Checkbox
                    checked={form.addressDetail === "full"}
                    onCheckedChange={(v) => update("addressDetail", v === true ? "full" : "short")}
                    className="mt-0.5"
                  />
                  <span>
                    {t.addressFull}
                    <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                      {t.addressFullHint}
                    </span>
                  </span>
                </label>
              </EditorBlock>
              <EditorBlock
                title={t.aboutMe}
                hint={`${form.about.length}/500`}
                showOnCv={form.visibility.about}
                showOnCvLabel={t.showOnCv}
                onShowOnCvChange={(v) => setVis("about", v)}
              >
                <textarea
                  value={form.about}
                  onChange={(e) => update("about", e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder={t.aboutMePh}
                  className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40"
                />
                <p className="text-[11px] text-muted-foreground">{t.aboutMeHint}</p>
              </EditorBlock>
          </SectionPanel>

          <SectionPanel id="contact" current={section}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <EditorBlock
                  title={t.email}
                  showOnCv={form.visibility.contactEmail}
                  showOnCvLabel={t.showOnCv}
                  onShowOnCvChange={(v) => setVis("contactEmail", v)}
                >
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
                <EditorBlock
                  title={t.line}
                  showOnCv={form.visibility.contactLine}
                  showOnCvLabel={t.showOnCv}
                  onShowOnCvChange={(v) => setVis("contactLine", v)}
                >
                  <input
                    type="text"
                    value={form.contactLine}
                    onChange={(e) => update("contactLine", e.target.value)}
                    maxLength={50}
                    placeholder="LINE ID"
                    className={ABOUT_INPUT_CLASS}
                  />
                </EditorBlock>
                <EditorBlock
                  title={t.phone}
                  showOnCv={form.visibility.contactPhone}
                  showOnCvLabel={t.showOnCv}
                  onShowOnCvChange={(v) => setVis("contactPhone", v)}
                >
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
              <EditorBlock
                title={t.portfolio}
                showOnCv={form.visibility.portfolio}
                showOnCvLabel={t.showOnCv}
                onShowOnCvChange={(v) => setVis("portfolio", v)}
              >
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
              <EditorBlock
                title={t.website}
                showOnCv={form.visibility.website}
                showOnCvLabel={t.showOnCv}
                onShowOnCvChange={(v) => setVis("website", v)}
              >
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                  placeholder="https://..."
                  className={ABOUT_INPUT_CLASS}
                />
              </EditorBlock>
              <EditorBlock
                title={t.socials}
                showOnCv={form.visibility.socials}
                showOnCvLabel={t.showOnCv}
                onShowOnCvChange={(v) => setVis("socials", v)}
              >
                <div className="pt-1 border-t border-border/60">
                  <ProfileLinksEditor
                    value={form.socialLinks}
                    onChange={(socialLinks) => update("socialLinks", socialLinks)}
                  />
                </div>
              </EditorBlock>
          </SectionPanel>

          <SectionPanel id="skills" current={section}>
              <EditorBlock
                icon={Sparkles}
                title={t.skills}
                showOnCv={form.visibility.skills}
                showOnCvLabel={t.showOnCv}
                onShowOnCvChange={(v) => setVis("skills", v)}
              >
                <p className="text-xs text-muted-foreground -mt-1">
                  {t.skillsHint}
                </p>
                <SkillsEditor value={form.skills} onChange={(skills) => update("skills", skills)} />
              </EditorBlock>
              <EditorBlock
                icon={Monitor}
                title={t.software}
                showOnCv={form.visibility.software}
                showOnCvLabel={t.showOnCv}
                onShowOnCvChange={(v) => setVis("software", v)}
              >
                <p className="text-xs text-muted-foreground -mt-1">
                  {t.softwareHint}
                </p>
                <CvToolsEditor value={form.cvTools} onChange={(cvTools) => update("cvTools", cvTools)} />
              </EditorBlock>
          </SectionPanel>

          <SectionPanel id="details" current={section}>
            <p className="text-xs text-muted-foreground -mt-2">{t.detailsHint}</p>
            <EditorBlock
              title={t.birthDate}
              showOnCv={form.visibility.birthDate}
              showOnCvLabel={t.showOnCv}
              onShowOnCvChange={(v) => setVis("birthDate", v)}
            >
              <input
                type="date"
                value={form.birthDate}
                min="1920-01-01"
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => update("birthDate", e.target.value)}
                className={ABOUT_INPUT_CLASS}
              />
            </EditorBlock>
            <EditorBlock
              title={t.nationality}
              showOnCv={form.visibility.nationality}
              showOnCvLabel={t.showOnCv}
              onShowOnCvChange={(v) => setVis("nationality", v)}
            >
              <input
                value={form.nationality}
                maxLength={40}
                onChange={(e) => update("nationality", e.target.value)}
                placeholder={t.nationalityPh}
                className={ABOUT_INPUT_CLASS}
              />
            </EditorBlock>
            <EditorBlock
              title={t.military}
              showOnCv={form.visibility.military}
              showOnCvLabel={t.showOnCv}
              onShowOnCvChange={(v) => setVis("military", v)}
            >
              <select
                value={form.military ?? ""}
                onChange={(e) =>
                  update("military", (e.target.value || null) as CvMilitaryStatus | null)
                }
                className={ABOUT_INPUT_CLASS}
              >
                <option value="">{t.militaryNone}</option>
                {CV_MILITARY_STATUSES.map((id) => (
                  <option key={id} value={id}>
                    {CV_DOC_COPY[lang].military[id]}
                  </option>
                ))}
              </select>
            </EditorBlock>
          </SectionPanel>

          <SectionPanel id="projects" current={section}>
            <CvFeaturedProjectsEditor
              projects={projects}
              value={form.featuredProjectIds}
              onChange={(featuredProjectIds) => update("featuredProjectIds", featuredProjectIds)}
            />
          </SectionPanel>

          <SectionPanel id="references" current={section}>
            <CvReferencesEditor
              value={form.references}
              onChange={(references) => update("references", references)}
            />
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

        <aside
          aria-label={t.livePreview}
          className="hidden xl:block sticky top-20 self-start space-y-2"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t.livePreview}
          </p>
          <CvLivePreview
            profile={previewProfile}
            experience={deferredForm.experience}
            skills={deferredForm.skills}
            socialLinks={deferredForm.socialLinks}
            profileUrl={profileUrl}
            projects={projects}
            forceShowApplicationContact
          />
        </aside>
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

function ShowOnCvTick({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex shrink-0 items-center gap-1.5 text-xs font-normal text-foreground cursor-pointer select-none">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </label>
  );
}

function EditorBlock({
  icon: Icon,
  title,
  hint,
  showOnCv,
  showOnCvLabel,
  onShowOnCvChange,
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  showOnCv?: boolean;
  showOnCvLabel?: string;
  onShowOnCvChange?: (next: boolean) => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
          {Icon ? <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden /> : null}
          {title}
        </h4>
        <div className="flex items-center gap-2 shrink-0">
          {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
          {showOnCv != null && showOnCvLabel && onShowOnCvChange ? (
            <ShowOnCvTick checked={showOnCv} label={showOnCvLabel} onChange={onShowOnCvChange} />
          ) : null}
        </div>
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
