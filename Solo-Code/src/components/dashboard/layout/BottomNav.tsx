import * as React from "react";
import { LayoutDashboard, FileText, Kanban, Calculator, Settings } from "lucide-react";
import type { DashSection } from "./DashboardSidebar";

const ITEMS: Array<{
  key: string;
  label: string;
  section: DashSection;
  sub?: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "overview", label: "หน้าหลัก", section: "overview", Icon: LayoutDashboard },
  { key: "pipeline", label: "Pipeline", section: "finance", sub: "pipeline", Icon: Kanban },
  { key: "quotations", label: "ใบเสนอราคา", section: "finance", sub: "quotations", Icon: FileText },
  { key: "tax", label: "ภาษี", section: "finance", sub: "tax", Icon: Calculator },
  { key: "settings", label: "ตั้งค่า", section: "settings", Icon: Settings },
];

type Props = {
  active: DashSection;
  activeSub?: string;
  onSelect: (section: DashSection, sub?: string) => void;
};

/**
 * Mobile bottom navigation for /dashboard. Icon-only.
 * - Visible only on screens <768px (md:hidden).
 * - Sticks to bottom with safe-area-inset support for iOS/Android PWA.
 */
export function BottomNav({ active, activeSub, onSelect }: Props) {
  return (
    <nav
      aria-label="เมนูหลัก"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 select-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ key, label, section, sub, Icon }) => {
          const isActive = active === section && (sub ? activeSub === sub : true);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onSelect(section, sub)}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
                title={label}
                className={[
                  "w-full flex items-center justify-center py-3 min-h-[56px] transition-colors active:scale-95",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <Icon className={["h-6 w-6", isActive ? "stroke-[2.4]" : ""].join(" ")} />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
