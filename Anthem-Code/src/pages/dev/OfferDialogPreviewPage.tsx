import { useState } from "react";
import SeoHead from "@/components/SeoHead";
import { ChatOfferDialog } from "@/components/chat/ChatOfferDialog";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brandConfig";

/** Temporary UI preview — open the quotation popup without a real chat. */
export default function OfferDialogPreviewPage() {
  const [open, setOpen] = useState(true);

  return (
    <main className="min-h-screen bg-app-ambient px-4 py-12">
      <SeoHead
        path="/dev/offer-dialog"
        title={`พรีวิวใบเสนอราคา · ${BRAND_NAME}`}
        description="ดู popup ทำใบเสนอราคา โดยไม่ต้องมีแชทจริง"
      />
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="thai-display text-2xl font-semibold">
          พรีวิวใบเสนอราคา
        </h1>
        <Button type="button" onClick={() => setOpen(true)}>
          เปิด popup
        </Button>
      </div>
      <ChatOfferDialog
        open={open}
        onOpenChange={setOpen}
        conversationId="dev-preview"
        defaultClientName="คุณมินท์ ตัวอย่าง"
      />
    </main>
  );
}
