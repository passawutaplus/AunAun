import * as React from "react";
import { ClientsTab } from "./ClientsTab";
import { SuppliersTab } from "./SuppliersTab";
import { LegalDeskTab } from "@/components/legal-desk/LegalDeskTab";

export type MyDataSub = "clients" | "suppliers" | "legal";

export function MyDataTab({
  sub: rawSub = "clients",
  onNavigate,
}: {
  sub?: string;
  onNavigate?: (section: string, sub?: string) => void;
}) {
  // Old links (portfolio / assets were retired) fall back to clients.
  const sub: MyDataSub = rawSub === "suppliers" || rawSub === "legal" ? rawSub : "clients";
  return (
    <div className="animate-fade-in">
      {sub === "clients" && <ClientsTab />}
      {sub === "suppliers" && <SuppliersTab />}
      {sub === "legal" && <LegalDeskTab onNavigate={onNavigate} />}
    </div>
  );
}
