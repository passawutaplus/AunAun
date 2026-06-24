interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function SectionHeader({ eyebrow, title, description, actions }: Props) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 pb-4 border-b border-admin-border">
      <div>
        {eyebrow && (
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-admin-muted mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-admin-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-admin-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
