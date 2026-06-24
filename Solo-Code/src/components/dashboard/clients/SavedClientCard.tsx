import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  MessageCircle,
  Hash,
  Edit3,
  Trash2,
  Building2,
  User as UserIcon,
  Wallet,
  FileText,
} from "lucide-react";
import { formatTHB } from "@/data/mockData";
import type { SavedClient } from "@/store/clients";

export function SavedClientCard({
  client,
  fileCount = 0,
  onEdit,
  onDelete,
}: {
  client: SavedClient;
  fileCount?: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const TypeIcon = client.type === "company" ? Building2 : UserIcon;
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 hover:border-primary/40 hover:shadow-card transition-all space-y-2">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold shrink-0">
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <TypeIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            <p className="text-sm font-semibold truncate">{client.name}</p>
          </div>
          {client.industry && (
            <p className="text-[11px] text-muted-foreground truncate">{client.industry}</p>
          )}
          {client.type === "company" && client.contactName && (
            <p className="text-[11px] text-muted-foreground truncate">
              ติดต่อ: {client.contactName}
              {client.contactPosition ? ` · ${client.contactPosition}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="แก้ไข"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground"
            aria-label="ลบ"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
        {client.phone && (
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {client.phone}
          </span>
        )}
        {client.lineId && (
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            LINE: {client.lineId}
          </span>
        )}
        {client.email && (
          <span className="inline-flex items-center gap-1 truncate">
            <Mail className="h-3 w-3" />
            {client.email}
          </span>
        )}
      </div>

      {(client.paymentTerms || client.rate || fileCount > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
          {client.paymentTerms && (
            <Badge variant="secondary" className="text-[10px] rounded-full">
              <Wallet className="h-2.5 w-2.5 mr-1" />
              {client.paymentTerms}
            </Badge>
          )}
          {client.rate && (
            <Badge variant="outline" className="text-[10px] rounded-full">
              ~฿{formatTHB(client.rate)}
            </Badge>
          )}
          {fileCount > 0 && (
            <Badge variant="outline" className="text-[10px] rounded-full">
              <FileText className="h-2.5 w-2.5 mr-1" />
              {fileCount} เอกสาร
            </Badge>
          )}
        </div>
      )}

      {client.tags && client.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {client.tags.map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
