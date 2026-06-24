import * as React from "react";
import { Globe } from "lucide-react";
import { getFaviconUrl } from "@/lib/favicon";

export function TrendSourceFavicon({ url, size = 14 }: { url: string; size?: number }) {
  const favicon = getFaviconUrl(url, 32);
  const [broken, setBroken] = React.useState(false);

  if (!favicon || broken) {
    return (
      <Globe
        className="shrink-0 text-muted-foreground"
        style={{ width: size, height: size }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={favicon}
      alt=""
      className="shrink-0 rounded-sm"
      style={{ width: size, height: size }}
      onError={() => setBroken(true)}
    />
  );
}
