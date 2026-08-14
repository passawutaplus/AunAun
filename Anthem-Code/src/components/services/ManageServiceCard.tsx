import { ArrowDown, ArrowUp, BarChart3, Clock, Eye, Mail, Pencil, Trash2 } from "lucide-react";
import PackagesIcon from "@/components/icons/PackagesIcon";
import { Badge } from "@/components/ui/badge";
import {
  formatServiceDurationDays,
  formatServicePriceRange,
  type CreatorService,
} from "@/hooks/useCreatorServices";
import type { PackageManageStats } from "@/hooks/usePackageManageStats";
import { formatThaiDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  service: CreatorService;
  stats?: PackageManageStats | null;
  onStats?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPreview?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  orderBusy?: boolean;
  compact?: boolean;
  layout?: "card" | "list";
};

export default function ManageServiceCard({
  service,
  stats,
  onStats,
  onEdit,
  onDelete,
  onPreview,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  orderBusy,
  compact = false,
  layout = "card",
}: Props) {
  const cover = service.cover_url?.trim() || service.gallery_urls[0] || "";
  const duration = formatServiceDurationDays(service.duration_label);
  const price = formatServicePriceRange(service.price_min_thb, service.price_thb);
  const dateLabel =
    service.updated_at && !Number.isNaN(Date.parse(service.updated_at))
      ? formatThaiDate(service.updated_at)
      : "";
  const isList = layout === "list";

  const statusBadge =
    service.status === "Published" ? (
      <Badge className="bg-success text-success-foreground text-[10px] border-0 px-1.5 py-0">
        เผยแพร่
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-card/90 text-muted-foreground text-[10px] px-1.5 py-0">
        แบบร่าง
      </Badge>
    );

  const orderActions = (
    <div className="flex items-center gap-0.5">
      {onMoveUp ? (
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp || orderBusy}
          className="p-2.5 min-h-10 min-w-10 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 touch-manipulation inline-flex items-center justify-center"
          aria-label="เลื่อนขึ้น"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      ) : null}
      {onMoveDown ? (
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown || orderBusy}
          className="p-2.5 min-h-10 min-w-10 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 touch-manipulation inline-flex items-center justify-center"
          aria-label="เลื่อนลง"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  );

  const primaryActions = (
    <div className="flex items-center gap-0.5">
      {onStats ? (
        <button
          type="button"
          onClick={onStats}
          className="p-2.5 min-h-10 min-w-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors touch-manipulation inline-flex items-center justify-center"
          aria-label="ดูสถิติแพ็กเกจ"
          title="สถิติ"
        >
          <BarChart3 className="w-3.5 h-3.5" />
        </button>
      ) : null}
      {onPreview ? (
        <button
          type="button"
          onClick={onPreview}
          className="p-2.5 min-h-10 min-w-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors touch-manipulation inline-flex items-center justify-center"
          aria-label="ดูตัวอย่าง"
          title="ดูตัวอย่าง"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      ) : null}
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="p-2.5 min-h-10 min-w-10 rounded-lg text-primary hover:bg-primary/10 transition-colors touch-manipulation inline-flex items-center justify-center"
          aria-label="แก้ไขแพ็กเกจ"
          title="แก้ไข"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="p-2.5 min-h-10 min-w-10 rounded-lg text-destructive hover:bg-destructive/10 transition-colors touch-manipulation inline-flex items-center justify-center"
          aria-label="ลบ"
          title="ลบ"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  );

  const statsRow =
    stats || onStats ? (
      <button
        type="button"
        onClick={onStats}
        disabled={!onStats}
        className={cn(
          "flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums",
          onStats && "hover:text-foreground transition-colors",
        )}
      >
        <span className="inline-flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {stats?.viewCount ?? 0}
        </span>
        <span className="inline-flex items-center gap-1">
          <Mail className="w-3 h-3" />
          {stats?.hireCount ?? 0}
        </span>
      </button>
    ) : null;

  const meta = (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground",
        compact && "gap-x-2",
      )}
    >
      <span className="font-semibold text-primary tabular-nums">{price}</span>
      {duration ? (
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {duration}
        </span>
      ) : null}
      {dateLabel ? <span>{dateLabel}</span> : null}
    </div>
  );

  const coverBlock = (
    <div
      className={cn(
        "relative bg-muted shrink-0",
        isList
          ? "w-full sm:w-40 md:w-44 aspect-[4/3] sm:aspect-auto sm:self-stretch min-h-[5.5rem]"
          : "aspect-[4/3] w-full",
      )}
    >
      {cover ? (
        <img
          src={cover}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
          <PackagesIcon className="w-6 h-6 opacity-40" />
          <span className="text-xs">ไม่มีภาพปก</span>
        </div>
      )}
      {!isList ? (
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap max-w-[calc(100%-1rem)]">
          {statusBadge}
        </div>
      ) : null}
    </div>
  );

  if (isList) {
    return (
      <div className="rounded-xl overflow-hidden glass-panel flex flex-col sm:flex-row sm:items-stretch gap-0">
        {coverBlock}
        <div className="flex-1 min-w-0 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap gap-1.5">{statusBadge}</div>
            <h3 className="font-semibold text-foreground text-sm line-clamp-1 leading-snug">
              {service.title}
            </h3>
            {meta}
            {statsRow}
            {service.summary?.trim() ? (
              <p className="text-xs text-muted-foreground line-clamp-1">{service.summary}</p>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-center shrink-0">
            <div className="flex items-center gap-1">
              {orderActions}
              {primaryActions}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden glass-panel h-full flex flex-col">
      {coverBlock}
      <div className={cn("flex flex-col flex-1 gap-2", compact ? "p-2.5" : "p-3")}>
        <div className="flex-1 min-h-0 space-y-1">
          <h3
            className={cn(
              "font-semibold text-foreground line-clamp-2 leading-snug",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {service.title}
          </h3>
          {meta}
          {statsRow}
          {!compact && service.summary?.trim() ? (
            <p className="text-xs text-muted-foreground line-clamp-2">{service.summary}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-1 pt-2 border-t border-border/50">
          {orderActions}
          {primaryActions}
        </div>
      </div>
    </div>
  );
}
