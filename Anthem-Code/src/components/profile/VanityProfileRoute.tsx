import { useParams } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";

// Lazy like the other routes: a static import here pulled the whole profile page (CV, QR, cropper)
// into the entry bundle that every first visit downloads.
const PublicProfilePage = lazy(() => import("@/pages/PublicProfilePage"));

/** Gate for `/:vanityHandle` — only paths starting with `@` are public profiles. */
export default function VanityProfileRoute() {
  const { vanityHandle } = useParams();
  if (!vanityHandle?.startsWith("@")) return <NotFound />;
  return <PublicProfilePage />;
}
