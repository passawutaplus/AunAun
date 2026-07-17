import { AlertCircle, Loader2, RefreshCw, SearchX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import PageLoader from "@/components/ui/PageLoader";

type Props = {
  isLoading: boolean;
  isError: boolean;
  isSlow?: boolean;
  onRetry?: () => void;
  loadingLabel?: string;
  errorTitle?: string;
  errorDescription?: string;
  slowTitle?: string;
  slowDescription?: string;
  /** When loading but not yet slow — use compact page loader */
  fullPageLoader?: boolean;
  emptyIcon?: LucideIcon;
};

/**
 * Shared loading / slow / error panel for critical list routes (feed, profile).
 */
export default function QueryStatusPanel({
  isLoading,
  isError,
  isSlow = false,
  onRetry,
  loadingLabel = "กำลังโหลด...",
  errorTitle = "โหลดไม่สำเร็จ",
  errorDescription = "เน็ตอาจสะดุดชั่วคราว — กดลองใหม่ได้เลย",
  slowTitle = "โหลดนานผิดปกติ",
  slowDescription = "ยังโหลดอยู่ ถ้าเกินไปลองรีเฟรชหรือกดลองใหม่",
  fullPageLoader = false,
  emptyIcon,
}: Props) {
  if (isError) {
    return (
      <EmptyState
        icon={emptyIcon ?? AlertCircle}
        title={errorTitle}
        description={errorDescription}
        action={
          onRetry ? (
            <Button variant="outline" className="rounded-full" onClick={onRetry}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              ลองใหม่
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (isLoading && isSlow) {
    return (
      <EmptyState
        icon={Loader2}
        title={slowTitle}
        description={slowDescription}
        action={
          onRetry ? (
            <Button variant="outline" className="rounded-full" onClick={onRetry}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              ลองใหม่
            </Button>
          ) : undefined
        }
      />
    );
  }

  if (isLoading) {
    return <PageLoader fullPage={fullPageLoader} label={loadingLabel} />;
  }

  return null;
}

/** Convenience empty for filter/search with no matches. */
export function FilterEmptyState({
  title,
  description,
  onClear,
}: {
  title: string;
  description?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={SearchX}
      title={title}
      description={description}
      action={
        onClear ? (
          <Button variant="outline" className="rounded-full" onClick={onClear}>
            ล้างตัวกรอง
          </Button>
        ) : undefined
      }
    />
  );
}
