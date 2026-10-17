import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Flag, MessageSquareHeart, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOpenFeedbackTicket } from "@/hooks/useOpenFeedbackTicket";
import BetaProgress from "@/components/beta/BetaProgress";
import MascotMood from "@/components/beta/MascotMood";
import { isRatingPromptOff, setRatingPromptOff } from "@/lib/ratingPrompt";
import { pushCloudPrefs } from "@/lib/settingsCloudPrefs";
import { SettingsCard, SettingsSwitch, useSaveStatus } from "@/components/settings/SettingsCard";

/** Settings → ฟีดแบ็ก & รายงาน: Beta tester card plus links to what you have sent. */
export function FeedbackReportsSection() {
  const { user } = useAuth();
  const openFeedback = useOpenFeedbackTicket();
  const { status, saved } = useSaveStatus();
  const [askRating, setAskRating] = useState(true);

  useEffect(() => {
    setAskRating(!isRatingPromptOff());
  }, []);

  const toggleAsk = (on: boolean) => {
    setAskRating(on);
    setRatingPromptOff(!on);
    if (user?.id) void pushCloudPrefs(user.id, { ratingPromptOff: !on });
    saved();
  };

  return (
    <div className="space-y-6">
      <SettingsCard title="Beta Tester" status={status} description="ทุกฟีดแบ็กช่วยให้ SAMECOR ดีขึ้น และนับแต้มเป็นป้าย Beta">
        <div className="flex items-center gap-4">
          <MascotMood mood={5} className="h-14 w-14 shrink-0" />
          <BetaProgress userId={user?.id} className="min-w-0 flex-1" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" className="rounded-full" onClick={() => openFeedback()}>
            <MessageSquareHeart className="mr-1.5 h-4 w-4" />
            ส่งฟีดแบ็ก
          </Button>
          <label className="flex items-center gap-3 text-sm text-foreground">
            ขอคะแนนเป็นครั้งคราว
            <SettingsSwitch checked={askRating} label="ขอคะแนนเป็นครั้งคราว" onChange={toggleAsk} />
          </label>
        </div>
      </SettingsCard>

      <SettingsCard title="ที่ส่งไปแล้ว">
        <div className="grid gap-2 sm:grid-cols-3">
          <LinkRow to="/me/feedback" icon={MessageSquareHeart} label="ฟีดแบ็กของฉัน" />
          <LinkRow to="/me/reports" icon={Flag} label="รายงานของฉัน" />
          <LinkRow to="/legal/community" icon={ScrollText} label="กฎชุมชน" />
        </div>
      </SettingsCard>
    </div>
  );
}

function LinkRow({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-2 rounded-xl bg-secondary px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
