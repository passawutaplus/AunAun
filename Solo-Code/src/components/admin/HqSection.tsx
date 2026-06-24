import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAgents,
  listConversations,
  listMessages,
  chatWithAgent,
  updateAgent,
} from "@/lib/hq.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Send, Settings2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Agent = {
  slug: string;
  name: string;
  title: string;
  department: string;
  emoji: string;
  accent_color: string;
  model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  skills: string[];
};

export function HqSection() {
  const qc = useQueryClient();
  const fetchAgents = useServerFn(listAgents);
  const fetchConvs = useServerFn(listConversations);
  const fetchMsgs = useServerFn(listMessages);
  const sendChat = useServerFn(chatWithAgent);
  const patchAgent = useServerFn(updateAgent);

  const [activeSlug, setActiveSlug] = React.useState<string | null>(null);
  const [convId, setConvId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [editing, setEditing] = React.useState<Agent | null>(null);

  const agentsQ = useQuery({
    queryKey: ["hq", "agents"],
    queryFn: () => fetchAgents(),
  });

  const convsQ = useQuery({
    queryKey: ["hq", "convs", activeSlug],
    queryFn: () => fetchConvs({ data: { agentSlug: activeSlug! } }),
    enabled: !!activeSlug,
  });

  const msgsQ = useQuery({
    queryKey: ["hq", "msgs", convId],
    queryFn: () => fetchMsgs({ data: { conversationId: convId! } }),
    enabled: !!convId,
  });

  const sendMut = useMutation({
    mutationFn: (msg: string) =>
      sendChat({
        data: {
          agentSlug: activeSlug!,
          conversationId: convId ?? undefined,
          message: msg,
        },
      }),
    onSuccess: (res) => {
      setConvId(res.conversationId ?? null);
      setDraft("");
      qc.invalidateQueries({ queryKey: ["hq", "msgs", res.conversationId] });
      qc.invalidateQueries({ queryKey: ["hq", "convs", activeSlug] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (patch: Partial<Agent> & { slug: string }) => patchAgent({ data: patch as any }),
    onSuccess: () => {
      toast.success("บันทึกการตั้งค่าพนักงานเรียบร้อย");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["hq", "agents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const agents: Agent[] = agentsQ.data ?? [];
  const activeAgent = agents.find((a) => a.slug === activeSlug) ?? null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            So1o HQ — สำนักงานใหญ่ AI
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            พนักงาน AI {agents.length} ตำแหน่ง พร้อมรับคำสั่งบอส
          </p>
        </div>
      </header>

      {/* Agent Roster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {agentsQ.isLoading && (
          <div className="col-span-full text-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        )}
        {agents.map((a) => {
          const isActive = a.slug === activeSlug;
          return (
            <Card
              key={a.slug}
              onClick={() => {
                setActiveSlug(a.slug);
                setConvId(null);
              }}
              className={`p-4 cursor-pointer transition-all hover:shadow-elegant ${
                isActive ? "ring-2 ring-primary shadow-elegant" : ""
              } ${!a.is_active ? "opacity-50" : ""}`}
              style={{
                background: isActive
                  ? `linear-gradient(135deg, color-mix(in oklab, ${a.accent_color} 12%, transparent), transparent)`
                  : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-3xl">{a.emoji}</div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(a);
                  }}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-2">
                <div className="font-semibold text-sm">{a.name}</div>
                <div className="text-[11px] text-muted-foreground">{a.title}</div>
                <Badge variant="secondary" className="mt-2 text-[10px]">
                  {a.department}
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Chat Workspace */}
      {activeAgent && (
        <Card className="p-4 glass">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{activeAgent.emoji}</span>
              <div>
                <div className="font-semibold text-sm">คุยกับ {activeAgent.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {activeAgent.model} · temp {activeAgent.temperature}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="text-xs border rounded-md px-2 py-1 bg-background"
                value={convId ?? ""}
                onChange={(e) => setConvId(e.target.value || null)}
              >
                <option value="">+ ห้องแชทใหม่</option>
                {(convsQ.data ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-h-[280px] max-h-[480px] overflow-y-auto space-y-3 rounded-lg bg-muted/30 p-3 mb-3">
            {!convId && (
              <p className="text-xs text-muted-foreground text-center py-12">
                เริ่มต้นพิมพ์คำสั่งหรือคำถามด้านล่างเพื่อเริ่มห้องแชทใหม่
              </p>
            )}
            {msgsQ.data?.map((m: any) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {sendMut.isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {activeAgent.name} กำลังคิด...
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`สั่งงาน ${activeAgent.name}...`}
              rows={2}
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.trim()) {
                  sendMut.mutate(draft.trim());
                }
              }}
            />
            <Button
              onClick={() => draft.trim() && sendMut.mutate(draft.trim())}
              disabled={!draft.trim() || sendMut.isPending}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Cmd/Ctrl + Enter เพื่อส่ง</p>
        </Card>
      )}

      {/* Editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.emoji} แก้ไข {editing?.name}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">โมเดล</label>
                <Input
                  value={editing.model}
                  onChange={(e) => setEditing({ ...editing, model: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium">Temperature ({editing.temperature})</label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={2}
                    value={editing.temperature}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        temperature: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Max Tokens</label>
                  <Input
                    type="number"
                    min={100}
                    max={8000}
                    value={editing.max_tokens}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        max_tokens: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">System Prompt</label>
                <Textarea
                  value={editing.system_prompt}
                  onChange={(e) => setEditing({ ...editing, system_prompt: e.target.value })}
                  rows={14}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() =>
                editing &&
                updateMut.mutate({
                  slug: editing.slug,
                  system_prompt: editing.system_prompt,
                  model: editing.model,
                  temperature: editing.temperature,
                  max_tokens: editing.max_tokens,
                })
              }
              disabled={updateMut.isPending}
            >
              {updateMut.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
