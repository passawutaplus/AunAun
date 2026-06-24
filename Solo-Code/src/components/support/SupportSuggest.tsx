import * as React from "react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Lightbulb, LogIn, Send, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

type Suggestion = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  new: { label: "ใหม่", color: "bg-blue-100 text-blue-700" },
  reviewing: { label: "กำลังพิจารณา", color: "bg-amber-100 text-amber-700" },
  planned: { label: "อยู่ในแผน", color: "bg-purple-100 text-purple-700" },
  shipped: { label: "ทำแล้ว ✓", color: "bg-green-100 text-green-700" },
  rejected: { label: "ยังไม่ทำ", color: "bg-gray-100 text-gray-600" },
};

const CATEGORIES = [
  { value: "feature", label: "✨ ฟีเจอร์ใหม่" },
  { value: "improvement", label: "🚀 ปรับปรุง" },
  { value: "bug", label: "🐛 รายงานบั๊ก" },
];

const schema = z.object({
  title: z.string().trim().min(3, "พิมพ์อย่างน้อย 3 ตัวอักษร").max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(["feature", "improvement", "bug"]),
});

export function SupportSuggest() {
  const { user } = useAuth();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<"feature" | "improvement" | "bug">("feature");
  const [submitting, setSubmitting] = React.useState(false);
  const [items, setItems] = React.useState<Suggestion[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await (supabase as any)
      .from("feature_suggestions")
      .select("id, title, description, category, status, admin_note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Suggestion[]) ?? []);
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="h-14 w-14 rounded-full bg-orange-50 flex items-center justify-center mb-3">
          <LogIn className="h-6 w-6 text-[#FF5F05]" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">เข้าสู่ระบบเพื่อเสนอฟีเจอร์</h3>
        <p className="text-sm text-gray-500 mb-4">ทุกข้อเสนอจากคุณช่วยให้ So1o ดีขึ้น</p>
        <Link to="/auth" search={{ redirect: undefined }}>
          <Button style={{ background: "#FF5F05" }} className="text-white hover:opacity-90">
            เข้าสู่ระบบ
          </Button>
        </Link>
      </div>
    );
  }

  const submit = async () => {
    const parsed = schema.safeParse({ title, description: description || undefined, category });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("feature_suggestions").insert({
        user_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        category: parsed.data.category,
      });
      if (error) throw error;
      toast.success("ขอบคุณ! เราได้รับข้อเสนอแล้ว 💡");
      setTitle("");
      setDescription("");
      setCategory("feature");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[#FF5F05]" />
          <h3 className="text-sm font-semibold text-gray-900">บอกเราว่าคุณอยากได้อะไร</h3>
        </div>
        <div className="flex gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value as typeof category)}
              className={`flex-1 text-[11px] px-2 py-1.5 rounded-lg border transition ${
                category === c.value
                  ? "border-[#FF5F05] bg-orange-50 text-[#FF5F05] font-medium"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          placeholder="หัวข้อสั้นๆ เช่น 'อยากได้ Dark Mode'"
          className="text-sm"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
          placeholder="อธิบายเพิ่มเติม (ไม่บังคับ)..."
          rows={3}
          className="text-sm resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{title.length}/120</span>
          <Button
            onClick={submit}
            disabled={submitting || !title.trim()}
            size="sm"
            className="text-white hover:opacity-90 gap-1.5"
            style={{ background: "#FF5F05" }}
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            ส่งข้อเสนอ
          </Button>
        </div>
      </div>

      {/* My suggestions */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">
          ข้อเสนอของคุณ ({items.length})
        </div>
        {loading ? (
          <div className="text-center py-6 text-xs text-gray-400">
            <Loader2 className="h-4 w-4 mx-auto animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400">ยังไม่มีข้อเสนอ ลองส่งดูเลย!</div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => {
              const status = STATUS_META[it.status] ?? STATUS_META.new;
              return (
                <div key={it.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-gray-900 flex-1">{it.title}</div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.color}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  {it.description && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">{it.description}</div>
                  )}
                  {it.admin_note && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-700 bg-orange-50 border border-orange-100 rounded p-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#FF5F05] shrink-0 mt-0.5" />
                      <span>{it.admin_note}</span>
                    </div>
                  )}
                  <div className="text-[10px] text-gray-400 mt-1.5">
                    {new Date(it.created_at).toLocaleDateString("th-TH", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
