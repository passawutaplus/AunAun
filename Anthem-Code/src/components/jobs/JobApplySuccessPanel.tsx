import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  body: string;
  onClose: () => void;
  onOpenChat?: () => void;
};

export default function JobApplySuccessPanel({ title, body, onClose, onOpenChat }: Props) {
  return (
    <div className="flex flex-col items-center text-center py-2 space-y-4">
      <div className="relative grid h-20 w-20 place-items-center" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-primary/15 animate-apply-check-ring" />
        <span className="relative grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground animate-apply-check-pop">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path className="animate-apply-check-draw" d="M6 12.5 10 16.5 18 8" />
          </svg>
        </span>
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold thai-display">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
      <div className="flex w-full gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
          ปิด
        </Button>
        {onOpenChat ? (
          <Button type="button" className="flex-1 rounded-xl" onClick={onOpenChat}>
            เปิดแชท
          </Button>
        ) : null}
      </div>
    </div>
  );
}
