import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import PageLoader from "@/components/ui/PageLoader";
import { fromCreatorServices } from "@/lib/creatorServicesDb";
import { fromCreatorObjects } from "@/lib/objects/db";

/**
 * Packages and Objects are hidden during the free launch. Old links (shared, notifications, search)
 * open the creator's profile instead of a dead end.
 */
export default function CommerceLinkRedirect({ kind, id }: { kind: "service" | "object"; id: string }) {
  const [to, setTo] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const table = kind === "service" ? fromCreatorServices() : fromCreatorObjects();
    void table
      .select("owner_id")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }: { data: { owner_id?: string } | null }) => {
        if (alive) setTo(data?.owner_id ? `/u/${data.owner_id}` : "/");
      }, () => alive && setTo("/"));
    return () => {
      alive = false;
    };
  }, [kind, id]);

  return to ? <Navigate to={to} replace /> : <PageLoader />;
}
