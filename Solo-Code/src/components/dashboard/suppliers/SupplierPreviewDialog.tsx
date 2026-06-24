import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SupplierPaper, type PaperLink } from "./SupplierPaper";
import type { Supplier } from "@/store/suppliers";

interface Props {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  useHiddenFields?: boolean;
}

export function SupplierPreviewDialog({ open, supplier, onClose, useHiddenFields = false }: Props) {
  const [links, setLinks] = React.useState<PaperLink[]>([]);

  React.useEffect(() => {
    if (!open || !supplier) return;
    (async () => {
      const { data } = await supabase
        .from("supplier_links")
        .select("id,label,url")
        .eq("supplier_id", supplier.id);
      setLinks((data ?? []) as PaperLink[]);
    })();
  }, [open, supplier]);

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-gradient-to-br from-muted/20 via-background to-primary-soft/20">
        <DialogHeader className="px-6 pt-5 pb-3 pr-12 sm:pr-14 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Eye className="h-4 w-4 text-primary" />
            พรีวิว — {supplier.name}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 sm:p-6">
          <SupplierPaper
            data={{
              name: supplier.name,
              category: supplier.category,
              contact_name: supplier.contactName,
              contact_position: supplier.contactPosition,
              phone: supplier.phone,
              email: supplier.email,
              line_id: supplier.lineId,
              website: supplier.website,
              address: supplier.address,
              rate_note: supplier.rateNote,
              rating: supplier.rating,
              tags: supplier.tags,
              cover_image_url: supplier.coverImageUrl,
              map_url: supplier.mapUrl,
            }}
            links={links}
            hidden={useHiddenFields ? supplier.shareHiddenFields : []}
            showFooter={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
