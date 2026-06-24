import * as React from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InhouseOrg, InhouseWorkspace } from "@/lib/inhouse/types";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface Props {
  org: InhouseOrg;
  workspace: InhouseWorkspace;
}

export function InhouseCanvasTab({ org, workspace }: Props) {
  const qc = useQueryClient();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [ExcalidrawComp, setExcalidrawComp] = React.useState<React.ComponentType<{
    initialData?: { elements?: unknown[]; appState?: Record<string, unknown> };
    onChange?: (elements: unknown[], appState: Record<string, unknown>) => void;
  }> | null>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: canvases = [], isLoading } = useQuery({
    queryKey: ["inhouse-canvases", workspace.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inhouse_canvases")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createCanvas = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("inhouse_canvases")
        .insert({ workspace_id: workspace.id, name, scene_data: { elements: [], appState: {} } })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["inhouse-canvases", workspace.id] });
      setActiveId(c.id);
    },
  });

  const saveCanvas = useMutation({
    mutationFn: async (opts: { id: string; scene_data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("inhouse_canvases")
        .update({
          scene_data: opts.scene_data as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", opts.id);
      if (error) throw error;
    },
  });

  React.useEffect(() => {
    void import("@excalidraw/excalidraw")
      .then((mod) => {
        setExcalidrawComp(
          () =>
            mod.Excalidraw as React.ComponentType<{
              initialData?: { elements?: unknown[]; appState?: Record<string, unknown> };
              onChange?: (elements: unknown[], appState: Record<string, unknown>) => void;
            }>,
        );
      })
      .catch(() => {
        /* package optional until installed */
      });
  }, []);

  React.useEffect(() => {
    if (canvases[0] && !activeId) setActiveId(canvases[0].id);
  }, [canvases, activeId]);

  const active = canvases.find((c) => c.id === activeId);
  const scene = active?.scene_data as
    | { elements?: unknown[]; appState?: Record<string, unknown> }
    | undefined;

  const handleChange = (elements: unknown[], appState: Record<string, unknown>) => {
    if (!active) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveCanvas.mutateAsync({
        id: active.id,
        scene_data: { elements, appState: { ...appState, collaborators: undefined } },
      });
      void supabase.rpc("log_inhouse_activity", {
        _org_id: org.id,
        _workspace_id: workspace.id,
        _event_type: "canvas_updated",
        _metadata: { canvas_id: active.id },
      });
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ExcalidrawComp) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Canvas ต้องการ package @excalidraw/excalidraw — รัน npm install แล้ว rebuild
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Canvas</h2>
        <div className="flex flex-1 flex-wrap gap-1">
          {canvases.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={c.id === activeId ? "default" : "outline"}
              onClick={() => setActiveId(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const name = `Board ${canvases.length + 1}`;
            createCanvas.mutate(name);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          ใหม่
        </Button>
        {saveCanvas.isPending && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Save className="h-3 w-3" /> กำลังบันทึก...
          </span>
        )}
      </div>

      {active && (
        <div className="h-[calc(100vh-14rem)] overflow-hidden rounded-xl border">
          <ExcalidrawComp
            key={active.id}
            initialData={{
              elements: scene?.elements ?? [],
              appState: scene?.appState ?? { viewBackgroundColor: "#ffffff" },
            }}
            onChange={handleChange}
          />
        </div>
      )}

      {canvases.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-sm text-muted-foreground">ยังไม่มี canvas — สร้าง whiteboard แรก</p>
          <Button onClick={() => createCanvas.mutate("Main Board")}>
            <Plus className="mr-1 h-4 w-4" />
            สร้าง Canvas
          </Button>
        </div>
      )}

      {active && (
        <div className="max-w-xs">
          <Input
            defaultValue={active.name}
            onBlur={async (e) => {
              const v = e.target.value.trim();
              if (v && v !== active.name) {
                await supabase.from("inhouse_canvases").update({ name: v }).eq("id", active.id);
                qc.invalidateQueries({ queryKey: ["inhouse-canvases", workspace.id] });
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
