import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Share2, Copy, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";

type ShareLink = {
  id: string;
  share_token: string;
  month: string;
  client_id: string | null;
  created_at: string;
  expires_at: string | null;
};

export function ShareLinkDialog({ clients }: { clients: { id: string; name: string }[] }) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [clientId, setClientId] = React.useState<string>("__all__");
  const [loading, setLoading] = React.useState(false);
  const [links, setLinks] = React.useState<ShareLink[]>([]);

  const loadLinks = React.useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("planner_share_links")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLinks((data ?? []) as ShareLink[]);
  }, [user?.id]);

  React.useEffect(() => {
    if (open) loadLinks();
  }, [open, loadLinks]);

  const createLink = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("planner_share_links")
        .insert({
          user_id: user.id,
          month,
          client_id: clientId === "__all__" ? null : clientId,
        })
        .select()
        .single();
      if (error) throw error;
      toast.success("สร้างลิงก์แล้ว");
      setLinks((arr) => [data as ShareLink, ...arr]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างลิงก์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm("ลบลิงก์นี้?")) return;
    const { error } = await supabase.from("planner_share_links").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLinks((arr) => arr.filter((l) => l.id !== id));
    toast.success("ลบแล้ว");
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/planner/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("คัดลอกลิงก์แล้ว");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5 text-xs">
          <Share2 className="h-3.5 w-3.5" />
          ส่งให้ลูกค้าตรวจ
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>ลิงก์ให้ลูกค้าอนุมัติคอนเทนต์</DialogTitle>
          <DialogDescription>
            สร้างลิงก์ปฏิทินรายเดือน — ลูกค้าเปิดได้โดยไม่ต้อง login กดอนุมัติ/ขอแก้ได้
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>เดือน</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>ลูกค้า</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">ทุกลูกค้า</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={createLink} disabled={loading} className="rounded-xl">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4 mr-1.5" />
            )}
            สร้างลิงก์ใหม่
          </Button>

          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground">ลิงก์ที่สร้างไว้</h4>
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
              {links.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">ยังไม่มีลิงก์</p>
              )}
              {links.map((l) => {
                const cName = l.client_id
                  ? (clients.find((c) => c.id === l.client_id)?.name ?? "—")
                  : "ทุกลูกค้า";
                return (
                  <div
                    key={l.id}
                    className="flex items-center gap-2 rounded-xl border border-border/60 p-2 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {cName} · {l.month}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        /planner/{l.share_token}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => copyLink(l.share_token)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteLink(l.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
