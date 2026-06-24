import { Navigate } from "react-router-dom";

/** Legacy route — drill gallery is now a tab in the community feed. */
export default function DrillGalleryPage() {
  return <Navigate to="/?drill=1" replace />;
}
