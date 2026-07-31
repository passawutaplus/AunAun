import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Briefcase, Camera, Check, ImagePlus, Loader2, Search, Sparkles, User, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { hasConsentBannerPending, COOKIE_CONSENT_CHANGED_EVENT } from "@/lib/cookieConsent";
import { shouldDeferInterestSurvey } from "@/lib/onboardingRoutes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChipMultiSelectWithOther } from "@/components/ui/ChipMultiSelectWithOther";
import { type FeedInterestId } from "@/data/feedInterestOptions";
import { WORK_DISCIPLINE_OPTIONS } from "@/data/workDisciplineOptions";
import { SKILL_CHIP_SUGGESTIONS } from "@/data/skillChipOptions";
import { useFeedInterestSurvey } from "@/hooks/useFeedInterests";
import { useInterestCategoryCovers } from "@/hooks/useInterestCategoryCovers";
import {
  checkUsernameAvailability,
  deriveUsernameFromLabel,
} from "@/hooks/useUsernameAvailability";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/core/subscription";
import { uploadProjectImage } from "@/lib/uploadImage";
import { OPPORTUNITY_TYPE_KEYS, labelOpportunityType } from "@/lib/opportunity";
import { cn } from "@/lib/utils";
import { displayInitials } from "@/lib/avatarPool";

/** Dev / ?onboarding=1: force open for UI review. */
const FORCE_SHOW_INTEREST_SURVEY =
  import.meta.env.DEV ||
  (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("onboarding"));

/** Matches Tailwind `sm` — side-by-side layout starts here. */
const DESKTOP_MIN = 640;

type Step = "identity" | "interests" | "basics";

