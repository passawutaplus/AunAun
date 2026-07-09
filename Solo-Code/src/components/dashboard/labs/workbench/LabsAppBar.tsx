import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  FlaskConical,
  Search,
  Clock,
  HelpCircle,
  Settings,
  Download,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/NotificationBell";
import { ProductTourHeaderButton } from "@/components/dashboard/ProductTourProvider";
import { loadRecentFiles } from "@/lib/labs/recentFiles";
import { findToolById } from "@/data/labsTools";
import { LabsToolSearchResults } from "./LabsToolDrawer";
import { useLabsWorkbench } from "./LabsWorkbenchContext";

type LabsAppBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
};

export function LabsAppBar({ search, onSearchChange }: LabsAppBarProps) {
  const [recent, setRecent] = React.useState(loadRecentFiles);
  const { getExport, exportVersion, status } = useLabsWorkbench();
  const exportAction = getExport();
  void exportVersion;

  React.useEffect(() => {
    setRecent(loadRecentFiles());
  }, []);

  const showSearchResults = search.trim().length > 0;

  return (
    <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur z-30">
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
        <Link
          to="/dashboard"
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
          aria-label="กลับ Dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <FlaskConical className="h-4 w-4" />
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-semibold leading-none">Solo Labs</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">เครื่องมือเสริม</p>
          </div>
        </div>

        <div className="relative flex-1 min-w-0 max-w-md mx-1 sm:mx-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาเครื่องมือ..."
            className="h-8 pl-8 text-xs rounded-lg bg-muted/40 border-border/60"
          />
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-md z-50 max-h-48 overflow-y-auto p-1">
              <LabsToolSearchResults query={search} onNavigate={() => onSearchChange("")} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="ไฟล์ล่าสุด">
                <Clock className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">ไฟล์ล่าสุด</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {recent.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  ยังไม่มีไฟล์
                </DropdownMenuItem>
              ) : (
                recent.map((f) => {
                  const tool = findToolById(f.toolId);
                  const inner = (
                    <>
                      <span className="truncate block">{f.name}</span>
                      {tool && (
                        <span className="text-[10px] text-muted-foreground">{tool.title}</span>
                      )}
                    </>
                  );
                  return tool ? (
                    <DropdownMenuItem key={f.id} className="text-xs" asChild>
                      <Link to={tool.route}>{inner}</Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem key={f.id} className="text-xs">
                      {inner}
                    </DropdownMenuItem>
                  );
                })
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {exportAction && (
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs gap-1 hidden sm:inline-flex"
              disabled={exportAction.disabled || status.processing}
              onClick={() => void exportAction.onExport()}
            >
              {status.processing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {exportAction.label}
            </Button>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" asChild>
            <Link to="/help/labs" aria-label="คู่มือ Labs">
              <HelpCircle className="h-4 w-4" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:inline-flex" asChild>
            <Link to="/dashboard" search={{ tab: "settings" }} aria-label="ตั้งค่า">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>

          <ProductTourHeaderButton />
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
