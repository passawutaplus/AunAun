import { useNavigate } from "react-router-dom";
import { ImagePlus, MessageCircle } from "lucide-react";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { COMMUNITY_NEW_PATH } from "@/data/createActions";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { cn } from "@/lib/utils";

type CreateActionId = "portfolio" | "community";

const CREATE_OPTIONS: {
  id: CreateActionId;
  label: string;
  to: string;
  icon: typeof ImagePlus;
}[] = [
  { id: "portfolio", label: "ลงผลงาน", to: "/portfolio/new", icon: ImagePlus },
  { id: "community", label: "โพสชุมชน", to: COMMUNITY_NEW_PATH, icon: MessageCircle },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type PickerBodyProps = {
  onPick: (id: CreateActionId) => void;
};

const CreatePickerBody = ({ onPick }: PickerBodyProps) => (
  <div className="space-y-8 px-1 pb-2">
    <div>
      <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase thai-body">
        เลือกประเภทโพสต์
      </p>
      <div className="mt-2 h-1 w-10 rounded-full bg-primary" />
    </div>

    <div className="flex justify-center gap-4 sm:gap-5">
      {CREATE_OPTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onPick(id)}
          className={cn(
            "group flex flex-col items-center justify-center gap-3 rounded-3xl border transition-all",
            "w-[7.5rem] h-[7.5rem] sm:w-[8.5rem] sm:h-[8.5rem]",
            "border-border/60 bg-card text-foreground",
            "hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/30",
            "active:scale-[0.98]",
          )}
        >
          <Icon
            className="h-8 w-8 sm:h-9 sm:w-9 text-primary transition-colors group-hover:text-primary-foreground"
            strokeWidth={1.75}
          />
          <span className="text-sm font-semibold thai-display">{label}</span>
        </button>
      ))}
    </div>
  </div>
);

const CreateContentDrawer = ({ open, onOpenChange }: Props) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const pick = (id: CreateActionId) => {
    const action = CREATE_OPTIONS.find((o) => o.id === id);
    if (!action) return;
    if (!user) {
      useAuthDialog.getState().openSignup(action.to);
      onOpenChange(false);
      return;
    }
    onOpenChange(false);
    navigate(action.to);
  };

  const body = <CreatePickerBody onPick={pick} />;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="pb-[env(safe-area-inset-bottom)]">
          <div className="px-5 pt-4 pb-8">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md rounded-3xl border-border/60 p-6 sm:p-8"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">เลือกประเภทโพสต์</DialogTitle>
        {body}
      </DialogContent>
    </Dialog>
  );
};

export default CreateContentDrawer;
