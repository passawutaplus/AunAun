import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Loader2, Sparkles } from "lucide-react";
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
import { type FeedInterestId } from "@/data/feedInterestOptions";
import { useFeedInterestSurvey } from "@/hooks/useFeedInterests";
import { useInterestCategoryCovers } from "@/hooks/useInterestCategoryCovers";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

/** TEMP preview â€” set false before ship */
const FORCE_SHOW_INTEREST_SURVEY = false;

export function InterestSurveyGate() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { shouldShow, save, isSaving, isLoading } = useFeedInterestSurvey(user?.id);
  const [selected, setSelected] = useState<Set<FeedInterestId>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [cookiePending, setCookiePending] = useState(() => hasConsentBannerPending());

  const surveyVisible = FORCE_SHOW_INTEREST_SURVEY
    ? !dismissed
    : Boolean(user && !isLoading && shouldShow && !dismissed && !cookiePending && !shouldDeferInterestSurvey(pathname));

  const { options: interestOptions } = useInterestCategoryCovers(surveyVisible);

  useEffect(() => {
    setDismissed(false);
  }, [user?.id]);

  useEffect(() => {
    const sync = () => setCookiePending(hasConsentBannerPending());
    sync();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync);
  }, []);

  if (!surveyVisible) return null;

  const toggle = (id: FeedInterestId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size === 0) return;
    if (FORCE_SHOW_INTEREST_SURVEY && !user) {
      setDismissed(true);
      toast.message("à¸žà¸£à¸µà¸§à¸´à¸§ â€” à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸šà¸±à¸™à¸—à¸¶à¸ (à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¥à¹‡à¸­à¸à¸­à¸´à¸™)");
      return;
    }
    try {
      await save(Array.from(selected));
      setDismissed(true);
      toast.success("à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸§à¸²à¸¡à¸ªà¸™à¹ƒà¸ˆà¹à¸¥à¹‰à¸§ â€” à¸Ÿà¸µà¸” Explore à¸ˆà¸°à¹€à¸ªà¸™à¸­à¸œà¸¥à¸‡à¸²à¸™à¸•à¸²à¸¡à¹à¸™à¸§à¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "à¸šà¸±à¸™à¸—à¸¶à¸à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ");
    }
  };

  const handleSkip = async () => {
    // Session dismiss only â€” do not write feed_interests_at so next login asks again
    setDismissed(true);
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-none w-[min(100vw,56rem)] h-[min(100dvh,48rem)] sm:h-auto sm:max-h-[90dvh] overflow-y-auto rounded-none sm:rounded-2xl p-0 gap-0 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="p-6 sm:p-8 space-y-6">
          <DialogHeader className="text-left space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium w-fit">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²à¸Ÿà¸µà¸”à¸‚à¸­à¸‡à¸„à¸¸à¸“
            </div>
            <DialogTitle className="text-xl sm:text-2xl thai-display">
              à¹€à¸¥à¸·à¸­à¸à¹à¸™à¸§à¸—à¸µà¹ˆà¸ªà¸™à¹ƒà¸ˆ
            </DialogTitle>
            <DialogDescription className="text-sm thai-body">
              à¹€à¸¥à¸·à¸­à¸à¹„à¸”à¹‰à¸¡à¸²à¸à¸à¸§à¹ˆà¸² 1 â€” à¹€à¸£à¸²à¸ˆà¸°à¹€à¸ªà¸™à¸­à¸œà¸¥à¸‡à¸²à¸™à¹ƒà¸™ Explore à¸•à¸²à¸¡à¹à¸™à¸§à¸™à¸µà¹‰ à¹à¸¥à¹‰à¸§à¸›à¸£à¸±à¸šà¸•à¹ˆà¸­à¸ˆà¸²à¸à¸žà¸¤à¸•à¸´à¸à¸£à¸£à¸¡à¸‚à¸­à¸‡à¸„à¸¸à¸“
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {interestOptions.map((opt) => {
              const active = selected.has(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle(opt.id)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl text-left border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 min-h-[7rem]",
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
                  <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 text-white">
                    <p className="text-xs sm:text-sm font-semibold leading-tight">{opt.label}</p>
                    <p className="text-[10px] sm:text-[11px] text-white/80 mt-0.5 line-clamp-2">{opt.subtitle}</p>
                  </div>
                  {active && (
                    <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={isSaving}
              className="rounded-full text-muted-foreground"
            >
              à¸‚à¹‰à¸²à¸¡à¹„à¸›à¸à¹ˆà¸­à¸™
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={selected.size === 0 || isSaving}
              className="rounded-full bg-gradient-brand text-white border-0 min-w-[10rem]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />
                  à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸â€¦
                </>
              ) : (
                `à¹€à¸£à¸´à¹ˆà¸¡à¸”à¸¹à¸œà¸¥à¸‡à¸²à¸™ (${selected.size || 0})`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

