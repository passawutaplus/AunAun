import * as React from "react";
import type { LabsExportAction, LabsWorkbenchStatus } from "@/lib/labs/types";

export type { LabsWorkbenchStatus };

type LabsWorkbenchContextValue = {
  status: LabsWorkbenchStatus;
  setStatus: (patch: Partial<LabsWorkbenchStatus>) => void;
  inspectorVersion: number;
  getInspector: () => React.ReactNode;
  setInspectorContent: (node: React.ReactNode) => void;
  bumpInspector: () => void;
  exportVersion: number;
  getExport: () => LabsExportAction | null;
  setExportAction: (action: LabsExportAction | null) => void;
  bumpExport: () => void;
  mobileInspectorOpen: boolean;
  setMobileInspectorOpen: (open: boolean) => void;
  mobileToolsOpen: boolean;
  setMobileToolsOpen: (open: boolean) => void;
  inspectorCollapsed: boolean;
  setInspectorCollapsed: (v: boolean) => void;
};

const DEFAULT_STATUS: LabsWorkbenchStatus = {
  fileCount: 0,
  processing: false,
  privacyNote: "ประมวลผลบนเครื่อง — ไม่อัปโหลดเซิร์ฟเวอร์",
};

const LabsWorkbenchContext = React.createContext<LabsWorkbenchContextValue | null>(null);

function statusEqual(a: LabsWorkbenchStatus, b: LabsWorkbenchStatus): boolean {
  return (
    a.fileCount === b.fileCount &&
    a.processing === b.processing &&
    a.processingLabel === b.processingLabel &&
    a.lastAction === b.lastAction &&
    a.privacyNote === b.privacyNote
  );
}

export function LabsWorkbenchProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatusState] = React.useState<LabsWorkbenchStatus>(DEFAULT_STATUS);
  const [inspectorVersion, setInspectorVersion] = React.useState(0);
  const [exportVersion, setExportVersion] = React.useState(0);
  const [mobileInspectorOpen, setMobileInspectorOpen] = React.useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = React.useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = React.useState(false);
  const inspectorRef = React.useRef<React.ReactNode>(null);
  const exportRef = React.useRef<LabsExportAction | null>(null);

  const setStatus = React.useCallback((patch: Partial<LabsWorkbenchStatus>) => {
    setStatusState((prev) => {
      const next = { ...prev, ...patch };
      return statusEqual(prev, next) ? prev : next;
    });
  }, []);

  const setInspectorContent = React.useCallback((node: React.ReactNode) => {
    inspectorRef.current = node;
  }, []);

  const bumpInspector = React.useCallback(() => {
    setInspectorVersion((v) => v + 1);
  }, []);

  const getInspector = React.useCallback(() => inspectorRef.current, []);

  const setExportAction = React.useCallback((action: LabsExportAction | null) => {
    exportRef.current = action;
  }, []);

  const bumpExport = React.useCallback(() => {
    setExportVersion((v) => v + 1);
  }, []);

  const getExport = React.useCallback(() => exportRef.current, []);

  const value = React.useMemo(
    () => ({
      status,
      setStatus,
      inspectorVersion,
      getInspector,
      setInspectorContent,
      bumpInspector,
      exportVersion,
      getExport,
      setExportAction,
      bumpExport,
      mobileInspectorOpen,
      setMobileInspectorOpen,
      mobileToolsOpen,
      setMobileToolsOpen,
      inspectorCollapsed,
      setInspectorCollapsed,
    }),
    [
      status,
      setStatus,
      inspectorVersion,
      getInspector,
      setInspectorContent,
      bumpInspector,
      exportVersion,
      getExport,
      setExportAction,
      bumpExport,
      mobileInspectorOpen,
      mobileToolsOpen,
      inspectorCollapsed,
    ],
  );

  return <LabsWorkbenchContext.Provider value={value}>{children}</LabsWorkbenchContext.Provider>;
}

export function useLabsWorkbench() {
  const ctx = React.useContext(LabsWorkbenchContext);
  if (!ctx) throw new Error("useLabsWorkbench must be used within LabsWorkbenchProvider");
  return ctx;
}

export function useLabsWorkbenchOptional() {
  return React.useContext(LabsWorkbenchContext);
}
