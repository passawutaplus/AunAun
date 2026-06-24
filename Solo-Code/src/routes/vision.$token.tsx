import { createFileRoute } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Heart,
  MessageCircle,
  Send,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

type Block =
  | { id: string; kind: "image"; src: string }
  | { id: string; kind: "color"; hex: string }
  | { id: string; kind: "type"; font: string; sample: string }
  | { id: string; kind: "keyword"; text: string };

type Canvas = {
  id: string;
  title: string;
  blocks: Block[];
  palette: string[];
  font: string | null;
  keywords: string[];
  designer_note: string;
  share_token: string;
  voting_enabled: boolean;
};

type Pin = { id: string; x: number; y: number; block_id: string; name: string; message: string };

export const Route = createFileRoute("/vision/$token")({
  head: () => ({
    meta: [
      { title: "Vision Canvas — So1o Freelancer" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: PublicVisionPage,
});

function PublicVisionPage() {
  const { token } = Route.useParams();
  const [canvas, setCanvas] = React.useState<Canvas | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [likes, setLikes] = React.useState(0);
  const [comments, setComments] = React.useState<
    { id: string; guest_name: string | null; message: string | null; created_at: string }[]
  >([]);
  const [pins, setPins] = React.useState<Pin[]>([]);
  const [votes, setVotes] = React.useState<Record<string, number>>({});
  const [name, setName] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [sending, setSending] = React.useState(false);
  // Pin draft: { block_id, x, y } when user clicked an image
  const [pinDraft, setPinDraft] = React.useState<{ block_id: string; x: number; y: number } | null>(
    null,
  );
  const [pinText, setPinText] = React.useState("");

  React.useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("vision_canvases")
        .select(
          "id, title, blocks, palette, font, keywords, designer_note, share_token, voting_enabled",
        )
        .eq("share_token", token)
        .eq("is_public", true)
        .maybeSingle();
      if (error || !data) {
        setLoading(false);
        return;
      }
      setCanvas({ ...data, blocks: (data.blocks as unknown as Block[]) ?? [] } as Canvas);
      const { data: r } = await supabase
        .from("vision_canvas_reactions")
        .select("id, kind, guest_name, message, created_at, pin_x, pin_y, target_block_id")
        .eq("canvas_id", data.id)
        .order("created_at", { ascending: false });
      const rows = (r ?? []) as Array<{
        id: string;
        kind: string;
        guest_name: string | null;
        message: string | null;
        created_at: string;
        pin_x: number | null;
        pin_y: number | null;
        target_block_id: string | null;
      }>;
      setLikes(rows.filter((x) => x.kind === "like").length);
      setComments(rows.filter((x) => x.kind === "comment"));
      setPins(
        rows
          .filter(
            (r) =>
              r.kind === "pin_comment" && r.pin_x != null && r.pin_y != null && r.target_block_id,
          )
          .map((r) => ({
            id: r.id,
            x: Number(r.pin_x),
            y: Number(r.pin_y),
            block_id: r.target_block_id!,
            name: r.guest_name || "ลูกค้า",
            message: r.message || "",
          })),
      );
      const v: Record<string, number> = {};
      rows
        .filter((r) => r.kind === "vote" && r.target_block_id)
        .forEach((r) => {
          v[r.target_block_id!] = (v[r.target_block_id!] || 0) + 1;
        });
      setVotes(v);
      setLoading(false);
    })();
  }, [token]);

  const sendLike = async () => {
    if (!canvas) return;
    const { error } = await supabase.from("vision_canvas_reactions").insert({
      canvas_id: canvas.id,
      kind: "like",
      guest_name: name || "ลูกค้า",
    });
    if (error) toast.error(error.message);
    else {
      setLikes((n) => n + 1);
      toast.success("ส่งหัวใจแล้ว 💛");
    }
  };

  const sendComment = async () => {
    if (!canvas || !msg.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from("vision_canvas_reactions")
      .insert({
        canvas_id: canvas.id,
        kind: "comment",
        guest_name: name || "ลูกค้า",
        message: msg.trim(),
      })
      .select("id, guest_name, message, created_at")
      .single();
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setComments((p) => [data, ...p]);
    setMsg("");
    toast.success("ส่งคอมเมนต์แล้ว");
  };

  const onImageClick = (e: React.MouseEvent<HTMLDivElement>, blockId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPinDraft({ block_id: blockId, x, y });
    setPinText("");
  };

  const sendPin = async () => {
    if (!canvas || !pinDraft || !pinText.trim()) return;
    const { data, error } = await supabase
      .from("vision_canvas_reactions")
      .insert({
        canvas_id: canvas.id,
        kind: "pin_comment",
        guest_name: name || "ลูกค้า",
        message: pinText.trim(),
        pin_x: pinDraft.x,
        pin_y: pinDraft.y,
        target_block_id: pinDraft.block_id,
      })
      .select("id, guest_name, message, pin_x, pin_y, target_block_id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setPins((p) => [
      ...p,
      {
        id: data.id,
        x: Number(data.pin_x),
        y: Number(data.pin_y),
        block_id: data.target_block_id!,
        name: data.guest_name || "ลูกค้า",
        message: data.message || "",
      },
    ]);
    setPinDraft(null);
    setPinText("");
    toast.success("ปักหมุดแล้ว 📍");
  };

  const sendVote = async (blockId: string) => {
    if (!canvas) return;
    const { error } = await supabase.from("vision_canvas_reactions").insert({
      canvas_id: canvas.id,
      kind: "vote",
      guest_name: name || "ลูกค้า",
      target_block_id: blockId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setVotes((p) => ({ ...p, [blockId]: (p[blockId] || 0) + 1 }));
    toast.success("ขอบคุณสำหรับโหวต 👍");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  if (!canvas)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-semibold">ไม่พบ Vision Canvas นี้</p>
        <p className="text-sm text-muted-foreground mt-1">เจ้าของอาจปิดการแชร์แล้ว</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{canvas.title}</span>
          </div>
          <Badge variant="outline" className="text-[10px]">
            So1o Vision
          </Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" /> คลิกบนรูปเพื่อปักหมุดแสดงความเห็นเฉพาะจุด
            {canvas.voting_enabled && (
              <span className="ml-2 flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" /> โหมดโหวตเปิดอยู่
              </span>
            )}
          </div>
          <div className="columns-2 sm:columns-3 gap-2 [column-fill:_balance]">
            {canvas.blocks.map((b) => {
              const blockPins = pins.filter((p) => p.block_id === b.id);
              const voteCount = votes[b.id] || 0;
              return (
                <div
                  key={b.id}
                  className="mb-2 break-inside-avoid rounded-xl overflow-hidden border border-border relative"
                >
                  {b.kind === "image" && (
                    <div
                      className="relative cursor-crosshair"
                      onClick={(e) => onImageClick(e, b.id)}
                    >
                      <img src={b.src} alt="" className="w-full block" />
                      {blockPins.map((p) => (
                        <div
                          key={p.id}
                          className="absolute -translate-x-1/2 -translate-y-1/2 group/pin z-20"
                          style={{ left: `${p.x}%`, top: `${p.y}%` }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="h-6 w-6 rounded-full bg-primary border-2 border-white shadow-lg flex items-center justify-center">
                            <MessageSquare className="h-3 w-3 text-white" />
                          </div>
                          <div className="absolute left-1/2 -translate-x-1/2 top-7 w-44 bg-black/90 text-white text-[10px] rounded-md p-2 opacity-0 group-hover/pin:opacity-100 transition pointer-events-none z-30">
                            <div className="font-semibold">{p.name}</div>
                            <div className="opacity-90">{p.message}</div>
                          </div>
                        </div>
                      ))}
                      {pinDraft?.block_id === b.id && (
                        <div
                          className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                          style={{ left: `${pinDraft.x}%`, top: `${pinDraft.y}%` }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="h-6 w-6 rounded-full bg-amber-500 border-2 border-white animate-pulse" />
                        </div>
                      )}
                    </div>
                  )}
                  {b.kind === "color" && (
                    <div
                      className="aspect-square flex items-center justify-center text-white text-xs font-mono"
                      style={{ backgroundColor: b.hex }}
                    >
                      <span className="bg-black/30 rounded px-1.5 py-0.5">{b.hex}</span>
                    </div>
                  )}
                  {b.kind === "type" && (
                    <div className="aspect-[4/3] bg-muted/40 p-4 flex flex-col justify-center">
                      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                        {b.font}
                      </div>
                      <div className="text-2xl font-bold mt-1 leading-tight">{b.sample}</div>
                    </div>
                  )}
                  {b.kind === "keyword" && (
                    <div className="aspect-[3/2] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">#{b.text}</span>
                    </div>
                  )}
                  {canvas.voting_enabled && b.kind === "image" && (
                    <button
                      onClick={() => sendVote(b.id)}
                      className="absolute bottom-1.5 right-1.5 h-7 px-2 rounded-full bg-white/95 border border-border text-[11px] font-semibold flex items-center gap-1 shadow-soft hover:bg-primary hover:text-white transition z-10"
                    >
                      <ThumbsUp className="h-3 w-3" /> {voteCount}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Pin draft input */}
        {pinDraft && (
          <Card className="p-3 border-primary border-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" /> เพิ่มความเห็นที่จุดนี้
              </div>
              <Button size="sm" variant="ghost" onClick={() => setPinDraft(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
              <Input
                placeholder="ชื่อ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-xs"
              />
              <Input
                placeholder="เช่น 'ตรงนี้สีจัดไป'"
                value={pinText}
                onChange={(e) => setPinText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendPin();
                }}
                className="h-9 text-xs"
              />
              <Button
                size="sm"
                className="rounded-full"
                onClick={sendPin}
                disabled={!pinText.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        )}

        {/* Specs */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-3 space-y-2">
            <div className="text-xs font-semibold">Palette</div>
            <div className="flex flex-wrap gap-1.5">
              {canvas.palette.map((h) => (
                <div key={h} className="flex flex-col items-center">
                  <span
                    className="h-9 w-9 rounded-lg border-2 border-white shadow-soft ring-1 ring-border"
                    style={{ backgroundColor: h }}
                  />
                  <span className="text-[9px] font-mono text-muted-foreground mt-0.5">{h}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-3 space-y-2">
            <div className="text-xs font-semibold">Type & Mood</div>
            <div className="text-xs">{canvas.font || "(ไม่ระบุ)"}</div>
            <div className="flex flex-wrap gap-1">
              {canvas.keywords.map((k) => (
                <Badge key={k} variant="secondary" className="rounded-full text-[10px]">
                  #{k}
                </Badge>
              ))}
            </div>
          </Card>
        </div>

        {canvas.designer_note && (
          <Card className="p-4">
            <div className="text-xs font-semibold mb-2">Designer's Note</div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{canvas.designer_note}</p>
          </Card>
        )}

        {/* Reactions */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Heart className="h-3.5 w-3.5 text-rose-500" /> ฟีดแบ็กของคุณ
            </div>
            <Button size="sm" variant="outline" className="rounded-full gap-1.5" onClick={sendLike}>
              <Heart className="h-3.5 w-3.5" /> ถูกใจ ({likes})
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
            <Input
              placeholder="ชื่อของคุณ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
            />
            <Textarea
              placeholder="คอมเมนต์ถึงดีไซเนอร์…"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="min-h-[40px] text-xs"
            />
            <Button
              size="sm"
              className="rounded-full gap-1.5"
              onClick={sendComment}
              disabled={sending || !msg.trim()}
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}{" "}
              ส่ง
            </Button>
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            {comments.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-2">ยังไม่มีคอมเมนต์</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2 items-start">
                  <MessageCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold">{c.guest_name || "ลูกค้า"}</div>
                    <div className="text-xs">{c.message}</div>
                    <div className="text-[9px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("th-TH")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </main>
      <Toaster position="top-center" richColors />
    </div>
  );
}
