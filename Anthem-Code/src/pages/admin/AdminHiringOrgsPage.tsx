import { useState } from "react";
import SectionHeader from "@/components/admin/SectionHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useAdminHiringOrgs, useAdminSetHiringOrgStatus } from "@/hooks/useHiringOrgs";
import { HIRING_ORG_STATUS_LABEL, type HiringOrgStatus } from "@/lib/hiringOrg";
import { formatThaiDate } from "@/lib/format";

export default function AdminHiringOrgsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<HiringOrgStatus | "all">("pending");
  const { data = [], isLoading } = useAdminHiringOrgs(tab);
  const setStatus = useAdminSetHiringOrgStatus();
  const [note, setNote] = useState("");

  return (
    <div>
      <SectionHeader
        eyebrow="องค์กรจ้างงาน"
        title="องค์กรจ้างงาน"
        description="ตรวจนิติบุคคลก่อนให้ลงประกาศ — แอดมินอนุมัติองค์กรตัวเองได้ ถ้ายังไม่มีแอดมินคนอื่น"
      />
      <div className="flex flex-wrap gap-2 mb-4">
        {(["pending", "needs_info", "approved", "suspended", "all"] as const).map((s) => (
          <Button key={s} size="sm" variant={tab === s ? "default" : "outline"} onClick={() => setTab(s)}>
            {s === "all" ? "ทั้งหมด" : HIRING_ORG_STATUS_LABEL[s]}
          </Button>
        ))}
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">กำลังโหลด…</p> : null}
      <div className="space-y-3">
        {data.map((org) => (
          <div key={org.id} className="rounded-xl border border-admin-border p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{org.display_name}</p>
                <p className="text-xs text-admin-muted">{org.legal_name} · {org.tax_id}</p>
                <p className="text-xs text-admin-muted">{org.contact_email} · {org.contact_phone}</p>
                <p className="text-xs text-admin-muted">{formatThaiDate(org.created_at)} · {HIRING_ORG_STATUS_LABEL[org.status]}</p>
              </div>
              {org.logo_url ? <img src={org.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : null}
            </div>
            {org.created_by === user?.id ? (
              <p className="text-xs text-muted-foreground">องค์กรของคุณ — อนุมัติได้เพราะคุณเป็นแอดมิน</p>
            ) : null}
            {org.status === "pending" || org.status === "needs_info" ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setStatus.mutate({ id: org.id, status: "approved" })}>อนุมัติ</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: org.id, status: "needs_info", review_note: note || "ขอเอกสารเพิ่ม" })}>ขอข้อมูลเพิ่ม</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setStatus.mutate({ id: org.id, status: "suspended", review_note: note })}>ระงับ</Button>
              </div>
            ) : org.status === "approved" ? (
              <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: org.id, status: "suspended" })}>ระงับ</Button>
            ) : null}
          </div>
        ))}
        {data.length === 0 && !isLoading ? <p className="text-sm text-muted-foreground">ไม่มีรายการ</p> : null}
      </div>
      <div className="mt-4 max-w-md">
        <Textarea className="rounded-xl" placeholder="หมายเหตุตอนขอข้อมูลเพิ่ม / ระงับ" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </div>
  );
}
