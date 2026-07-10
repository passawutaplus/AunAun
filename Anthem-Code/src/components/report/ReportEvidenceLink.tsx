import { useEffect, useState } from "react";
import { resolveReportEvidenceUrl } from "@/lib/reportEvidenceStorage";

type Props = {
  storedUrl: string;
  name: string;
  className?: string;
};

/** Resolves private report-evidence refs to short-lived signed URLs. */
export function ReportEvidenceLink({ storedUrl, name, className }: Props) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolveReportEvidenceUrl(storedUrl).then((url) => {
      if (!cancelled) setHref(url);
    });
    return () => {
      cancelled = true;
    };
  }, [storedUrl]);

  if (!href) {
    return <span className={className}>{name}</span>;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {name}
    </a>
  );
}
