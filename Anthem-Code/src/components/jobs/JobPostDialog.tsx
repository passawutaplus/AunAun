import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import OpenForWorkForm from "@/components/jobs/OpenForWorkForm";
import PostOpportunityForm from "@/components/jobs/PostOpportunityForm";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultMode?: "hiring" | "seeking";
}

const JobPostDialog = ({ open, onOpenChange, defaultMode = "hiring" }: Props) => {
  const [mode, setMode] = useState<"hiring" | "seeking">(defaultMode);

  useEffect(() => {
    if (open) setMode(defaultMode);
  }, [open, defaultMode]);

  const handleSuccess = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ลงประกาศ</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground thai-body -mt-1 mb-2">เลือกประเภทประกาศที่ต้องการลง</p>

        <div className="flex gap-2 mb-2">
          <Button
            type="button"
            variant={mode === "hiring" ? "default" : "outline"}
            size="sm"
            className={mode === "hiring" ? "bg-gradient-brand text-white" : ""}
            onClick={() => setMode("hiring")}
          >
            หาคนมาช่วยงาน
          </Button>
          <Button
            type="button"
            variant={mode === "seeking" ? "default" : "outline"}
            size="sm"
            className={mode === "seeking" ? "bg-gradient-brand text-white" : ""}
            onClick={() => setMode("seeking")}
          >
            ประกาศหางาน
          </Button>
        </div>

        {mode === "seeking" ? (
          <OpenForWorkForm onSuccess={handleSuccess} />
        ) : (
          <PostOpportunityForm onSuccess={handleSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JobPostDialog;