function useIsNarrow() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < DESKTOP_MIN : true,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${DESKTOP_MIN - 1}px)`);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}

function toggleInSet<T>(prev: Set<T>, id: T): Set<T> {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function FieldBlock({
  title,
  hint,
  icon: Icon,
  divided = false,
  children,
}: {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  divided?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2.5 pb-6 last:pb-0", divided && "border-t border-border/70 pt-6")}>
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {Icon ? <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden /> : null}
          {title}
        </h3>
        {hint ? <p className="mt-0.5 pl-6 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

type UsernameVerifyUi =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; text: string }
  | { kind: "bad"; text: string };

function ProfileIdentityPanel({
  coverUrl,
  avatarUrl,
  coverBusy,
  avatarBusy,
  displayName,
  setDisplayName,
  derivedUsername,
  usernameVerify,
  onVerifyUsername,
  onPickCover,
  onPickAvatar,
  className,
}: {
  coverUrl: string | null;
  avatarUrl: string | null;
  coverBusy: boolean;
  avatarBusy: boolean;
  displayName: string;
  setDisplayName: (v: string) => void;
  derivedUsername: string;
  usernameVerify: UsernameVerifyUi;
  onVerifyUsername: () => void;
  onPickCover: () => void;
  onPickAvatar: () => void;
  className?: string;
}) {
  const initialsSource = displayName.trim();
  const showVerifyControl = Boolean(displayName.trim());

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-background", className)}>
      <button
        type="button"
        onClick={onPickCover}
        disabled={coverBusy}
        className="group relative min-h-[10rem] w-full flex-1 cursor-pointer pb-6 text-left disabled:cursor-wait"
        aria-label="อัปโหลดภาพพื้นหลัง"
      >
        {coverUrl ? (
          <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-brand opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 text-white/95 sm:bottom-4 sm:left-4">
          <span className="inline-flex items-center gap-2">
            {coverBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            <span className="text-xs font-medium">{coverUrl ? "เปลี่ยนพื้นหลัง" : "ใส่ภาพพื้นหลัง"}</span>
          </span>
        </div>
      </button>

      <div className="relative z-10 -mt-12 flex justify-center px-4 pointer-events-none">
        <button
          type="button"
          onClick={onPickAvatar}
          disabled={avatarBusy}
          className="pointer-events-auto relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border-4 border-background bg-muted shadow-lg disabled:cursor-wait sm:h-28 sm:w-28"
          aria-label="อัปโหลดรูปโปรไฟล์"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gradient-brand text-2xl font-semibold tracking-tight text-white">
              {initialsSource.length >= 1 ? (
                displayInitials(initialsSource, 2)
              ) : (
                <User className="h-10 w-10 text-white/90" />
              )}
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 flex justify-center bg-black/55 py-1.5">
            {avatarBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
            ) : (
              <Camera className="h-3.5 w-3.5 text-white" />
            )}
          </span>
        </button>
      </div>

      <div className="relative z-10 shrink-0 overflow-y-auto bg-background px-4 pb-5 pt-3">
        <div className="mx-auto w-full max-w-[20rem] space-y-1.5 text-center">
          <label htmlFor="onboard-username" className="block text-sm font-semibold text-foreground">
            Username
          </label>
          <div className="flex items-stretch gap-2">
            <input
              id="onboard-username"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-border bg-secondary px-3 py-2.5 text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="เช่น somchai_design"
              autoComplete="username"
              maxLength={80}
              aria-invalid={usernameVerify.kind === "bad" || undefined}
            />
            <button
              type="button"
              onClick={onVerifyUsername}
              disabled={!showVerifyControl || usernameVerify.kind === "checking"}
              title={
                usernameVerify.kind === "ok"
                  ? usernameVerify.text
                  : usernameVerify.kind === "bad"
                    ? `${usernameVerify.text} · กดเช็คอีกครั้ง`
                    : "ตรวจสอบ Username"
              }
              aria-label="Verify username"
              className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-xl text-xs font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                "disabled:pointer-events-none disabled:opacity-50",
                usernameVerify.kind === "ok" ||
                  usernameVerify.kind === "bad" ||
                  usernameVerify.kind === "checking"
                  ? "h-10 w-10 px-0"
                  : "gap-1 px-3",
                usernameVerify.kind === "ok" && "bg-emerald-600 text-white hover:bg-emerald-600/90",
                usernameVerify.kind === "bad" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                usernameVerify.kind !== "ok" &&
                  usernameVerify.kind !== "bad" &&
                  "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {usernameVerify.kind === "checking" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : usernameVerify.kind === "ok" ? (
                <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              ) : usernameVerify.kind === "bad" ? (
                <X className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              ) : (
                <span>Verify</span>
              )}
            </button>
          </div>
          {derivedUsername ? (
            <p className="text-xs tabular-nums text-muted-foreground">@{derivedUsername}</p>
          ) : !displayName.trim() ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              ใช้เป็นชื่อแสดงและ @handle · แก้ทีหลังได้
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function InterestSurveyGate() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { tier } = useSubscription();
  const isNarrow = useIsNarrow();
  const { shouldShow, saveOnboarding, save, isSaving, isLoading, profile } = useFeedInterestSurvey(
    user?.id,
  );
  /** Mobile + desktop: interests first; profile (identity) follows on mobile. */
  const [step, setStep] = useState<Step>("interests");
  const [selected, setSelected] = useState<Set<FeedInterestId>>(new Set());
  const [displayName, setDisplayName] = useState("");
  const [usernameVerify, setUsernameVerify] = useState<UsernameVerifyUi>({ kind: "idle" });
  const [verifiedUsername, setVerifiedUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [looking, setLooking] = useState<string[]>([]);
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [cookiePending, setCookiePending] = useState(() => hasConsentBannerPending());
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const surveyVisible = FORCE_SHOW_INTEREST_SURVEY
    ? !dismissed
    : Boolean(
        user &&
          !isLoading &&
          shouldShow &&
          !dismissed &&
          !cookiePending &&
          !shouldDeferInterestSurvey(pathname),
      );

  const { options: interestOptions } = useInterestCategoryCovers(surveyVisible);
  const mediaBusy = avatarBusy || coverBusy;

  useEffect(() => {
    setDismissed(false);
    setStep("interests");
  }, [user?.id]);

  useEffect(() => {
    if (FORCE_SHOW_INTEREST_SURVEY) setDismissed(false);
  }, []);

  useEffect(() => {
    if (!isNarrow && step === "identity") setStep("interests");
  }, [isNarrow, step]);

  useEffect(() => {
    if (!profile) return;
    if (profile.feed_interests?.length) setSelected(new Set(profile.feed_interests as FeedInterestId[]));
    if (profile.display_name) {
      setDisplayName(profile.display_name);
      // Assigned handle is already unique — show verified until the user edits.
      const handle = deriveUsernameFromLabel(profile.display_name);
      if (handle.length >= 2) {
        setVerifiedUsername(handle);
        setUsernameVerify({ kind: "ok", text: "ใช้ได้" });
      }
    } else if (profile.username?.trim()) {
      setDisplayName(profile.username);
      const handle = deriveUsernameFromLabel(profile.username);
      if (handle.length >= 2) {
        setVerifiedUsername(handle);
        setUsernameVerify({ kind: "ok", text: "ใช้ได้" });
      }
    }
    if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
    if (profile.cover_url) setCoverUrl(profile.cover_url);
    if (profile.opportunity_types?.length) setLooking([...profile.opportunity_types]);
    if (profile.preferred_categories?.length) setDisciplines([...profile.preferred_categories]);
    if (profile.skills?.length) setSkills([...profile.skills]);
  }, [profile]);

  useEffect(() => {
    const sync = () => setCookiePending(hasConsentBannerPending());
    sync();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
  }, []);

  const derivedUsername = useMemo(() => deriveUsernameFromLabel(displayName), [displayName]);
  const derivedUsernameRef = useRef(derivedUsername);
  derivedUsernameRef.current = derivedUsername;
  const usernameOk = verifiedUsername === derivedUsername && usernameVerify.kind === "ok";

  const setDisplayNameAndResetVerify = (value: string) => {
    setDisplayName(value);
    setVerifiedUsername(null);
    setUsernameVerify({ kind: "idle" });
  };

  const onVerifyUsername = async () => {
    if (!displayName.trim() || usernameVerify.kind === "checking") return;
    const checkingFor = derivedUsername;
    setUsernameVerify({ kind: "checking" });
    const result = await checkUsernameAvailability(checkingFor, user?.id);
    if (derivedUsernameRef.current !== checkingFor) return;
    if (!result.ok) {
      setVerifiedUsername(null);
      setUsernameVerify({ kind: "bad", text: result.message });
      return;
    }
    setVerifiedUsername(result.username);
    setUsernameVerify({ kind: "ok", text: "ใช้ได้" });
  };

  /** Username required to finish (desktop) or continue from identity (mobile). */
  const canContinue = useMemo(() => {
    if (FORCE_SHOW_INTEREST_SURVEY && !user) return true;
    if (step === "interests" && isNarrow) return true;
    if (step === "basics") return true;
    return usernameOk;
  }, [user, usernameOk, step, isNarrow]);

  if (!surveyVisible) return null;

  const completeWithInterestsOnly = async () => {
    if (FORCE_SHOW_INTEREST_SURVEY && !user) {
      setDismissed(true);
      toast.message("พรีวิว — ยังไม่ได้บันทึก (ยังไม่ล็อกอิน)");
      return;
    }
    await save(Array.from(selected));
    setDismissed(true);
    toast.message(
      selected.size > 0
        ? "บันทึกความสนใจแล้ว — ตั้งโปรไฟล์ทีหลังได้ที่เกี่ยวกับฉัน"
        : "ตั้งค่าโปรไฟล์ทีหลังได้ที่เกี่ยวกับฉัน",
    );
  };

  const handleSkip = () => {
    void (async () => {
      try {
        await completeWithInterestsOnly();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
      }
    })();
  };

  const goBack = () => {
    if (step === "basics") setStep("interests");
    else if (step === "identity" && isNarrow) setStep("interests");
  };

  const finishOnboarding = async () => {
    if (FORCE_SHOW_INTEREST_SURVEY && !user) {
      setDismissed(true);
      toast.message("พรีวิว — ยังไม่ได้บันทึก (ยังไม่ล็อกอิน)");
      return;
    }

    try {
      await saveOnboarding({
        feedInterests: Array.from(selected),
        displayName: displayName.trim(),
        username: derivedUsername,
        avatarUrl,
        coverUrl,
        opportunityTypes: looking,
        preferredCategories: disciplines,
        skills,
      });
      setDismissed(true);
      toast.success("ตั้งค่าโปรไฟล์แล้ว — แก้ทีหลังได้ที่เกี่ยวกับฉัน");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  };

  const goNext = async () => {
    if (!canContinue) return;
    if (step === "interests") {
      if (isNarrow) {
        setStep("identity");
        return;
      }
      await finishOnboarding();
      return;
    }
    if (step === "identity") {
      await finishOnboarding();
      return;
    }
    await finishOnboarding();
  };

  const uploadMedia = async (file: File | undefined, kind: "avatar" | "cover") => {
    if (!file) return;
    const setBusy = kind === "avatar" ? setAvatarBusy : setCoverBusy;
    const setUrl = kind === "avatar" ? setAvatarUrl : setCoverUrl;

    if (!user) {
      if (!FORCE_SHOW_INTEREST_SURVEY) {
        toast.message("ล็อกอินก่อนจึงอัปโหลดรูปได้");
        return;
      }
      setUrl(URL.createObjectURL(file));
      return;
    }

    setBusy(true);
    try {
      const url = await uploadProjectImage(file, user.id, kind, tier);
      setUrl(url);
      toast.success(kind === "avatar" ? "อัปโหลดรูปโปรไฟล์แล้ว" : "อัปโหลดภาพพื้นหลังแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const identityProps = {
    coverUrl,
    avatarUrl,
    coverBusy,
    avatarBusy,
    displayName,
    setDisplayName: setDisplayNameAndResetVerify,
    derivedUsername,
    usernameVerify,
    onVerifyUsername,
    onPickCover: () => coverInput.current?.click(),
    onPickAvatar: () => avatarInput.current?.click(),
  };

  const showDesktopAside = !isNarrow;
  const showMobileIdentity = isNarrow && step === "identity";
  const showStepContent = !isNarrow || step !== "identity";
  const showBack = step === "basics" || (step === "identity" && isNarrow);

  const stepTitle =
    step === "identity"
      ? "ตั้งโปรไฟล์"
      : step === "interests"
        ? "You're Interesting"
        : "ตั้งโปรไฟล์";
  const stepDesc =
    step === "identity"
      ? "ตั้งรูปและ Username — แก้ทีหลังได้ที่โปรไฟล์"
      : step === "interests"
        ? "เลือกได้มากกว่า 1 หรือข้ามได้ — เราจะโชว์ผลงานใน Explore ตามที่สนใจก่อน"
        : "แก้ทีหลังได้ที่โปรไฟล์ › เกี่ยวกับฉัน";

  const primaryLabel =
    isSaving ? null : step === "interests" ? (isNarrow ? "ถัดไป" : selected.size > 0 ? "เริ่มใช้งาน" : "ข้ามและเริ่มใช้งาน") : step === "basics" ? "เริ่มใช้งาน" : "เริ่มใช้งาน";

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-none w-[min(calc(100vw-2rem),72rem)] h-[min(84dvh,42rem)] overflow-hidden rounded-2xl p-0 gap-0 shadow-2xl [&>button]:hidden !flex !flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex h-full min-h-0 flex-col sm:flex-row">
          {showDesktopAside ? (
            <aside className="min-h-0 shrink-0 border-border sm:w-[36%] sm:max-w-[26rem] sm:border-r">
              <ProfileIdentityPanel {...identityProps} />
            </aside>
          ) : null}

          {showMobileIdentity ? (
            <div className="flex min-h-0 flex-1 flex-col bg-background">
              <div className="shrink-0 space-y-1 px-5 pb-3 pt-5">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="text-xl thai-display">{stepTitle}</DialogTitle>
                  <DialogDescription className="text-sm thai-body">{stepDesc}</DialogDescription>
                </DialogHeader>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ProfileIdentityPanel {...identityProps} />
              </div>
              <div className="z-10 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-5 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isSaving || mediaBusy}
                  className="h-auto px-1 py-1 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
                >
                  ข้ามไปก่อน
                </Button>
                <div className="flex shrink-0 items-center gap-2">
                  {showBack ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={goBack}
                      disabled={isSaving}
                      className="rounded-full text-muted-foreground"
                    >
                      ย้อนกลับ
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={() => void goNext()}
                    disabled={!canContinue || isSaving || mediaBusy}
                    className="min-w-[10rem] rounded-full border-0 bg-gradient-brand text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        กำลังบันทึก…
                      </>
                    ) : (
                      "เริ่มใช้งาน"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {showStepContent ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="text-xl thai-display sm:text-2xl">{stepTitle}</DialogTitle>
                  <DialogDescription className="text-sm thai-body">{stepDesc}</DialogDescription>
                </DialogHeader>

                {step === "interests" && (
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-3">
                    {interestOptions.map((opt) => {
                      const active = selected.has(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelected((prev) => toggleInSet(prev, opt.id))}
                          className={cn(
                            "group relative min-h-[5.5rem] overflow-hidden rounded-xl border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                            active
                              ? "border-primary shadow-md ring-2 ring-primary/30"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                            <img
                              src={opt.imageUrl}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                          </div>
                          <div className="absolute inset-x-0 bottom-0 p-2.5 text-white sm:p-3">
                            <p className="text-sm font-semibold leading-snug drop-shadow-sm sm:text-base">
                              {opt.label}
                            </p>
                          </div>
                          {active ? (
                            <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                              <Check className="h-3 w-3" aria-hidden />
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}

                {step === "basics" && (
                  <div className="space-y-0">
                    <FieldBlock title="กำลังมองหาอะไร?" hint="บังคับอย่างน้อย 1" icon={Search}>
                      <ChipMultiSelectWithOther
                        options={OPPORTUNITY_TYPE_KEYS.map((id) => ({
                          id,
                          label: labelOpportunityType(id),
                        }))}
                        selected={looking}
                        onChange={setLooking}
                        knownIds={OPPORTUNITY_TYPE_KEYS}
                        otherPlaceholder="พิมพ์สิ่งที่มองหาแล้วกด Enter"
                      />
                    </FieldBlock>

                    <FieldBlock
                      title="สายงาน"
                      hint="หมวดงานที่ทำ · บังคับอย่างน้อย 1"
                      icon={Briefcase}
                      divided
                    >
                      <ChipMultiSelectWithOther
                        options={WORK_DISCIPLINE_OPTIONS}
                        selected={disciplines}
                        onChange={setDisciplines}
                        knownIds={WORK_DISCIPLINE_OPTIONS.map((o) => o.id)}
                        otherPlaceholder="พิมพ์สายงานอื่นแล้วกด Enter"
                      />
                    </FieldBlock>

                    <FieldBlock
                      title="ความชำนาญ"
                      hint="เครื่องมือ / สไตล์ · บังคับอย่างน้อย 1"
                      icon={Sparkles}
                      divided
                    >
                      <ChipMultiSelectWithOther
                        options={SKILL_CHIP_SUGGESTIONS.map((s) => ({ id: s, label: s }))}
                        selected={skills}
                        onChange={setSkills}
                        knownIds={[...SKILL_CHIP_SUGGESTIONS]}
                        otherPlaceholder="พิมพ์ทักษะแล้วกด Enter"
                      />
                    </FieldBlock>
                  </div>
                )}
              </div>

              <div className="z-10 flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-5 py-3 sm:px-7">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isSaving || mediaBusy}
                  className="h-auto shrink-0 px-1 py-1 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
                >
                  ข้ามไปก่อน
                </Button>
                <div className="flex shrink-0 items-center gap-2">
                  {showBack ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={goBack}
                      disabled={isSaving}
                      className="rounded-full text-muted-foreground"
                    >
                      ย้อนกลับ
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={() => void goNext()}
                    disabled={!canContinue || isSaving || mediaBusy}
                    className="min-w-[10rem] rounded-full border-0 bg-gradient-brand text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        กำลังบันทึก…
                      </>
                    ) : (
                      primaryLabel
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void uploadMedia(e.target.files?.[0], "cover")}
        />
        <input
          ref={avatarInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void uploadMedia(e.target.files?.[0], "avatar")}
        />
      </DialogContent>
    </Dialog>
  );
}
