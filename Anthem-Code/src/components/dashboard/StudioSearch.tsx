import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Briefcase,
  CircleHelp,
  Eye,
  Handshake,
  Image as ImageIcon,
  KeyRound,
  MapPin,
  MessageCircle,
  MessageSquareHeart,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { useHiringRequests } from "@/hooks/useHiringRequests";
import { useReceivedCollabRequests } from "@/hooks/useCollabRequests";
import { useProfilesByIds } from "@/core/profiles";
import { studioNavItems, studioRequestHref } from "@/lib/studioNav";
import { ABOUT_ME_EDIT_HREF } from "@/lib/settingsNav";
import { cn } from "@/lib/utils";

type Entry = {
  id: string;
  label: string;
  hint?: string;
  /** Extra words people might type (Thai + English). */
  keywords?: string;
  to: string;
  icon: LucideIcon;
};

/** Settings and shortcuts people look for from the studio. */
const SHORTCUTS: Entry[] = [
  { id: "new", label: "ลงผลงานใหม่", keywords: "upload add project new อัปโหลด เพิ่มผลงาน", to: "/portfolio/new", icon: Plus },
  { id: "about", label: "แก้แนะนำตัว / About Me", keywords: "bio about สกิล skill ประสบการณ์ ลิงก์ติดต่อ", to: ABOUT_ME_EDIT_HREF, icon: UserRound },
  { id: "s-profile", label: "เปลี่ยนชื่อ / username", keywords: "ชื่อ name username ลิงก์โปรไฟล์ settings ตั้งค่า", to: "/settings#profile", icon: UserRound },
  { id: "s-address", label: "ที่อยู่", keywords: "address จังหวัด ไปรษณีย์ settings", to: "/settings#profile", icon: MapPin },
  { id: "s-login", label: "รหัสผ่าน / เข้าสู่ระบบ", keywords: "password login อีเมล email google ออกจากระบบ logout", to: "/settings#account", icon: KeyRound },
  { id: "s-notify", label: "ตั้งค่าการแจ้งเตือน", keywords: "notification กระดิ่ง อีเมล email bell", to: "/settings#notifications", icon: Bell },
  { id: "s-chat", label: "ตั้งค่าแชท / ตอบกลับอัตโนมัติ", keywords: "chat auto reply บล็อก block", to: "/settings#chat", icon: MessageCircle },
  { id: "s-visibility", label: "ใครเห็นอะไร / การแท็ก", keywords: "privacy visibility tag แท็ก ซ่อน", to: "/settings#visibility", icon: Eye },
  { id: "s-data", label: "ข้อมูลของฉัน / ลบบัญชี", keywords: "pdpa data download delete ลบ คุกกี้", to: "/settings#data", icon: ShieldCheck },
  { id: "s-feedback", label: "ฟีดแบ็ก & รายงาน", keywords: "feedback beta bug รายงาน report", to: "/settings#feedback", icon: MessageSquareHeart },
  { id: "help", label: "ศูนย์ช่วยเหลือ", keywords: "help faq วิธีใช้ คู่มือ", to: "/help", icon: CircleHelp },
];

/** Before typing, show only the first few shortcuts so the list stays short. */
const IDLE_SHORTCUTS = 4;

