import * as React from "react";
import { Loader2, Palette, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { InhouseOrg } from "@/lib/inhouse/types";
import { useUpdateInhouseOrg } from "@/hooks/inhouse/useInhouseOrg";
import { resolveDocumentTheme, type DocumentThemeInput } from "@/lib/documentTheme";
import {
  SOLO_DEFAULT_BRIEF,
  SOLO_DEFAULT_INVOICE,
  SOLO_DEFAULT_PRIMARY,
  SOLO_DEFAULT_RECEIPT,
} from "@/lib/documentTheme/defaults";
import { normalizeHex } from "@/lib/colorUtils";
import { PreviewPanel } from "@/components/dashboard/quotations/PreviewPanel";
import type { Quotation } from "@/store/quotations";
import { buildOrgIssuerSnapshot } from "@/lib/quotationKinds";

const PREVIEW_QUOTATION: Quotation = {
  id: "org-preview",
  number: "QT-ORG-PREVIEW",
  projectName: "โปรเจกต์ทีม",
  clientName: "ลูกค้าองค์กร",
  items: [{ id: "1", name: "บริการออกแบบ", quantity: 1, unitPrice: 50000 }],
  addons: [],
  difficulties: [],
  milestones: [],
  hiddenCost: 0,
  discountValue: 0,
  discountKind: "percent",
  vatEnabled: false,
  vatRate: 7,
  whtEnabled: false,
  whtRate: 3,
  depositPreset: 50,
  paymentTerms: "มัดจำ 50%",
  notes: "",
  status: "draft",
  hourlyDays: 0,
  hourlyHours: 0,
  revisionsCount: 2,
  lateFeePercent: 0,
  paidPartial: 0,
  timelineEnabled: true,
  quotationKind: "inhouse",
  orgSnapshot: { brandName: "ทีมของคุณ" },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

type ThemeForm = {
  primary: string;
  brandName: string;
  brandTagline: string;
  legalName: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
};

interface Props {
  org: InhouseOrg;
  canEdit: boolean;
}

export function InhouseDocumentBrandingSection({ org, canEdit }: Props) {
  const updateOrg = useUpdateInhouseOrg();
  const themeInput = (org.document_theme ?? {}) as DocumentThemeInput;

  const [form, setForm] = React.useState<ThemeForm>(() => ({
    primary: themeInput.primary ?? SOLO_DEFAULT_PRIMARY,
    brandName: org.brand_name ?? org.name,
    brandTagline: org.brand_tagline ?? "",
    legalName: org.legal_name ?? "",
    taxId: org.tax_id ?? "",
    address: org.address ?? "",
    phone: org.phone ?? "",
    email: org.email ?? "",
  }));

  React.useEffect(() => {
    const t = (org.document_theme ?? {}) as DocumentThemeInput;
    setForm({
      primary: t.primary ?? SOLO_DEFAULT_PRIMARY,
      brandName: org.brand_name ?? org.name,
      brandTagline: org.brand_tagline ?? "",
      legalName: org.legal_name ?? "",
      taxId: org.tax_id ?? "",
      address: org.address ?? "",
      phone: org.phone ?? "",
      email: org.email ?? "",
    });
  }, [org]);

  const previewQuote = React.useMemo((): Quotation => {
    const snapshot = buildOrgIssuerSnapshot({
      ...org,
      brand_name: form.brandName,
      brand_tagline: form.brandTagline || null,
      legal_name: form.legalName || null,
      tax_id: form.taxId || null,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      document_theme: { primary: form.primary, unifiedColors: true },
    });
    return { ...PREVIEW_QUOTATION, orgSnapshot: snapshot };
  }, [org, form]);

  const previewTheme = React.useMemo(
    () => resolveDocumentTheme("inhouse", { primary: form.primary, unifiedColors: true }),
    [form.primary],
  );

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    const primary = normalizeHex(form.primary);
    if (!primary) {
      toast.error("สีหลักไม่ถูกต้อง");
      return;
    }
    try {
      await updateOrg.mutateAsync({
        id: org.id,
        brand_name: form.brandName.trim() || org.name,
        brand_tagline: form.brandTagline.trim() || null,
        legal_name: form.legalName.trim() || null,
        tax_id: form.taxId.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        document_theme: {
          primary,
          invoiceColor: SOLO_DEFAULT_INVOICE,
          receiptColor: SOLO_DEFAULT_RECEIPT,
          briefAccent: SOLO_DEFAULT_BRIEF,
          unifiedColors: true,
        },
      });
      toast.success("บันทึกแบรนด์องค์กรแล้ว");
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    }
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            แบรนด์องค์กรบนเอกสาร
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            ใช้กับใบเสนอราคาทีม (In-House) — QT/INV/RC และ portal ลูกค้าในนามองค์กร
          </p>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">ชื่อแบรนด์ / บริษัท</Label>
              <Input
                value={form.brandName}
                onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tagline</Label>
              <Input
                value={form.brandTagline}
                onChange={(e) => setForm((f) => ({ ...f, brandTagline: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Palette className="h-3 w-3" /> สีหลักเอกสาร
              </Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={form.primary}
                  onChange={(e) => setForm((f) => ({ ...f, primary: e.target.value }))}
                  className="h-10 w-14 p-1"
                  disabled={!canEdit}
                />
                <Input
                  value={form.primary}
                  onChange={(e) => setForm((f) => ({ ...f, primary: e.target.value }))}
                  disabled={!canEdit}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">เลขประจำตัวผู้เสียภาษี</Label>
              <Input
                value={form.taxId}
                onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">ที่อยู่</Label>
            <Textarea
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              rows={2}
              disabled={!canEdit}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">โทรศัพท์</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">อีเมล</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
          </div>

          {canEdit && (
            <Button type="submit" size="sm" disabled={updateOrg.isPending}>
              {updateOrg.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              บันทึกแบรนด์องค์กร
            </Button>
          )}
        </form>

        <div className="rounded-xl border overflow-hidden">
          <p className="text-[10px] text-muted-foreground px-3 py-2 border-b bg-muted/30">
            ตัวอย่างใบเสนอราคาทีม
          </p>
          <div className="p-2 scale-[0.85] origin-top">
            <PreviewPanel q={previewQuote} themeOverride={previewTheme} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
