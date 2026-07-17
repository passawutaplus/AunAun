import { useNavigate } from "react-router-dom";
import { ExternalLink, FileText, Link2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { LinkWorkKind } from "@/components/dashboard/LinkWorkDialog";

type LinkedWorkStripProps = {
  kind: LinkWorkKind;
  requestId: string;
  linkedProjectId?: string | null;
  linkedProjectTitle?: string | null;
  onLinkClick: () => void;
};

export function DashboardLinkedWorkStrip({
  linkedProjectId,
  linkedProjectTitle,
  onLinkClick,
}: LinkedWorkStripProps) {
  const navigate = useNavigate();

  return (
    <div className="mt-3 rounded-lg border border-dashed border-border/70 bg-muted/15 px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        <Link2 className="w-3 h-3" />
        ผลงานที่เชื่อม
      </div>
      {linkedProjectId ? (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-foreground truncate flex-1 min-w-0">
            {linkedProjectTitle ?? "ผลงานที่เชื่อมแล้ว"}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full h-7 text-[11px] gap-1"
              onClick={() => navigate(`/project/${linkedProjectId}`)}
            >
              <ExternalLink className="w-3 h-3" />
              เปิด
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full h-7 text-[11px]"
              onClick={onLinkClick}
            >
              เปลี่ยน
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full h-8 text-xs w-full sm:w-auto gap-1"
          onClick={onLinkClick}
        >
          <Link2 className="w-3.5 h-3.5" />
          เชื่อมผลงาน
        </Button>
      )}
    </div>
  );
}

type DocumentStripProps = {
  requestId: string;
  kind: LinkWorkKind;
};

export function DashboardDocumentStrip({ requestId, kind }: DocumentStripProps) {
  const openDoc = (docKind: "receipt" | "platform_fee") => {
    void requestId;
    void kind;
    const label = docKind === "receipt" ? "ใบเสร็จ" : "ใบเสร็จค่าธรรมเนียม";
    toast.info(`ยังไม่มี${label} — จะแสดงหลังชำระเงินผ่าน Aplus1`);
  };

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="rounded-full h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => openDoc("receipt")}
      >
        <Receipt className="w-3 h-3" />
        ใบเสร็จ
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="rounded-full h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => openDoc("platform_fee")}
      >
        <FileText className="w-3 h-3" />
        ค่าธรรมเนียม
      </Button>
    </div>
  );
}
