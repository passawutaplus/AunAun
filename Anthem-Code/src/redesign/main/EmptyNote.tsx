import { Link } from "react-router-dom";
import "../styles/empty-note.css";

type Action = { label: string; to: string } | { label: string; onClick: () => void };

/** A list with nothing in it: one short line, and at most one way on ("ลงงาน", "ล้างตัวกรอง"). */
export default function EmptyNote({ text, action }: { text: string; action?: Action | null }) {
  return (
    <div className="sc-empty">
      <p>{text}</p>
      {action ? (
        "to" in action ? (
          <Link to={action.to} className="sc-empty-btn">
            {action.label}
          </Link>
        ) : (
          <button type="button" className="sc-empty-btn" onClick={action.onClick}>
            {action.label}
          </button>
        )
      ) : null}
    </div>
  );
}
