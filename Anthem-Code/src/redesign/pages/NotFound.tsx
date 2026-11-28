import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useNoIndex } from "../lib/visibility";
import { SC_LINKS } from "../routes";
import "../styles/not-found.css";

/**
 * 404 of the new design (mock: pages/NotFound.dc.html): unknown and cut URLs (step 14), kept off search.
 * Also the body of the frame preview at /sc/shell.
 */
export default function NotFound() {
  // Off search, and the tab says so; both go back when the next page opens (pages here set their own).
  useNoIndex(true);
  useEffect(() => {
    const before = document.title;
    document.title = "Page not found | samecor.";
    return () => {
      document.title = before;
    };
  }, []);
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
