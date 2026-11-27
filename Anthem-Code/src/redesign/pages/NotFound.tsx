import { Link } from "react-router-dom";
import { SC_LINKS } from "../routes";
import "../styles/not-found.css";

/** 404 of the new design (mock: pages/NotFound.dc.html). Also the body of the frame preview at /sc/shell. */
export default function NotFound() {
  return (
    <main className="sc-main nf-main">
      <div className="nf-col">
        {/* empty picture frame = the work that could not be found */}
        <div aria-hidden="true" className="nf-frame">
          <span lang="en">404</span>
        </div>
        <div className="nf-tx">
          <h1 lang="en">Page not found</h1>
          <p>ไม่พบหน้าที่คุณต้องการ</p>
        </div>
        <Link to={SC_LINKS.home} className="nf-home">กลับหน้าแรก</Link>
      </div>
    </main>
  );
}
