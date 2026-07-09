import * as React from "react";
import type { LabsExportAction } from "@/lib/labs/types";
import { useLabsWorkbench } from "@/components/dashboard/labs/workbench/LabsWorkbenchContext";

export function useLabsToolSetup(opts: {
  inspector: React.ReactNode;
  inspectorDeps?: React.DependencyList;
  export?: LabsExportAction | null;
  exportDeps?: React.DependencyList;
  fileCount?: number;
  processing?: boolean;
  processingLabel?: string;
  lastAction?: string;
}) {
  const { setInspectorContent, bumpInspector, setExportAction, bumpExport, setStatus } =
    useLabsWorkbench();
  const inspectorRef = React.useRef(opts.inspector);
  inspectorRef.current = opts.inspector;
  const exportRef = React.useRef<LabsExportAction | null>(opts.export ?? null);
  exportRef.current = opts.export ?? null;

  const inspectorDeps = opts.inspectorDeps ?? [];
  const exportDeps = opts.exportDeps ?? [];

  React.useLayoutEffect(() => {
    setInspectorContent(inspectorRef.current);
    bumpInspector();
    return () => {
      setInspectorContent(null);
      bumpInspector();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setInspectorContent, bumpInspector, ...inspectorDeps]);

  React.useLayoutEffect(() => {
    setExportAction(exportRef.current);
    bumpExport();
    return () => {
      setExportAction(null);
      bumpExport();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setExportAction, bumpExport, ...exportDeps]);

  React.useEffect(() => {
    setStatus({
      fileCount: opts.fileCount ?? 0,
      processing: opts.processing ?? false,
      processingLabel: opts.processingLabel,
      lastAction: opts.lastAction,
    });
  }, [opts.fileCount, opts.processing, opts.processingLabel, opts.lastAction, setStatus]);
}
