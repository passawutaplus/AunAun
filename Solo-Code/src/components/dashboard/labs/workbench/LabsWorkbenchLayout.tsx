import * as React from "react";
import { useRouterState } from "@tanstack/react-router";
import { Settings2, PanelRightClose, PanelRightOpen, Menu } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LabsWorkbenchProvider, useLabsWorkbench } from "./LabsWorkbenchContext";
import { LabsAppBar } from "./LabsAppBar";
import { LabsToolSidebar } from "./LabsToolSidebar";
import { LabsInspectorPanel } from "./LabsInspectorPanel";
import { LabsStatusBar } from "./LabsStatusBar";
import { LabsMobileNav } from "./LabsMobileNav";
import { LabsExportBar } from "./LabsExportBar";
import { LabsToolDrawerContent } from "./LabsToolDrawer";
import { findToolByRoute } from "@/data/labsTools";
import { cn } from "@/lib/utils";

function LabsWorkbenchInner({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHub = pathname === "/labs" || pathname === "/labs/";
  const [search, setSearch] = React.useState("");
  const {
    mobileInspectorOpen,
    setMobileInspectorOpen,
    mobileToolsOpen,
    setMobileToolsOpen,
    getInspector,
    inspectorVersion,
    inspectorCollapsed,
    setInspectorCollapsed,
  } = useLabsWorkbench();
  const activeTool = findToolByRoute(pathname);
  const inspector = getInspector();
  void inspectorVersion;
  const hasInspector = Boolean(inspector);

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <LabsAppBar search={search} onSearchChange={setSearch} />

      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
        <div className="hidden md:flex w-[13.5rem] lg:w-56 shrink-0 min-h-0 border-r border-border overflow-hidden">
          <LabsToolSidebar searchFilter={search} />
        </div>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          {isHub ? (
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">{children}</main>
          ) : (
            <>
              <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
                <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 pb-2">
                  <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-border/60">
                    <div className="min-w-0 flex-1">
                      {activeTool && (
                        <>
                          <h2 className="text-sm font-semibold truncate">{activeTool.title}</h2>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {activeTool.description}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="md:hidden h-8 w-8"
                        aria-label="รายการเครื่องมือ"
                        onClick={() => setMobileToolsOpen(true)}
                      >
                        <Menu className="h-4 w-4" />
                      </Button>
                      {hasInspector && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="lg:hidden h-8 text-xs gap-1.5"
                            onClick={() => setMobileInspectorOpen(true)}
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            ตั้งค่า
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="hidden lg:inline-flex h-8 w-8"
                            aria-label={inspectorCollapsed ? "แสดงแผงตั้งค่า" : "ซ่อนแผงตั้งค่า"}
                            onClick={() => setInspectorCollapsed(!inspectorCollapsed)}
                          >
                            {inspectorCollapsed ? (
                              <PanelRightOpen className="h-4 w-4" />
                            ) : (
                              <PanelRightClose className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {children}
                </main>

                {hasInspector && !inspectorCollapsed && (
                  <div
                    className={cn(
                      "hidden lg:flex shrink-0 min-h-0 min-w-0 border-l border-border bg-background",
                      "w-[17rem] xl:w-72 2xl:w-80",
                    )}
                  >
                    <LabsInspectorPanel />
                  </div>
                )}
              </div>
              <LabsExportBar />
            </>
          )}
          <LabsStatusBar />
        </div>
      </div>

      <LabsMobileNav />

      <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
        <SheetContent
          side="bottom"
          className="h-[min(78vh,640px)] rounded-t-2xl lg:hidden p-0 flex flex-col"
        >
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border shrink-0">
            <SheetTitle className="text-sm">ตั้งค่า / ผลลัพธ์</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 text-sm min-w-0">
            {inspector}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobileToolsOpen} onOpenChange={setMobileToolsOpen}>
        <SheetContent side="left" className="w-[min(100vw,20rem)] p-4 md:hidden">
          <SheetHeader className="mb-3">
            <SheetTitle className="text-sm">เครื่องมือ Labs</SheetTitle>
          </SheetHeader>
          <LabsToolDrawerContent onNavigate={() => setMobileToolsOpen(false)} />
        </SheetContent>
      </Sheet>

      <Toaster position="top-center" richColors />
    </div>
  );
}

export function LabsWorkbenchLayout({ children }: { children: React.ReactNode }) {
  return (
    <LabsWorkbenchProvider>
      <LabsWorkbenchInner>{children}</LabsWorkbenchInner>
    </LabsWorkbenchProvider>
  );
}
