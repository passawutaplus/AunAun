import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleHelp, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { useAuth } from "@/hooks/useAuth";
import { GUIDE_TOURS, GUIDE_TOUR_IDS, TOUR_QUERY_PARAM, isTourDone, resetAllTours } from "@/lib/guideTours";

/** Settings → ฟีดแบ็ก & ความช่วยเหลือ: replay any page tour, or make them all open by themselves again. */
export function GuideToursCard() {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);

  const reset = async () => {
    await resetAllTours(user?.id);
    setTick((n) => n + 1);
    toast.success("ทัวร์จะแสดงอีกครั้งเมื่อเข้าแต่ละหน้า");
  };

  return (
    <SettingsCard
      title="ทัวร์แนะนำ"
      description="ดูทัวร์ของแต่ละหน้าอีกครั้ง หรือกด ? ที่มุมหน้านั้นก็ได้"
      action={
        <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={reset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          แสดงใหม่ทั้งหมด
        </Button>
      }
    >
      <ul className="grid gap-2 sm:grid-cols-2" data-tick={tick}>
        {GUIDE_TOUR_IDS.map((id) => {
          const tour = GUIDE_TOURS[id];
          const done = isTourDone(user?.id, id);
          return (
            <li key={id}>
              <Link
                to={`${tour.path}?${TOUR_QUERY_PARAM}=${id}`}
                className="flex items-center justify-between gap-2 rounded-xl bg-secondary px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <span className="inline-flex items-center gap-2">
                  <CircleHelp className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {tour.label}
                </span>
                {done ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> ดูครบแล้ว
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">ดูทัวร์</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </SettingsCard>
  );
}
