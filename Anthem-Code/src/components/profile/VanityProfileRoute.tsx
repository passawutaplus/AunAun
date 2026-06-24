import { useParams } from "react-router-dom";
import PublicProfilePage from "@/pages/PublicProfilePage";
import NotFound from "@/pages/NotFound";

/** Gate for `/:vanityHandle` — only paths starting with `@` are public profiles. */
export default function VanityProfileRoute() {
  const { vanityHandle } = useParams();
  if (!vanityHandle?.startsWith("@")) return <NotFound />;
  return <PublicProfilePage />;
}
