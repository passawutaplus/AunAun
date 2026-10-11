import { useDeferredValue, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  Award,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Camera,
  Eye,
  FileText,
  Flag,
  FolderOpen,
  Globe,
  GraduationCap,
  Languages,
  LayoutTemplate,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  Phone,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Type,
  User,
  UserRound,
  Users,
  UserRoundCog,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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
import BirthDateField from "@/components/profile/BirthDateField";
import CvLivePreview from "@/components/profile/CvLivePreview";
import CvTemplatePicker from "@/components/profile/CvTemplatePicker";
import CvHeadingFontPicker from "@/components/profile/CvHeadingFontPicker";
import { CV_DOC_COPY } from "@/lib/aboutCvCopy";
import type { CvFit } from "@/components/profile/AboutDocumentPreview";
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
  | "layout"
  | "identity"
  | "contact"
  | "details"
  | "skills"
  | "experience"
  | "education"
  | "certification"
  | "awards"
  | "languages"
  | "references";

const ABOUT_EDIT_GROUPS: {
  id: "design" | "profile" | "work" | "background";
  items: { id: SectionId; icon: ComponentType<{ className?: string }> }[];
}[] = [
  {
    id: "design",
    items: [{ id: "layout", icon: LayoutTemplate }],
  },
  {
    id: "profile",
    items: [
      { id: "identity", icon: User },
      { id: "contact", icon: Link2 },
      { id: "details", icon: UserRoundCog },
    ],
  },
  {
    id: "work",
    items: [
      { id: "skills", icon: Sparkles },
      { id: "experience", icon: Briefcase },
    ],
  },
  {
    id: "background",
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
  profileUrl?: string | null;
  /** Leave the editor without saving (the editor asks first when there are unsaved changes). */
  onCancel?: () => void;
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

function ProfileAboutEditorInner({ userId, profile, onSaved, onCancel, sectionClassName, profileUrl }: Props) {
  const { t, lang } = useAboutEditLocale();
  const updateMut = useUpdateProfile(userId);
  const [form, setForm] = useState<FormState>(() => formFromProfile(profile));
  const [baseline, setBaseline] = useState(() => JSON.stringify(formFromProfile(profile)));
  const [section, setSection] = useState<SectionId>("identity");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [fit, setFit] = useState<CvFit>({ scale: 1, overflow: false });

  useEffect(() => {
    const next = formFromProfile(profile);
    setForm(next);
    setBaseline(JSON.stringify(next));
  }, [profile]);

  const dirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline]);

  // The browser's own "leave site?" prompt while there are unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const handleCancel = () => {
    if (dirty && !window.confirm(t.discardConfirm)) return;
    onCancel?.();
  };

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
      setBaseline(JSON.stringify(form));
      toast.success(exitAfter ? t.saved : t.savedStay);
      if (exitAfter) onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t.saveFailed);
    }
  };

  const saveBar = (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      {dirty ? (
        <span role="status" className="text-xs text-amber-600 dark:text-amber-400">
          • {t.unsaved}
        </span>
      ) : null}
      <AboutEditLangToggle />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-full xl:hidden"
        onClick={() => setPreviewOpen(true)}
      >
        <Eye className="h-3.5 w-3.5" />
        {t.previewButton}
      </Button>
      {onCancel ? (
        <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={handleCancel}>
          {t.cancel}
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        className="rounded-full"
        disabled={updateMut.isPending}
        onClick={() => void handleSave(true)}
      >
        {updateMut.isPending ? t.saving : t.saveAndBack}
      </Button>
    </div>
  );

  const livePreviewProps = {
    profile: previewProfile,
    experience: deferredForm.experience,
    skills: deferredForm.skills,
    socialLinks: deferredForm.socialLinks,
    profileUrl,
    forceShowApplicationContact: true,
    onFit: setFit,
  };

  const groupLabel = {
    design: t.groupDesign,
    profile: t.groupProfile,
    work: t.groupWork,
    background: t.groupBackground,
  } as const;
  const SectionIcon = ABOUT_EDIT_ITEMS.find((item) => item.id === section)?.icon;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
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
              return (
              <div key={group.id} className={cn(index > 0 && "border-t border-border/70")}>
                <p className="px-3.5 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
                note={!form.visibility[sectionVisKey] && (sectionCount(section, form) ?? 0) > 0 ? t.notOnCvYet : undefined}
                onChange={(v) => setVis(sectionVisKey, v)}
              />
            ) : null}
          </h3>

          <SectionPanel id="layout" current={section}>
              <EditorBlock icon={LayoutTemplate} title={t.layoutTitle}>
                <CvTemplatePicker value={form.cvTemplate} onChange={(next) => update("cvTemplate", next)} />
                <p className="text-xs text-muted-foreground">{t.layoutHint}</p>
              </EditorBlock>
              <EditorBlock icon={Type} title={t.headingFontTitle}>
                <CvHeadingFontPicker value={form.cvHeadingFont} onChange={(next) => update("cvHeadingFont", next)} />
                <p className="text-xs text-muted-foreground">{t.headingFontHint}</p>
              </EditorBlock>
              <EditorBlock icon={Languages} title={t.cvLangTitle}>
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
          </SectionPanel>

          <SectionPanel id="identity" current={section}>
              <EditorBlock icon={Camera} title={t.photo}>
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
              <EditorBlock icon={UserRound} title={t.name}>
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
              <EditorBlock icon={Target} title={t.desiredPosition}>
                <input
                  value={form.desiredRole}
                  onChange={(e) => update("desiredRole", e.target.value)}
                  maxLength={60}
                  placeholder={t.desiredPositionPh}
                  className={ABOUT_INPUT_CLASS}
                />
              </EditorBlock>
              <EditorBlock
                icon={MapPin}
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
                icon={FileText}
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
              <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <EditorBlock
                  icon={Mail}
                  filled={!!form.contactEmail.trim()}
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
                  icon={MessageCircle}
                  filled={!!form.contactLine.trim()}
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
                  icon={Phone}
                  filled={!!form.contactPhone.trim()}
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
              <p className="text-xs text-muted-foreground">{t.contactHint}</p>
              </div>
              <EditorBlock
                icon={FolderOpen}
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
                icon={Globe}
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
                icon={Share2}
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

          <SectionPanel id="details" current={section} hint={t.detailsHint}>
            <EditorBlock
              icon={CalendarDays}
              filled={!!form.birthDate}
              title={t.birthDate}
              showOnCv={form.visibility.birthDate}
              showOnCvLabel={t.showOnCv}
              onShowOnCvChange={(v) => setVis("birthDate", v)}
            >
              <BirthDateField
                value={form.birthDate}
                onChange={(birthDate) => update("birthDate", birthDate)}
                lang={lang}
                labels={{ day: t.birthDay, month: t.monthPh, year: t.birthYearPh, invalid: t.birthDateInvalid }}
              />
            </EditorBlock>
            <EditorBlock
              icon={Flag}
              filled={!!form.nationality.trim()}
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
              icon={ShieldCheck}
              filled={!!form.military}
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
          <CvLivePreview {...livePreviewProps} />
          <FitNote fit={fit} />
        </aside>
      </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-fit max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1.25rem)] gap-2 overflow-y-auto rounded-2xl p-3">
          <DialogTitle className="sr-only">{t.livePreview}</DialogTitle>
          <DialogDescription className="sr-only">{t.livePreview}</DialogDescription>
          {/* A4 portrait: as wide as fits, but never taller than the screen. */}
          <div style={{ width: "min(210mm, calc(100vw - 3rem), calc((100dvh - 7rem) * 0.707))" }}>
            <CvLivePreview {...livePreviewProps} />
          </div>
          <FitNote fit={fit} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Tells the owner when auto-fit shrank the CV, or when even the smallest step overflows. */
