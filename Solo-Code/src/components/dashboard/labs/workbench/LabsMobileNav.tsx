import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Wrench, Settings2, Home, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLabsWorkbench } from "./LabsWorkbenchContext";

export function LabsMobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { setMobileInspectorOpen, setMobileToolsOpen, getInspector, inspectorVersion } =
    useLabsWorkbench();
  const inspector = getInspector();
  void inspectorVersion;
  const isHub = pathname === "/labs" || pathname === "/labs/";
  const hasInspector = Boolean(inspector);

  return (
    <nav
      className="lg:hidden shrink-0 border-t border-border bg-background flex items-stretch safe-area-pb"
      aria-label="เมนู Labs มือถือ"
    >
      <Link
        to="/labs"
        className={cn(
          "flex-1 flex flex-col items-center justify-center py-2 text-[10px] gap-0.5 min-h-[52px]",
          isHub ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Home className="h-4 w-4" />
        หลัก
      </Link>
      <Button
        type="button"
        variant="ghost"
        className="flex-1 flex flex-col items-center justify-center py-2 h-auto rounded-none text-[10px] gap-0.5 min-h-[52px] text-muted-foreground"
        onClick={() => setMobileToolsOpen(true)}
      >
        <Grid3x3 className="h-4 w-4" />
        เครื่องมือ
      </Button>
      <Link
        to="/labs/visual/mockup"
        className={cn(
          "flex-1 flex flex-col items-center justify-center py-2 text-[10px] gap-0.5 min-h-[52px]",
          pathname.includes("/labs/visual") || pathname.includes("/labs/creative")
            ? "text-primary"
            : "text-muted-foreground",
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        ภาพ
      </Link>
      <Link
        to="/labs/files/image-toolbox"
        className={cn(
          "flex-1 flex flex-col items-center justify-center py-2 text-[10px] gap-0.5 min-h-[52px]",
          pathname.includes("/labs/files") || pathname.includes("/labs/doc")
            ? "text-primary"
            : "text-muted-foreground",
        )}
      >
        <Wrench className="h-4 w-4" />
        ไฟล์
      </Link>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "flex-1 flex flex-col items-center justify-center py-2 h-auto rounded-none text-[10px] gap-0.5 min-h-[52px]",
          hasInspector ? "text-foreground" : "text-muted-foreground/40",
        )}
        disabled={!hasInspector}
        onClick={() => setMobileInspectorOpen(true)}
      >
        <Settings2 className="h-4 w-4" />
        ตั้งค่า
      </Button>
    </nav>
  );
}
