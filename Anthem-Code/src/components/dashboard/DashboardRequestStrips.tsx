import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ExternalLink, FileText, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DocumentPaper } from "@/components/documents/DocumentPaper";
import type { LinkWorkKind } from "@/components/dashboard/LinkWorkDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useHireDocumentsByRequest,
  type DashboardHireDocItem,
} from "@/hooks/useDashboardHireDocuments";
import { docKindLabelTh } from "@/lib/documents/numbering";
import type { HireDocumentKind } from "@/lib/payments/types";

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

function shortKindLabel(kind: HireDocumentKind): string {
  switch (kind) {
    case "quotation":
      return "QT";
    case "invoice":
      return "INV";
    case "receipt":
      return "RCP";
    case "platform_fee_receipt":
      return "FEE";
    case "wht_cert":
      return "WHT";
    default:
      return kind;
  }
}

export function DashboardDocumentStrip({ requestId, kind }: DocumentStripProps) {
  const enabled = kind === "hire";
  const { data = [], isLoading } = useHireDocumentsByRequest(requestId, enabled);
  const [viewItem, setViewItem] = useState<DashboardHireDocItem | null>(null);

  if (kind !== "hire") return null;

  if (isLoading) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        เอกสาร…
      </div>
    );
  }

  if (!data.length) {
    return (
      <p className="mt-2 text-[11px] text-muted-foreground/80">ยังไม่มีเอกสารสำหรับคำขอนี้</p>
    );
  }

  const uniqueKinds = [...new Map(data.map((d) => [d.kind, d])).values()];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground">
          เอกสาร · {data.length} รายการ
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="rounded-full h-7 text-[11px] gap-1 px-2"
          onClick={() => {
            document.getElementById("hire-documents")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          ดูทั้งหมด
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {uniqueKinds.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full h-7 text-[11px] gap-1 px-2.5"
            onClick={() => {
              if (item.fileUrl && !item.snapshot) {
                window.open(item.fileUrl, "_blank", "noopener,noreferrer");
                return;
              }
              if (item.snapshot) {
                setViewItem(item);
                return;
              }
              toast.info("ยังไม่มีไฟล์ให้ดู");
            }}
          >
            <FileText className="w-3 h-3" />
            {shortKindLabel(item.kind)}
          </Button>
        ))}
        {data.some((d) => d.fileUrl || d.snapshot) ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="rounded-full h-7 text-[11px] gap-1 px-2"
            onClick={() => {
              const first = data.find((d) => d.fileUrl || d.snapshot);
              if (!first) return;
              if (first.fileUrl) {
                window.open(first.fileUrl, "_blank", "noopener,noreferrer");
                return;
              }
              if (first.snapshot) {
                setViewItem(first);
                toast.info("กด Ctrl/⌘+P เพื่อบันทึกเป็น PDF");
              }
            }}
          >
            <Download className="w-3 h-3" />
            โหลด
          </Button>
        ) : null}
      </div>

      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewItem ? docKindLabelTh(viewItem.kind) : "เอกสาร"}
            </DialogTitle>
            <DialogDescription className="tabular-nums">{viewItem?.docNumber}</DialogDescription>
          </DialogHeader>
          {viewItem?.snapshot ? <DocumentPaper doc={viewItem.snapshot} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
