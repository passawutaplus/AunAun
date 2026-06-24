import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { DashSection } from "./layout/DashboardSidebar";

const NAV_ITEMS: { label: string; section: DashSection; sub?: string; keywords?: string }[] = [
  {
    label: "Home",
    section: "home",
    keywords: "ข่าว inspire เทรนด์ welcome drill โจทย์ ฝึก design",
  },
  { label: "Dashboard", section: "overview", keywords: "หน้าหลัก my desk" },
  { label: "Pipeline", section: "finance", sub: "pipeline", keywords: "ดีล kanban" },
  { label: "ใบเสนอราคา", section: "finance", sub: "quotations", keywords: "quotation" },
  { label: "Job Tracker", section: "finance", sub: "jobs", keywords: "ติดตามงาน" },
  { label: "รายได้", section: "finance", sub: "income" },
  { label: "ภาษี", section: "finance", sub: "tax", keywords: "wht ทวิ" },
  { label: "Meeting", section: "planner", sub: "meetings", keywords: "meeting จดประชุม capture อัดเสียง สรุปรายงาน" },
  { label: "Smart Brief", section: "planner", sub: "briefs", keywords: "brief quick capture" },
  { label: "Portfolio", section: "mydata", sub: "portfolio", keywords: "resume cv pitch แชร์" },
  { label: "ลูกค้า", section: "mydata", sub: "clients", keywords: "client crm" },
  { label: "To Do List", section: "planner", sub: "projects" },
  { label: "ตั้งค่า", section: "settings" },
];

const EXTERNAL_ITEMS: { label: string; to: string; keywords?: string }[] = [
  { label: "In-House Co-working", to: "/inhouse", keywords: "ทีม workspace kanban chat" },
];

export function DashboardCommandMenu({
  onNavigate,
}: {
  onNavigate: (section: DashSection, sub?: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="ค้นหาหน้า... Pipeline ภาษี ลูกค้า" />
      <CommandList>
        <CommandEmpty>ไม่พบหน้า</CommandEmpty>
        <CommandGroup heading="ไปที่">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={`${item.section}-${item.sub ?? ""}`}
              value={`${item.label} ${item.keywords ?? ""}`}
              onSelect={() => {
                onNavigate(item.section, item.sub);
                setOpen(false);
              }}
            >
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ecosystem">
          {EXTERNAL_ITEMS.map((item) => (
            <CommandItem
              key={item.to}
              value={`${item.label} ${item.keywords ?? ""}`}
              onSelect={() => {
                navigate({ to: item.to });
                setOpen(false);
              }}
            >
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="ทางลัด">
          <CommandItem
            value="support ticket แจ้งปัญหา"
            onSelect={() => {
              setOpen(false);
            }}
          >
            แจ้งปัญหา — ใช้ปุ่ม Support มุมล่างขวา
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
