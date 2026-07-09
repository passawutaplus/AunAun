import { FolderKanban } from "lucide-react";

type Props = {
  title: string;
  coverUrl?: string | null;
  label?: string;
};

/** Cover + title chip when hire/collab starts from a specific project. */
const ProjectReferencePreview = ({ title, coverUrl, label = "อ้างอิงผลงาน" }: Props) => {
  if (!title.trim()) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
      {coverUrl?.trim() ? (
        <img
          src={coverUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FolderKanban className="h-6 w-6" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
      </div>
    </div>
  );
};

export default ProjectReferencePreview;