/** Top-bar search for My Studio: pages, settings, your works, hire and collab requests. */
export default function StudioSearch({ className, compact = false }: { className?: string; compact?: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    setQuery("");
    navigate(to);
  };

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-tour="studio-search"
          aria-label="ค้นหาใน My Studio"
          title="ค้นหา (Ctrl K)"
          className={cn(
            "flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
            className,
          )}
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour="studio-search"
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-2.5 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:border-foreground/20 hover:bg-background",
          className,
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">ค้นหา…</span>
        <kbd className="hidden rounded border border-border bg-background px-1.5 text-[10px] font-medium sm:inline">Ctrl K</kbd>
      </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[12%] translate-y-0 overflow-hidden p-0 shadow-sm sm:max-w-xl">
          <DialogTitle className="sr-only">ค้นหาใน My Studio</DialogTitle>
          <DialogDescription className="sr-only">พิมพ์ชื่อหน้า ผลงาน ลูกค้า หรือการตั้งค่า</DialogDescription>
          {open ? <SearchBody query={query} onQueryChange={setQuery} onPick={go} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SearchBody({
  query,
  onQueryChange,
  onPick,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (to: string) => void;
}) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: projects = [] } = useMyProjects(user?.id);
  const { data: hire = [] } = useHiringRequests(user?.id);
  const { data: collab = [] } = useReceivedCollabRequests();
  const { data: people } = useProfilesByIds(collab.map((r) => r.sender_id));

  const pages = useMemo<Entry[]>(
    () => [
      ...studioNavItems().map((item) => ({
        id: `page-${item.id}`,
        label: item.label,
        hint: item.hint,
        to: item.to,
        icon: item.icon ?? Search,
      })),
      {
        id: "page-public",
        label: "ดูโปรไฟล์สาธารณะ",
        keywords: "profile public portfolio โปรไฟล์",
        to: profile?.username ? `/@${profile.username}` : `/u/${user?.id ?? ""}`,
        icon: Eye,
      },
    ],
    [profile?.username, user?.id],
  );

  const works: Entry[] = projects.map((p) => ({
    id: `work-${p.id}`,
    label: p.title || "ผลงานไม่มีชื่อ",
    hint: p.status === "Published" ? "เผยแพร่แล้ว" : p.status === "Draft" ? "ร่าง" : "ส่วนตัว",
    keywords: "ผลงาน project แก้ไข edit",
    to: `/portfolio/${p.id}/edit`,
    icon: ImageIcon,
  }));

  const requests: Entry[] = [
    ...hire.map((r) => ({
      id: `hire-${r.id}`,
      label: `${r.client_name || "ลูกค้า"} — ${r.project_title || "คำขอจ้าง"}`,
      hint: `งานจ้าง · ${r.status}`,
      keywords: "จ้าง hire ลูกค้า client",
      to: studioRequestHref("hire", r.id),
      icon: Briefcase,
    })),
    ...collab.map((r) => {
      const p = people?.map[r.sender_id];
      const who = p?.display_name || (p?.username ? `@${p.username}` : "ครีเอเตอร์");
      return {
        id: `collab-${r.id}`,
        label: `คอลแลปกับ ${who}`,
        hint: `คอลแลป · ${(r.collab_types ?? []).slice(0, 2).join(", ") || r.status}`,
        keywords: `collab คอลแลป ${p?.username ?? ""}`,
        to: studioRequestHref("collab", r.id),
        icon: Handshake,
      };
    }),
  ];

  const typed = query.trim().length > 0;

  return (
    <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
      <CommandInput
        value={query}
        onValueChange={onQueryChange}
        placeholder="พิมพ์ชื่อหน้า ผลงาน ลูกค้า หรือการตั้งค่า"
        className="h-12"
      />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>ไม่พบ "{query}" ลองคำอื่นดูนะ</CommandEmpty>
        <Group heading="หน้าใน My Studio" entries={pages} onPick={onPick} />
        <Group heading="ทางลัด & ตั้งค่า" entries={SHORTCUTS} onPick={onPick} limit={typed ? undefined : IDLE_SHORTCUTS} />
        {typed ? (
          <>
            <Group heading="ผลงานของฉัน" entries={works} onPick={onPick} />
            <Group heading="งานจ้าง & คอลแลป" entries={requests} onPick={onPick} />
          </>
        ) : null}
      </CommandList>
    </Command>
  );
}

function Group({
  heading,
  entries,
  onPick,
  limit,
}: {
  heading: string;
  entries: Entry[];
  onPick: (to: string) => void;
  /** Cap for the idle (nothing typed) list; while typing every entry must stay searchable. */
  limit?: number;
}) {
  if (entries.length === 0) return null;
  return (
    <CommandGroup heading={heading}>
      {(limit ? entries.slice(0, limit) : entries).map((e) => {
        const Icon = e.icon;
        return (
          <CommandItem
            key={e.id}
            value={`${e.label} ${e.hint ?? ""} ${e.keywords ?? ""} ${e.id}`}
            onSelect={() => onPick(e.to)}
            className="gap-3 px-3 py-2.5"
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-foreground">{e.label}</span>
              {e.hint ? <span className="block truncate text-xs text-muted-foreground">{e.hint}</span> : null}
            </span>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
}
