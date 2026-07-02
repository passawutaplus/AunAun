import { useEffect, useState } from "react";
import { isAbsoluteMediaUrl, resolveStorageMediaUrl } from "@/lib/storageMediaUrl";

export function useSignedStorageUrl(ref: string | null | undefined): string {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!ref) {
      setUrl("");
      return;
    }
    if (isAbsoluteMediaUrl(ref)) {
      setUrl(ref);
      return;
    }
    let cancelled = false;
    void resolveStorageMediaUrl(ref).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [ref]);

  return url;
}
