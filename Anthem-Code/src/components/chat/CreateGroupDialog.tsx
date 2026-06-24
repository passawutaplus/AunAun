import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCreateGroupConversation } from "@/hooks/useChat";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (conversationId: string) => void;
}

const CreateGroupDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const create = useCreateGroupConversation();
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<
    { id: string; display_name: string; avatar_url: string | null }[]
  >([]);

  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ["group-member-search", search],
    enabled: open && search.trim().length >= 2,
    queryFn: async () => {
      const term = `%${search.trim()}%`;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .or(`display_name.ilike.${term},username.ilike.${term}`)
        .neq("user_id", user?.id ?? "")
        .limit(8);
      return (data ?? [])
        .map((p) => ({
          id: p.user_id,
          display_name: p.display_name || p.username || "ผู้ใช้",
          avatar_url: p.avatar_url,
        }))
        .filter((p) => p.id && !members.some((m) => m.id === p.id));
    },
  });

  const reset = () => {
    setTitle("");
    setSearch("");
    setMembers([]);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const addMember = (m: { id: string; display_name: string; avatar_url: string | null }) => {
    if (members.length >= 19) {
      toast.error("เลือกได้สูงสุด 19 คน (รวมคุณ 20 คน)");
      return;
    }
    setMembers((prev) => [...prev, m]);
    setSearch("");
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error("กรุณาตั้งชื่อกลุ่ม");
      return;
    }
    if (members.length === 0) {
      toast.error("เลือกสมาชิกอย่างน้อย 1 คน");
      return;
    }
    try {
      const id = await create.mutateAsync({
        title: title.trim(),
        memberIds: members.map((m) => m.id),
      });
      toast.success("สร้างกลุ่มแชทแล้ว");
      reset();
      onCreated(id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "สร้างกลุ่มไม่สำเร็จ");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            สร้างกลุ่มแชท
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="group-title">ชื่อกลุ่ม</Label>
            <Input
              id="group-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ทีมออกแบบ UI"
              maxLength={80}
            />
          </div>

          {members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full bg-muted text-sm"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={m.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">{m.display_name[0]}</AvatarFallback>
                  </Avatar>
                  {m.display_name}
                  <button
                    type="button"
                    onClick={() => setMembers((prev) => prev.filter((x) => x.id !== m.id))}
                    className="ml-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>เชิญสมาชิก</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อหรือ @username"
                className="pl-9"
              />
            </div>
            {isFetching && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> กำลังค้นหา…
              </p>
            )}
            {searchResults.length > 0 && (
              <ul className="border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
                {searchResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/60 text-left text-sm"
                      onClick={() => addMember(p)}
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={p.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">{p.display_name[0]}</AvatarFallback>
                      </Avatar>
                      {p.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            สร้างกลุ่ม
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
