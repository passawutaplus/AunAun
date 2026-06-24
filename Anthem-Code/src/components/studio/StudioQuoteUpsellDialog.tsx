import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
};

export function StudioQuoteUpsellDialog({ open, onOpenChange, onUpgrade }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 text-primary p-2">
              <Building2 className="h-4 w-4" aria-hidden />
            </div>
            <DialogTitle>ใบเสนอราคารวม Studio ต้องใช้ In-House</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2 space-y-2">
            <p>
              ฟีเจอร์รวมสมาชิก Studio เป็นหนึ่งใบเสนอราคาบน So1o เปิดให้แพ็ก In-House เท่านั้น
            </p>
            <p className="text-muted-foreground text-sm">
              อัปเกรดแล้วเปิด So1o จากปุ่มเดิมได้ทันที — ข้อมูลลูกค้าและ Studio จะถูกส่งต่ออัตโนมัติ
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onUpgrade();
            }}
          >
            ดูแพ็ก In-House
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
