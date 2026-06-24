import * as React from "react";
import { Wallet, Palette, MessageCircle, Megaphone, Sparkles, X } from "lucide-react";

interface Topic {
  id: string;
  title: string;
  emoji: string;
  Icon: React.ComponentType<{ className?: string }>;
  gradient: string; // tailwind gradient classes
  questions: string[];
}

export const MENTOR_TOPICS: Topic[] = [
  {
    id: "price",
    title: "ราคา & ภาษี",
    emoji: "💰",
    Icon: Wallet,
    gradient: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
    questions: [
      "ตั้งราคาโลโก้ 5,000 ขาดทุนไหม?",
      "WHT 3% คิดยังไงให้ลูกค้าเข้าใจ?",
      "เสนอราคาแบบ 3 tier ทำยังไง?",
      "ขึ้นราคาลูกค้าเก่ายังไงไม่ให้เสียลูกค้า?",
    ],
  },
  {
    id: "design",
    title: "ดีไซน์ & ไอเดีย",
    emoji: "🎨",
    Icon: Palette,
    gradient: "from-violet-500/20 to-fuchsia-500/20 border-violet-500/30",
    questions: [
      "Mood แบบ Minimalist Japanese ใช้สีอะไรดี?",
      "เลือก Font Pairing สำหรับแบรนด์อาหาร",
      "แนะนำ Color Palette คาเฟ่อบอุ่น",
      "Critique โลโก้ของฉัน — ควรเริ่มยังไง?",
    ],
  },
  {
    id: "client",
    title: "คุยกับลูกค้า",
    emoji: "💬",
    Icon: MessageCircle,
    gradient: "from-sky-500/20 to-cyan-500/20 border-sky-500/30",
    questions: [
      "ลูกค้าขอแก้ไม่จบ ทำยังไงดี?",
      "ทวงเงินยังไงไม่เสียเพื่อน?",
      "ปฏิเสธ scope creep แบบสุภาพ",
      "ร่างข้อความขอเลื่อนเดดไลน์",
    ],
  },
  {
    id: "market",
    title: "การตลาด & แบรนด์",
    emoji: "📈",
    Icon: Megaphone,
    gradient: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
    questions: [
      "เขียนแคปชันขายงานสไตล์ AIDA",
      "Hashtag สำหรับ portfolio ฟรีแลนซ์ไทย",
      "สร้าง Personal Brand ใน TikTok ยังไง?",
      "เขียน Bio Instagram ให้ลูกค้าจ้าง",
    ],
  },
];

interface Props {
  onPick: (q: string) => void;
  compact?: boolean; // collapsed pill mode
  disabled?: boolean;
}

export function MentorTopicGallery({ onPick, compact, disabled }: Props) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [showModal, setShowModal] = React.useState(false);

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={disabled}
          className="text-[11px] rounded-full border border-primary/40 bg-primary/10 text-primary px-2.5 py-1 hover:bg-primary/20 inline-flex items-center gap-1 disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3" /> หาไอเดียคุย
        </button>
        {showModal && (
          <div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center p-4"
            onClick={() => setShowModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-elevated max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" /> เลือกหัวข้อสนใจ
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="h-7 w-7 rounded-full hover:bg-muted grid place-items-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Gallery
                topics={MENTOR_TOPICS}
                openId={openId}
                setOpenId={setOpenId}
                onPick={(q) => {
                  setShowModal(false);
                  onPick(q);
                }}
                disabled={disabled}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Sparkles className="h-3 w-3 text-primary" /> เริ่มคุยจากหัวข้อยอดฮิต
      </p>
      <Gallery
        topics={MENTOR_TOPICS}
        openId={openId}
        setOpenId={setOpenId}
        onPick={onPick}
        disabled={disabled}
      />
    </div>
  );
}

function Gallery({
  topics,
  openId,
  setOpenId,
  onPick,
  disabled,
}: {
  topics: Topic[];
  openId: string | null;
  setOpenId: (s: string | null) => void;
  onPick: (q: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {topics.map((t) => {
        const open = openId === t.id;
        const Icon = t.Icon;
        return (
          <div key={t.id} className={`col-span-1 ${open ? "col-span-2" : ""}`}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : t.id)}
              disabled={disabled}
              className={`w-full rounded-xl border bg-gradient-to-br ${t.gradient} p-3 text-left transition-all hover:shadow-soft hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {open ? "เลือกคำถามด้านล่าง" : `${t.questions.length} ไอเดีย →`}
                  </p>
                </div>
                <Icon className="h-4 w-4 text-foreground/60 shrink-0" />
              </div>
            </button>
            {open && (
              <div className="mt-2 space-y-1.5 animate-fade-in">
                {t.questions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onPick(q)}
                    disabled={disabled}
                    className="w-full text-left text-xs rounded-lg border border-border bg-card/60 px-3 py-2 hover:bg-primary/10 hover:border-primary/40 transition-colors disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
