import { Link } from "react-router-dom";
import { Gift as GiftIcon, Coins, FolderKanban, ArrowRight } from "lucide-react";
import { useReceivedGiftsByProject } from "@/hooks/useReceivedGiftsByProject";

interface Props {
  userId: string;
}

const ReceivedGiftsSummary = ({ userId }: Props) => {
  const { data, isLoading } = useReceivedGiftsByProject(userId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">กำลังโหลด...</p>;
  }

  if (!data || data.totalGifts === 0) {
    return (
      <div className="text-center py-6">
        <GiftIcon className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">ยังไม่มีของขวัญที่ได้รับ</p>
        <p className="text-xs text-muted-foreground/70 mt-1">เมื่อมีคนสนับสนุนผลงานของคุณ จะปรากฏที่นี่</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <KpiBox icon={GiftIcon} label="ของขวัญทั้งหมด" value={data.totalGifts.toLocaleString()} />
        <KpiBox icon={Coins} label="รวม px" value={data.totalPx.toLocaleString()} accent />
        <KpiBox icon={FolderKanban} label="ผลงานที่ถูกสนับสนุน" value={data.projectsCount.toLocaleString()} />
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          แยกตามผลงาน
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.byProject.slice(0, 6).map((p) => {
            const inner = (
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition">
                {p.coverUrl ? (
                  <img src={p.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.giftCount} ของขวัญ ·{" "}
                    <span className="text-primary font-medium tabular-nums">
                      {p.totalPx.toLocaleString()} px
                    </span>
                  </p>
                </div>
              </div>
            );
            return p.projectId ? (
              <Link key={p.projectId} to={`/project/${p.projectId}`}>{inner}</Link>
            ) : (
              <div key="__none__">{inner}</div>
            );
          })}
        </div>
      </div>

      <Link
        to="/earnings"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        ดูทั้งหมดในหน้ารายได้ <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
};

const KpiBox = ({
  icon: Icon, label, value, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) => (
  <div className={`rounded-xl p-3 ${accent ? "bg-primary/10 border border-primary/20" : "bg-muted/50 border border-border"}`}>
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className={`w-3.5 h-3.5 ${accent ? "text-primary" : ""}`} />
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </div>
    <p className={`mt-1 text-lg font-semibold tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>
      {value}
    </p>
  </div>
);

export default ReceivedGiftsSummary;
