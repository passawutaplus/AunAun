import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { FileText, Loader2, Plus } from "lucide-react";

export type BriefPick = { id: string; title: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: (briefId: string | null) => void;
};

export function CreativeBriefHandoffDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: Props) {
  const { user } = useAuth();
  const [briefs, setBriefs] = React.useState<BriefPick[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [picked, setPicked] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setPicked(null);
      return;
    }
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    void supabase
      .from("design_briefs")
      .select("id,title")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(12)
      .then(({ data, error }) => {
        if (cancelled) return;
        setBriefs(error ? [] : ((data ?? []) as BriefPick[]));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : briefs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">ยังไม่มีบรีฟ — จะสร้างบรีฟใหม่ให้</p>
        ) : (
          <ul className="space-y-1.5 max-h-52 overflow-y-auto">
            {briefs.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setPicked(b.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-colors ${
                    picked === b.id
                      ? "border-primary bg-primary/10"
                      : "border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <p className="font-medium truncate">{b.title}</p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="gap-1.5" onClick={() => onConfirm(null)}>
            <Plus className="h-3.5 w-3.5" />
            สร้างบรีฟใหม่
          </Button>
          <Button
            type="button"
            disabled={briefs.length > 0 && !picked}
            onClick={() => onConfirm(picked)}
          >
            ส่งเข้าบรีฟ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
