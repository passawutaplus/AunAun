import * as React from "react";
import { safeHref } from "@/lib/security";
import { useSuppliers, type Supplier } from "@/store/suppliers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  ExternalLink,
  FileText,
  Star,
  Phone,
  Mail,
  Globe,
  Building2,
  Share2,
  MapPin,
  Eye,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageFooterActions } from "./PageFooterActions";
import { SUPPLIER_CATEGORIES, categoryIcon } from "./suppliers/categories";
import { SupplierFormDialog } from "./suppliers/SupplierFormDialog";
import { SupplierShareDialog } from "./suppliers/SupplierShareDialog";
import { SupplierPreviewDialog } from "./suppliers/SupplierPreviewDialog";

export function SuppliersTab() {
  const {
    suppliers,
    files,
    links,
    isLoading,
    create,
    update,
    remove,
    uploadFile,
    deleteFile,
    addLink,
    removeLink,
    getSignedUrl,
    enableShare,
    disableShare,
  } = useSuppliers();
  const [query, setQuery] = React.useState("");
  const [filterCat, setFilterCat] = React.useState<string>("all");
  const [editing, setEditing] = React.useState<Supplier | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState<Supplier | null>(null);
  const [sharing, setSharing] = React.useState<Supplier | null>(null);
  const [previewing, setPreviewing] = React.useState<Supplier | null>(null);

  const filtered = React.useMemo(() => {
    const ql = query.trim().toLowerCase();
    return suppliers
      .filter((s) => filterCat === "all" || s.category === filterCat)
      .filter(
        (s) =>
          !ql ||
          s.name.toLowerCase().includes(ql) ||
          (s.contactName ?? "").toLowerCase().includes(ql) ||
          s.tags.some((t) => t.toLowerCase().includes(ql)),
      );
  }, [suppliers, query, filterCat]);

  return (
    <div className="space-y-4">
      <PageFooterActions feature="Suppliers" label="Suppliers" />

      <Card className="glass border-border shadow-soft">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" /> Suppliers / ผู้ขาย
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                ร้านประจำ · สตูดิโอ · พาร์ทเนอร์ — เก็บคอนแทกต์, เรตราคา, ลิงก์
                และแชร์เป็นนามบัตรได้
              </p>
            </div>
            <Button
              onClick={() => setCreating(true)}
              className="gap-1.5 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-soft"
            >
              <Plus className="h-4 w-4" /> เพิ่ม Supplier
            </Button>
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อ / ผู้ติดต่อ / แท็ก"
                className="pl-9 h-9"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <Chip active={filterCat === "all"} onClick={() => setFilterCat("all")}>
                ทั้งหมด
              </Chip>
              {SUPPLIER_CATEGORIES.map((c) => {
                const Icon = c.icon;
                return (
                  <Chip
                    key={c.key}
                    active={filterCat === c.label}
                    onClick={() => setFilterCat(c.label)}
                  >
                    <Icon className="h-3 w-3 mr-1 inline-block" />
                    {c.label}
                  </Chip>
                );
              })}
            </div>
          </div>

          {isLoading && <p className="text-xs text-muted-foreground">กำลังโหลด…</p>}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 rounded-xl border border-dashed border-border/60">
              <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground mb-3">
                {suppliers.length === 0
                  ? "ยังไม่มี Supplier — เริ่มเพิ่มผู้ขายรายแรก"
                  : "ไม่พบรายการที่ค้นหา"}
              </p>
              {suppliers.length === 0 && (
                <Button onClick={() => setCreating(true)} variant="outline" size="sm">
                  <Plus className="h-3.5 w-3.5" /> เพิ่ม Supplier
                </Button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((s) => {
              const sFiles = files.filter((f) => f.supplierId === s.id);
              const sLinks = links.filter((l) => l.supplierId === s.id);
              return (
                <SupplierCard
                  key={s.id}
                  s={s}
                  files={sFiles}
                  links={sLinks}
                  onEdit={() => setEditing(s)}
                  onDelete={() => setConfirmDel(s)}
                  onShare={() => setSharing(s)}
                  onPreview={() => setPreviewing(s)}
                  onOpenFile={async (path) => window.open(await getSignedUrl(path), "_blank")}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      <SupplierFormDialog
        open={creating || !!editing}
        supplier={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={async (data, staged) => {
          if (editing) {
            await update(editing.id, data);
            toast.success("บันทึกการแก้ไขแล้ว");
          } else {
            const created = await create(data);
            for (const l of staged.links) {
              try {
                await addLink(created.id, l.label, l.url);
              } catch {
                /* ignore */
              }
            }
            for (const f of staged.files) {
              try {
                await uploadFile(created.id, f);
              } catch {
                /* ignore */
              }
            }
            toast.success("เพิ่ม Supplier แล้ว");
          }
          setCreating(false);
          setEditing(null);
        }}
        files={editing ? files.filter((f) => f.supplierId === editing.id) : []}
        linksList={editing ? links.filter((l) => l.supplierId === editing.id) : []}
        onUpload={async (file) => {
          if (editing) {
            await uploadFile(editing.id, file);
          }
        }}
        onDeleteFile={async (f) => {
          await deleteFile(f as never);
        }}
        onAddLink={async (label, url) => {
          if (editing) {
            await addLink(editing.id, label, url);
          }
        }}
        onRemoveLink={async (id) => {
          await removeLink(id);
        }}
        getSignedUrl={getSignedUrl}
      />

      <SupplierShareDialog
        open={!!sharing}
        supplier={sharing}
        onClose={() => setSharing(null)}
        onEnable={enableShare}
        onDisable={disableShare}
        onUpdate={update}
      />

      <SupplierPreviewDialog
        open={!!previewing}
        supplier={previewing}
        onClose={() => setPreviewing(null)}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบ Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDel?.name}" จะถูกลบถาวรพร้อมไฟล์และลิงก์ทั้งหมด
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (confirmDel) {
                  await remove(confirmDel.id);
                  toast.success("ลบแล้ว");
                  setConfirmDel(null);
                }
              }}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs rounded-full px-3 py-1 border transition-all ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function SupplierCard({
  s,
  files,
  links,
  onEdit,
  onDelete,
  onShare,
  onPreview,
  onOpenFile,
}: {
  s: Supplier;
  files: { id: string; fileName: string; storagePath: string; mimeType?: string }[];
  links: { id: string; label: string; url: string }[];
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onPreview: () => void;
  onOpenFile: (path: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3.5 hover:shadow-elevated hover:-translate-y-0.5 transition-all flex flex-col gap-2.5 overflow-hidden">
      {s.coverImageUrl && (
        <div className="-mx-3.5 -mt-3.5 mb-1 aspect-[16/7] bg-muted overflow-hidden">
          <img
            src={s.coverImageUrl}
            alt={s.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {(s.type ?? "individual") === "company" ? (
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <p className="text-sm font-semibold truncate">{s.name}</p>
            {s.rating > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-600">
                <Star className="h-3 w-3 fill-amber-500 stroke-amber-500" />
                {s.rating}
              </span>
            )}
            {s.isShared && (
              <span className="inline-flex items-center gap-0.5 text-[10px] rounded-full bg-primary-soft text-primary px-1.5 py-0.5">
                <Share2 className="h-2.5 w-2.5" />
                Public
              </span>
            )}
          </div>
          {s.category &&
            (() => {
              const CIcon = categoryIcon(s.category);
              return (
                <Badge variant="outline" className="text-[10px] mt-1 gap-1">
                  <CIcon className="h-3 w-3" /> {s.category}
                </Badge>
              );
            })()}
        </div>
        <div className="flex gap-0.5 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onPreview}
            title="พรีวิว"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onShare} title="แชร์">
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit} title="แก้ไข">
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive"
            onClick={onDelete}
            title="ลบ"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {s.type === "company" && s.contactName && (
        <p className="text-xs text-muted-foreground">
          ติดต่อ: {s.contactName}
          {s.contactPosition ? ` · ${s.contactPosition}` : ""}
        </p>
      )}
      {s.type !== "company" && s.contactName && (
        <p className="text-xs text-muted-foreground">ผู้ติดต่อ: {s.contactName}</p>
      )}

      <div className="text-[11px] text-muted-foreground space-y-0.5">
        {s.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3" />
            {s.phone}
          </div>
        )}
        {s.email && (
          <div className="flex items-center gap-1.5 truncate">
            <Mail className="h-3 w-3 shrink-0" />
            {s.email}
          </div>
        )}
        {s.website && safeHref(s.website) && (
          <div className="flex items-center gap-1.5 truncate">
            <Globe className="h-3 w-3 shrink-0" />
            <a
              href={safeHref(s.website)!}
              target="_blank"
              rel="noopener"
              className="truncate hover:text-primary"
            >
              {s.website.replace(/^https?:\/\//, "")}
            </a>
          </div>
        )}
        {s.mapUrl && safeHref(s.mapUrl) && (
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <a
              href={safeHref(s.mapUrl)!}
              target="_blank"
              rel="noopener"
              className="truncate hover:text-primary"
            >
              เปิด Google Maps
            </a>
          </div>
        )}
      </div>

      {s.rateNote && (
        <div className="rounded-md bg-muted/40 px-2 py-1 text-[11px]">
          <span className="text-muted-foreground">เรต: </span>
          {s.rateNote}
        </div>
      )}

      {s.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {s.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] rounded-full bg-primary-soft text-primary px-2 py-0.5"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {(files.length > 0 || links.length > 0) && (
        <div className="border-t border-border/40 pt-2 space-y-1">
          {links.map((l) => {
            const safe = safeHref(l.url);
            if (!safe) return null;
            return (
              <a
                key={l.id}
                href={safe}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1.5 text-[11px] text-primary hover:underline truncate"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {l.label || l.url}
              </a>
            );
          })}
          {files.map((f) => (
            <button
              key={f.id}
              onClick={() => onOpenFile(f.storagePath)}
              className="flex items-center gap-1.5 text-[11px] text-foreground hover:text-primary truncate w-full text-left"
            >
              <FileText className="h-3 w-3 shrink-0" />
              {f.fileName}
            </button>
          ))}
        </div>
      )}

      {s.notes && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 border-t border-border/40 pt-2">
          {s.notes}
        </p>
      )}
    </div>
  );
}
