import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "./StatCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFinance } from "@/store/finance";
import { ClientsProvider, useClients, type SavedClient, type ClientFile } from "@/store/clients";
import { formatTHB, MONTHLY_GOAL } from "@/data/mockData";
import {
  Users,
  Target,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plus,
  UserPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { CONTRACTS } from "./clients/shared";
import { SavedClientCard } from "./clients/SavedClientCard";
import { ClientFormDialog } from "./clients/ClientFormDialog";
import { PageFooterActions } from "./PageFooterActions";
import { ClientInvoicesSection } from "./clients/ClientInvoicesSection";
import { useClientInvoices } from "@/store/clientInvoices";

export function ClientsTab() {
  return (
    <ClientsProvider>
      <ClientsTabInner />
    </ClientsProvider>
  );
}

function ClientsTabInner() {
  const { incomes } = useFinance();
  const { list: saved, files, add, update, remove, uploadFile, deleteFile, getSignedUrl } =
    useClients();
  const { list: invoices } = useClientInvoices();
  const [editing, setEditing] = React.useState<SavedClient | "new" | null>(null);
  const [confirmDel, setConfirmDel] = React.useState<SavedClient | null>(null);

  const receivable = invoices.filter((c) => c.status !== "paid").reduce((s, c) => s + c.amount, 0);
  const overdue = invoices
    .filter((c) => c.status === "late7" || c.status === "late30")
    .reduce((s, c) => s + c.amount, 0);
  const unpaidCount = invoices.filter((c) => c.status !== "paid").length;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyEarned = incomes
    .filter((i) => i.month === thisMonth)
    .reduce((s, i) => s + i.gross, 0);
  const goalPct = Math.min(100, (monthlyEarned / MONTHLY_GOAL) * 100);

  return (
    <div className="space-y-5">
      <PageFooterActions feature="ลูกค้า" label="ลูกค้า (CRM)" />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          accent
          label="ค้างรับทั้งหมด"
          value={`฿${formatTHB(receivable)}`}
          sub={`${unpaidCount} ใบ`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="เกินกำหนด"
          value={`฿${formatTHB(overdue)}`}
          sub="ต้องตามเก็บ"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          label="รับแล้ว (เดือนนี้)"
          value={`฿${formatTHB(monthlyEarned)}`}
          sub={`เข้าจริง ${incomes.filter((i) => i.month === thisMonth).length} ใบ`}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      <Card className="animate-fade-up">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> เป้าหมายรายเดือน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="num text-3xl font-semibold">฿{formatTHB(monthlyEarned)}</p>
              <p className="text-xs text-muted-foreground">จากเป้า ฿{formatTHB(MONTHLY_GOAL)}</p>
            </div>
            <div className="text-right">
              <p className="num text-2xl font-semibold text-primary">{goalPct.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">
                {goalPct >= 100
                  ? "บรรลุแล้ว!"
                  : `เหลืออีก ฿${formatTHB(MONTHLY_GOAL - monthlyEarned)}`}
              </p>
            </div>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-primary transition-all duration-700 shadow-soft"
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <ClientInvoicesSection />

      <Card className="animate-fade-up">
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> สมุดลูกค้าของฉัน
            <span className="text-[11px] text-muted-foreground font-normal">({saved.length})</span>
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setEditing("new")}
            className="bg-gradient-primary text-primary-foreground rounded-full"
          >
            <Plus className="h-4 w-4" /> เพิ่มลูกค้า
          </Button>
        </CardHeader>
        <CardContent>
          {saved.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-xl space-y-3">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">ยังไม่มีลูกค้าในสมุด</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                  เพิ่มลูกค้าครั้งเดียว — ใช้กรอกใบเสนอราคา/ใบแจ้งหนี้ได้อัตโนมัติ
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setEditing("new")}
                className="rounded-full bg-gradient-primary text-primary-foreground gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> เพิ่มลูกค้าคนแรก
              </Button>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {saved.map((c) => (
                <SavedClientCard
                  key={c.id}
                  client={c}
                  fileCount={files.filter((f: ClientFile) => f.clientId === c.id).length}
                  onEdit={() => setEditing(c)}
                  onDelete={() => setConfirmDel(c)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="animate-fade-up">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Contract History (ข้อตกลงมาตรฐาน)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTRACTS.map((c) => (
              <div key={c.title} className="rounded-xl border border-border/60 bg-card p-3">
                <p className="text-sm font-medium mb-1">{c.title}</p>
                <p className="text-[11px] text-muted-foreground">{c.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ClientFormDialog
        editing={editing}
        onClose={() => setEditing(null)}
        files={
          editing && editing !== "new" ? files.filter((f: ClientFile) => f.clientId === editing.id) : []
        }
        getSignedUrl={getSignedUrl}
        onUpload={
          editing && editing !== "new"
            ? async (file, docCategory) => {
                await uploadFile(editing.id, file, docCategory);
              }
            : undefined
        }
        onDeleteFile={async (f) => {
          await deleteFile(f);
        }}
        onCreate={async (payload, staged) => {
          const created = await add(payload);
          for (const sf of staged) {
            try {
              await uploadFile(created.id, sf.file, sf.docCategory);
            } catch {
              /* ignore per-file errors */
            }
          }
          toast.success("เพิ่มลูกค้าเรียบร้อย");
          setEditing(null);
        }}
        onUpdate={async (id, payload) => {
          await update(id, payload);
          toast.success("อัปเดตลูกค้าเรียบร้อย");
          setEditing(null);
        }}
      />

      <Dialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>ลบลูกค้านี้?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            "{confirmDel?.name}" จะถูกลบออกจากสมุด — ใบเสนอราคาที่เคยออกไม่ได้รับผลกระทบ
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDel(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDel) {
                  remove(confirmDel.id);
                  toast.success("ลบแล้ว");
                }
                setConfirmDel(null);
              }}
            >
              <Trash2 className="h-4 w-4" /> ลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
