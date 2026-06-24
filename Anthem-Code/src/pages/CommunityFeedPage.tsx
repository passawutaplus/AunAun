import { Navigate } from "react-router-dom";

/** Legacy route — Designer Area lives on home feed (?mode=community). */
const CommunityFeedPage = () => <Navigate to="/?mode=community" replace />;

export default CommunityFeedPage;
