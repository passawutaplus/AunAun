import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles, Pencil, Coffee, Highlighter, PenTool, Palette, Laptop, Heart, Plus, Gift as GiftIcon, FolderKanban, Eye,
} from "lucide-react";
import { useGifts, useSendGift, type Gift } from "@/hooks/useGifting";
import { useWallet, useAvailablePx, useDailyGiftTotal } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { friendlyAmlError } from "@/lib/amlErrors";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import TopUpDialog from "./TopUpDialog";
import { toast } from "sonner";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Pencil, Coffee, Highlighter, PenTool, Palette, Laptop,
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  projectId?: string | null;
  previewOnly?: boolean;
}

const DonationModal = ({ open, onOpenChange, recipientId, recipientName, recipientAvatar, projectId, previewOnly = false }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const openAuth = useAuthDialog((s) => s.openLogin);
  const { data: gifts = [] } = useGifts();
  const { data: wallet } = useWallet();
  const { data: available = 0 } = useAvailablePx();
  const { data: dailyUsed = 0 } = useDailyGiftTotal();
  const { data: profile } = useProfile(user?.id);
  const send = useSendGift();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [sentEffect, setSentEffect] = useState(false);

  const isVerified = (profile as any)?.is_verified ?? false;
  const dailyLimit = isVerified ? 5000 : 500;
  const dailyRemaining = Math.max(dailyLimit - dailyUsed, 0);

  const { data: projectInfo } = useQuery({
    queryKey: ["donation-project-title", projectId],
    enabled: !!projectId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("title, cover_url")
        .eq("id", projectId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const selected: Gift | undefined = useMemo(
    () => gifts.find((g) => g.id === selectedId),
    [gifts, selectedId]
  );
  const balance = wallet?.balance_px ?? 0;
  const needTopUp = !!selected && selected.price_px > available;
  const overDaily = !!selected && selected.price_px > dailyRemaining;

  const showSuccessToast = () => {
    if (!selected) return;
    const projectTitle = projectInfo?.title;
    const lines = [
      projectTitle ? `ผลงาน: ${projectTitle}` : null,
      previewOnly ? "🔍 โหมดพรีวิว — ไม่ตัดยอด Pixel จริง" : `−${selected.price_px} px จากกระเป๋าของคุณ`,
    ].filter(Boolean).join("\n");
    toast.success(`ส่ง ${selected.name_th} ให้ ${recipientName} แล้ว 🎁`, {
      description: lines,
      duration: 4000,
      action: previewOnly ? undefined : {
        label: "ดูประวัติ",
        onClick: () => navigate("/earnings"),
      },
    });
  };

  const finishAfterSend = () => {
    setSentEffect(true);
    showSuccessToast();
    setTimeout(() => {
      setSentEffect(false);
      setSelectedId(null);
      setMessage("");
      onOpenChange(false);
    }, 1200);
  };

  const handleSend = () => {
    if (!user) { openAuth(); return; }
    if (!selected) return;
    if (previewOnly) {
      finishAfterSend();
      return;
    }
    send.mutate(
      { recipientId, giftId: selected.id, message, projectId: projectId ?? null },
      {
        onSuccess: () => finishAfterSend(),
        onError: (e: Error) => toast.error(friendlyAmlError(e)),
      }
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {recipientAvatar ? (
                <img src={recipientAvatar} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-medium">
                  {recipientName[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <DialogTitle className="truncate">สนับสนุน {recipientName}</DialogTitle>
                <DialogDescription className="text-xs">
                  ส่ง Pixel เป็นกำลังใจให้ครีเอเตอร์ของคุณ
                </DialogDescription>
              </div>
              <button
                onClick={() => setTopUpOpen(true)}
                className="text-[11px] glass-chip rounded-full px-2.5 py-1 inline-flex items-center gap-1 hover:shadow-md transition shrink-0"
                title="เติม Pixel"
              >
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="font-medium tabular-nums">{balance.toLocaleString()}</span>
                <span className="text-muted-foreground">px</span>
                <Plus className="w-3 h-3 ml-0.5" />
              </button>
            </div>
          </DialogHeader>

          {previewOnly && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40">
              <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                <span className="font-medium">โหมดพรีวิว:</span> นี่คือผลงานของคุณเอง — ระบบจะจำลองการส่งของขวัญโดยไม่ตัด Pixel จริง
              </p>
            </div>
          )}

          {projectId && projectInfo && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15">
              {projectInfo.cover_url ? (
                <img src={projectInfo.cover_url} alt="" className="w-8 h-8 rounded-md object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-md bg-primary/15 text-primary flex items-center justify-center">
                  <FolderKanban className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-primary/80 font-medium">สนับสนุนผลงาน</p>
                <p className="text-xs font-medium truncate">{projectInfo.title}</p>
              </div>
            </div>
          )}

          {/* Daily limit + available info */}
          <div className="flex items-center justify-between text-[11px] px-1">
            <span className="text-muted-foreground">
              พร้อมใช้: <span className="text-foreground font-medium tabular-nums">{available.toLocaleString()}</span> px
            </span>
            <span className="text-muted-foreground">
              เหลือวันนี้: <span className={dailyRemaining < 100 ? "text-destructive font-medium" : "text-foreground font-medium"}>{dailyRemaining.toLocaleString()}</span> / {dailyLimit.toLocaleString()} px
              {!isVerified && <span className="ml-1 text-primary">·</span>}
            </span>
          </div>
          {!isVerified && (
            <p className="text-[10px] text-muted-foreground -mt-1.5 px-1">
              <button type="button" onClick={() => navigate("/verify")} className="text-primary hover:underline">ยืนยันตัวตน</button> เพื่อเพิ่มเพดานเป็น 5,000 px/วัน
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {gifts.map((g) => {
              const Icon = ICON_MAP[g.icon] ?? GiftIcon;
              const active = selectedId === g.id;
              const unaffordable = g.price_px > balance;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedId(g.id)}
                  className={`group relative rounded-2xl border p-3 text-center transition ${
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center transition ${
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium mt-2 text-foreground line-clamp-1">{g.name_th}</p>
                  <p className={`text-[11px] mt-0.5 tabular-nums ${unaffordable ? "text-muted-foreground/70" : "text-primary"}`}>
                    {g.price_px} px
                  </p>
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">ข้อความให้กำลังใจ (ไม่บังคับ)</label>
            <Textarea
              placeholder="ผลงานเจ๋งมาก! ทำต่อนะ 🔥"
              value={message}
              maxLength={160}
              onChange={(e) => setMessage(e.target.value)}
              className="resize-none min-h-[72px]"
            />
            <p className="text-[10px] text-muted-foreground text-right">{message.length}/160</p>
          </div>

          {needTopUp && !previewOnly ? (
            <div className="space-y-2">
              <p className="text-xs text-destructive text-center">
                ยอดพร้อมใช้ไม่พอ — ต้องเติมอีก {(selected!.price_px - available).toLocaleString()} px
              </p>
              <Button
                onClick={() => setTopUpOpen(true)}
                className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-1.5" /> เติม Pixel
              </Button>
            </div>
          ) : overDaily && !previewOnly ? (
            <div className="space-y-2">
              <p className="text-xs text-destructive text-center">
                เกินเพดานต่อวัน — เหลือ {dailyRemaining.toLocaleString()} px
              </p>
              {!isVerified && (
                <Button onClick={() => navigate("/verify")} variant="outline" className="w-full rounded-full">
                  ยืนยันตัวตนเพื่อเพิ่มเพดาน
                </Button>
              )}
            </div>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!selected || send.isPending || sentEffect}
              className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {sentEffect ? (
                <><Heart className="w-4 h-4 mr-1.5 fill-current animate-pulse" /> ส่งสำเร็จ!</>
              ) : previewOnly ? (
                <><Eye className="w-4 h-4 mr-1.5" /> พรีวิวการส่ง {selected ? `(${selected.price_px} px)` : ""}</>
              ) : (
                <>
                  <GiftIcon className="w-4 h-4 mr-1.5" />
                  ส่งของขวัญ {selected ? `(${selected.price_px} px)` : ""}
                </>
              )}
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            ธุรกรรมนี้อยู่ภายใต้การตรวจสอบ AML — การใช้ผิดวัตถุประสงค์อาจถูกระงับบัญชีถาวร
          </p>
        </DialogContent>
      </Dialog>

      <TopUpDialog open={topUpOpen} onOpenChange={setTopUpOpen} />
    </>
  );
};

export default DonationModal;