function FitNote({ fit }: { fit: CvFit }) {
  const { t } = useAboutEditLocale();
  if (!fit.overflow && fit.scale >= 1) return null;
  return fit.overflow ? (
    <p role="status" className="rounded-lg bg-amber-100 px-2.5 py-1.5 text-[11px] text-amber-950">
      {t.fitOverflow}
    </p>
  ) : (
    <p role="status" className="text-[11px] text-muted-foreground">
      {t.fitShrunk(Math.round(fit.scale * 100))}
    </p>
  );
}

/** One editor page: blocks are separated by thin rules, with a short hint above the list. */
function SectionPanel({
  id,
  current,
  hint,
  children,
}: {
  id: SectionId;
  current: SectionId;
  hint?: string;
  children: ReactNode;
}) {
  const active = id === current;
  return (
    <div className="space-y-4" hidden={!active} aria-hidden={!active}>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="divide-y divide-border/60 [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        {children}
      </div>
    </div>
  );
}

function ShowOnCvTick({
  checked,
  label,
  note,
  onChange,
}: {
  checked: boolean;
  label: string;
  /** Shown beside the tick, e.g. "Not on CV yet" for a filled field that is switched off. */
  note?: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {note ? <span className="text-[11px] text-amber-600 dark:text-amber-400">{note}</span> : null}
      <label className="flex items-center gap-1.5 text-xs font-normal text-foreground cursor-pointer select-none">
        <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
        {label}
      </label>
    </div>
  );
}

function EditorBlock({
  icon: Icon,
  title,
  hint,
  filled,
  showOnCv,
  showOnCvLabel,
  onShowOnCvChange,
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  /** The field has content — if it is switched off, say so beside the tick. */
  filled?: boolean;
  showOnCv?: boolean;
  showOnCvLabel?: string;
  onShowOnCvChange?: (next: boolean) => void;
  children: ReactNode;
}) {
  const { t } = useAboutEditLocale();
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
            <ShowOnCvTick
              checked={showOnCv}
              label={showOnCvLabel}
              note={filled && !showOnCv ? t.notOnCvYet : undefined}
              onChange={onShowOnCvChange}
            />
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
