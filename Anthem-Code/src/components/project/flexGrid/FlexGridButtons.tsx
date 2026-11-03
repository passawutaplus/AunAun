import { cn } from "@/lib/utils";

/** Small icon buttons used in the board gutter and the arrange toolbar. */
export function BoardGutterBtn({
  children,
  onClick,
  title,
  disabled,
  danger,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-sm bg-transparent text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30",
        danger && "hover:text-destructive",
        active && "text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function ArrangeBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground",
        danger && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}
