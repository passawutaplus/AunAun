import { MoreHorizontal, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AdminAction = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  href?: string;
};

interface Props {
  actions: AdminAction[];
}

/** Compact row action menu for admin tables */
export default function AdminRowActions({ actions }: Props) {
  if (!actions.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-admin-muted hover:text-admin-fg"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {actions.map((a, i) =>
          a.href ? (
            <DropdownMenuItem key={i} asChild>
              <a href={a.href} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5" /> {a.label}
              </a>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={i}
              className={a.destructive ? "text-destructive focus:text-destructive" : ""}
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
              }}
            >
              {a.destructive && <Trash2 className="w-3.5 h-3.5 mr-2" />}
              {a.label}
            </DropdownMenuItem>
          ),
        )}
        {actions.some((a) => a.destructive) && actions.length > 1 && <DropdownMenuSeparator />}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
