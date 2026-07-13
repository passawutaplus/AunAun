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
import { useAuth } from "@/hooks/useAuth";
import { useUsernameAvailability, normalizeUsername } from "@/hooks/useUsernameAvailability";
import { useSubscription } from "@/core/subscription";
import { uploadProjectImage } from "@/lib/uploadImage";
import { OPPORTUNITY_TYPE_KEYS, labelOpportunityType } from "@/lib/opportunity";
import { USERNAME_COOLDOWN_DAYS } from "@/lib/usernamePolicy";
import { cn } from "@/lib/utils";

/** Local-only: force open so we can iterate on the dialog UI. Set false before ship. */
const FORCE_SHOW_INTEREST_SURVEY = import.meta.env.DEV;

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
        {hint ? <p className="text-xs text-muted-foreground mt-0.5 pl-6">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function ProfileIdentityPanel({
  coverUrl,
  avatarUrl,
  coverBusy,
  avatarBusy,
  canUpload,
  username,
  setUsername,
  normalizedUsername,
  usernameOk,
  checkingUsername,
  availability,
  onPickCover,
  onPickAvatar,
  className,
}: {
  coverUrl: string | null;
  avatarUrl: string | null;
  coverBusy: boolean;
  avatarBusy: boolean;
  canUpload: boolean;
  username: string;
  setUsername: (v: string) => void;
  normalizedUsername: string;
  usernameOk: boolean;
  checkingUsername: boolean;
  availability?: { taken?: boolean; reserved?: boolean } | null;
  onPickCover: () => void;
  onPickAvatar: () => void;
  className?: string;
}) {
  const showUsernameStatus = normalizedUsername.length >= 2;
  const usernameInvalid = showUsernameStatus && !/^[a-z0-9_.]+$/.test(normalizedUsername);
  const usernameUnavailable =
    showUsernameStatus && (usernameInvalid || Boolean(availability?.taken || availability?.reserved));
  const usernameAvailable = showUsernameStatus && usernameOk && !checkingUsername;

  return (
    <div className={cn("flex flex-col bg-background overflow-hidden min-h-0 h-full", className)}>
      <button
        type="button"
        onClick={onPickCover}
        disabled={coverBusy || !canUpload}
        className="group relative flex-1 min-h-[10rem] w-full text-left pb-12"
        aria-label="อัปโหลดภาพพื้นหลัง"
      >
        {coverUrl ? (
          <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-brand opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-12 p-3 sm:p-4 flex items-center gap-2 text-white/95">
          {coverBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          <span className="text-xs font-medium">{coverUrl ? "เปลี่ยนพื้นหลัง" : "ใส่ภาพพื้นหลัง"}</span>
        </div>
      </button>

      <div className="relative -mt-12 flex justify-center z-10 px-4">
        <button
          type="button"
          onClick={onPickAvatar}
          disabled={avatarBusy || !canUpload}
          className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden border-4 border-background shadow-lg bg-muted"
          aria-label="อัปโหลดรูปโปรไฟล์"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground">
              <User className="h-10 w-10" />
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1.5 flex justify-center">
            {avatarBusy ? (
              <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5 text-white" />
            )}
          </span>
        </button>
      </div>

      <div className="relative z-10 bg-background px-4 pt-3 pb-5 space-y-3 overflow-y-auto shrink-0">
        <div className="space-y-1.5 text-center">
          <label htmlFor="onboard-username" className="text-sm font-semibold text-foreground block">
            User Name
          </label>
          <p className="text-[11px] text-muted-foreground leading-snug">
            บังคับ · ใช้ทำ /@username · เปลี่ยนได้อีกครั้งหลัง {USERNAME_COOLDOWN_DAYS} วัน
          </p>
          <div className="flex items-center rounded-xl border border-border bg-secondary focus-within:ring-2 focus-within:ring-primary/30">
            <span className="pl-3 text-sm text-muted-foreground shrink-0">@</span>
            <input
              id="onboard-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 bg-transparent px-2 py-2.5 text-sm text-foreground text-left focus:outline-none min-w-0"
              placeholder="yourname"
              autoComplete="username"
            />
            {showUsernameStatus ? (
              <span className="pr-3 shrink-0" aria-hidden>
                {checkingUsername ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : usernameAvailable ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : usernameUnavailable ? (
                  <X className="h-4 w-4 text-destructive" />
                ) : null}
              </span>
            ) : null}
          </div>
          {showUsernameStatus ? (
            <p className="sr-only" aria-live="polite">
              {checkingUsername
                ? "กำลังตรวจสอบชื่อผู้ใช้"
                : usernameAvailable
                  ? "ชื่อผู้ใช้นี้ใช้ได้"
                  : usernameUnavailable
                    ? "ชื่อผู้ใช้นี้ใช้ไม่ได้"
                    : ""}
            </p>
          ) : null}
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            เปลี่ยนชื่อแล้วลิงก์ /@ เดิมที่เคยแชร์จะเปิดไม่ได้
          </p>
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
  const { shouldShow, saveOnboarding, isSaving, isLoading, profile } = useFeedInterestSurvey(user?.id);
  const [step, setStep] = useState<Step>(() =>
    typeof window !== "undefined" && window.innerWidth >= DESKTOP_MIN ? "interests" : "identity",
  );
  const [selected, setSelected] = useState<Set<FeedInterestId>>(new Set());
  const [username, setUsername] = useState("");
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
  const normalizedUsername = normalizeUsername(username);
  const { data: availability, isFetching: checkingUsername } = useUsernameAvailability(
    normalizedUsername,
    user?.id,
  );
  const usernameOk =
    normalizedUsername.length >= 2 &&
    /^[a-z0-9_.]+$/.test(normalizedUsername) &&
    !availability?.taken &&
    !availability?.reserved;

  const mediaBusy = avatarBusy || coverBusy;

  useEffect(() => {
    setDismissed(false);
    setStep(isNarrow ? "identity" : "interests");
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- only reset on user change

  useEffect(() => {
    if (!isNarrow && step === "identity") setStep("interests");
  }, [isNarrow, step]);

  useEffect(() => {
    if (!profile) return;
    if (profile.feed_interests?.length) setSelected(new Set(profile.feed_interests as FeedInterestId[]));
    if (profile.username) setUsername(profile.username);
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

  const canContinue = useMemo(() => {
    if (step === "identity") return usernameOk;
    if (step === "interests") return selected.size >= 1 && usernameOk;
    return usernameOk && looking.length >= 1 && disciplines.length >= 1 && skills.length >= 1;
  }, [step, selected.size, usernameOk, looking.length, disciplines.length, skills.length]);

  if (!surveyVisible) return null;

  const handleSkip = () => {
    setDismissed(true);
    toast.message("ตั้งค่าโปรไฟล์ทีหลังได้ที่เกี่ยวกับฉัน");
  };

  const goBack = () => {
    if (step === "basics") setStep("interests");
    else if (step === "interests" && isNarrow) setStep("identity");
  };

  const goNext = async () => {
    if (!canContinue) return;
    if (step === "identity") {
      setStep("interests");
      return;
    }
    if (step === "interests") {
      setStep("basics");
      return;
    }

    if (FORCE_SHOW_INTEREST_SURVEY && !user) {
      setDismissed(true);
      toast.message("พรีวิว — ยังไม่ได้บันทึก (ยังไม่ล็อกอิน)");
      return;
    }

    try {
      await saveOnboarding({
        feedInterests: Array.from(selected),
        username: normalizedUsername,
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

  const uploadMedia = async (file: File | undefined, kind: "avatar" | "cover") => {
    if (!file || !user) {
      toast.message("ล็อกอินก่อนจึงอัปโหลดรูปได้");
      return;
    }
    const setBusy = kind === "avatar" ? setAvatarBusy : setCoverBusy;
    setBusy(true);
    try {
      const url = await uploadProjectImage(file, user.id, kind, tier);
      if (kind === "avatar") setAvatarUrl(url);
      else setCoverUrl(url);
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
    canUpload: Boolean(user),
    username,
    setUsername,
    normalizedUsername,
    usernameOk,
    checkingUsername,
    availability,
    onPickCover: () => coverInput.current?.click(),
    onPickAvatar: () => avatarInput.current?.click(),
  };

  const showDesktopAside = !isNarrow;
  const showMobileIdentity = isNarrow && step === "identity";
  const showStepContent = !isNarrow || step !== "identity";
  const showBack =
    step === "basics" || (step === "interests" && isNarrow);

  const stepTitle =
    step === "identity"
      ? "Your Profile"
      : step === "interests"
        ? "You're Interesting"
        : "Your Profile";
  const stepDesc =
    step === "identity"
      ? "ตั้งรูปและชื่อผู้ใช้ — แก้ทีหลังได้ที่โปรไฟล์"
      : step === "interests"
        ? "เลือกได้มากกว่า 1 — เราจะเสนอผลงานใน Explore ตามที่สนใจก่อน"
        : "แก้ทีหลังได้ที่โปรไฟล์ › เกี่ยวกับฉัน";

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-none w-[min(calc(100vw-2rem),58rem)] h-[min(84dvh,42rem)] overflow-hidden rounded-2xl p-0 gap-0 shadow-2xl [&>button]:hidden !flex !flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex h-full min-h-0 flex-col sm:flex-row">
          {showDesktopAside ? (
            <aside className="sm:w-[42%] sm:max-w-[22rem] shrink-0 sm:border-r border-border min-h-0">
              <ProfileIdentityPanel {...identityProps} />
            </aside>
          ) : null}

          {showMobileIdentity ? (
            <div className="flex flex-1 min-h-0 flex-col bg-background">
              <div className="shrink-0 px-5 pt-5 pb-3 space-y-1">
                <DialogHeader className="text-left space-y-1">
                  <DialogTitle className="text-xl thai-display">{stepTitle}</DialogTitle>
                  <DialogDescription className="text-sm thai-body">{stepDesc}</DialogDescription>
                </DialogHeader>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ProfileIdentityPanel {...identityProps} />
              </div>
              <div className="shrink-0 z-10 flex items-center justify-between gap-3 border-t border-border px-5 py-3 bg-background">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isSaving || mediaBusy}
                  className="h-auto px-1 py-1 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
                >
                  ข้ามไปก่อน
                </Button>
                <Button
                  type="button"
                  onClick={() => void goNext()}
                  disabled={!canContinue || mediaBusy}
                  className="rounded-full bg-gradient-brand text-white border-0 min-w-[10rem]"
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          ) : null}

          {showStepContent ? (
            <div className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-5">
                <DialogHeader className="text-left space-y-2">
                  <DialogTitle className="text-xl sm:text-2xl thai-display">{stepTitle}</DialogTitle>
                  <DialogDescription className="text-sm thai-body">{stepDesc}</DialogDescription>
                </DialogHeader>

                {step === "interests" && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
                    {interestOptions.map((opt) => {
                      const active = selected.has(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelected((prev) => toggleInSet(prev, opt.id))}
                          className={cn(
                            "group relative overflow-hidden rounded-xl text-left border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 min-h-[5.5rem]",
                            active
                              ? "border-primary ring-2 ring-primary/30 shadow-md"
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
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                          </div>
                          <div className="absolute inset-x-0 bottom-0 p-2 text-white">
                            <p className="text-[11px] sm:text-xs font-semibold leading-tight">{opt.label}</p>
                            <p className="text-[10px] text-white/80 mt-0.5 line-clamp-1">{opt.subtitle}</p>
                          </div>
                          {active && (
                            <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                              <Check className="h-3 w-3" aria-hidden />
                            </span>
                          )}
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

              <div className="shrink-0 z-10 flex items-center justify-between gap-3 border-t border-border px-5 py-3 sm:px-7 bg-background">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isSaving || mediaBusy}
                  className="h-auto px-1 py-1 text-xs font-normal text-muted-foreground hover:bg-transparent hover:text-foreground shrink-0"
                >
                  ข้ามไปก่อน
                </Button>
                <div className="flex items-center gap-2 shrink-0">
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
                    className="rounded-full bg-gradient-brand text-white border-0 min-w-[10rem]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
                        กำลังบันทึก…
                      </>
                    ) : step === "basics" ? (
                      "เริ่มใช้งาน"
                    ) : (
                      "ถัดไป"
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
