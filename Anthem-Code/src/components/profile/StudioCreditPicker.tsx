import { useMemo, useState } from "react";
import { Check, Users, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useMyStudios, useStudioMembers } from "@/hooks/useStudios";

interface Props {
  studioId: string | null;
  setStudioId: (v: string | null) => void;
  creditedIds: string[];
  setCreditedIds: (v: string[]) => void;
  ownerId: string;
}

const StudioCreditPicker = ({ studioId, setStudioId, creditedIds, setCreditedIds, ownerId }: Props) => {
  const { data: studios = [] } = useMyStudios();
  const { data: members = [] } = useStudioMembers(studioId ?? undefined);
  const [open, setOpen] = useState(false);

  const inStudioMode = !!studioId;
  const toggle = (id: string) =>
    setCreditedIds(creditedIds.includes(id) ? creditedIds.filter((x) => x !== id) : [...creditedIds, id]);

  const creditedMembers = useMemo(
    () => members.filter((m) => creditedIds.includes(m.user_id)),
    [members, creditedIds]
  );

  if (studios.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> ลงในนาม Studio
          </Label>
          <p className="text-xs text-muted-foreground mt-1">เปิดเพื่อใส่เครดิตทีม</p>
        </div>
        <Switch
          checked={inStudioMode}
          onCheckedChange={(v) => {
            if (v) {
              setStudioId(studios[0].id);
              setCreditedIds([ownerId]);
            } else {
              setStudioId(null);
              setCreditedIds([]);
            }
          }}
        />
      </div>

      {inStudioMode && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Studio</Label>
            <Select value={studioId!} onValueChange={(v) => { setStudioId(v); setCreditedIds([ownerId]); }}>
              <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {studios.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">เครดิตสมาชิก ({creditedMembers.length})</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <button className="w-full text-left rounded-xl border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40 transition">
                  {creditedMembers.length === 0
                    ? <span className="text-muted-foreground">เลือกสมาชิกที่จะให้เครดิต...</span>
                    : <span className="truncate block">{creditedMembers.map((m) => m.profile?.display_name).filter(Boolean).join(", ")}</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2 rounded-2xl" align="end">
                <div className="max-h-72 overflow-y-auto space-y-1">
                  {members.map((m) => {
                    const checked = creditedIds.includes(m.user_id);
                    return (
                      <button
                        key={m.user_id}
                        onClick={() => toggle(m.user_id)}
                        className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 text-left"
                      >
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                          <AvatarFallback>{m.profile?.display_name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{m.profile?.display_name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {m.role === "owner" ? "ผู้ก่อตั้ง" : m.role === "admin" ? "แอดมิน" : "สมาชิก"}
                          </div>
                        </div>
                        {checked && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {creditedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {creditedMembers.map((m) => (
                  <span
                    key={m.user_id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px]"
                  >
                    {m.profile?.display_name}
                    <button onClick={() => toggle(m.user_id)} aria-label="remove">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StudioCreditPicker;
