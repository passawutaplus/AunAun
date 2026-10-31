import { useRef, useState } from "react";
import { toast } from "sonner";
import type { LandingText } from "./useLandingCopy";

const COLUMNS = ["todo", "doing", "done"] as const;
type Column = (typeof COLUMNS)[number];
const TEAM = 3;

/** Try-it demo of the collab plan: every member agrees a stage before the next one opens. */
export function CollabBoard({ t, stages, tasks }: { t: LandingText; stages: string[]; tasks: string[] }) {
  const [stage, setStage] = useState(1);
  const [agreed, setAgreed] = useState(1);
  const [placed, setPlaced] = useState<{ col: Column; tone: string }[]>([
    { col: "todo", tone: "" },
    { col: "doing", tone: "b" },
    { col: "done", tone: "c" },
  ]);
  const [over, setOver] = useState<Column | null>(null);
  const dragging = useRef<number | null>(null);
  const finished = stage >= stages.length;

  const agree = () => {
    setAgreed(TEAM);
    toast(t("bd.all"));
    window.setTimeout(() => {
      setStage((s) => s + 1);
      setAgreed(1);
    }, 700);
  };
  const moveTo = (i: number, col: Column) => setPlaced((list) => list.map((x, n) => (n === i ? { ...x, col } : x)));
  const advance = (i: number) => moveTo(i, COLUMNS[(COLUMNS.indexOf(placed[i].col) + 1) % COLUMNS.length]);

  return (
    <div className="card reveal">
      <div className="bd-head">
        <h3 className="en" style={{ fontSize: "clamp(1.5rem,3vw,2.1rem)" }}>
          Plan it as a team.
        </h3>
        <div className="team">
          <span className="av" />
          <span className="av b" />
          <span className="av c" />
          <small>{t("bd.team")}</small>
        </div>
      </div>
      <div className="stages">
        {stages.map((name, i) => (
          <div key={name} className={`stg ${i < stage ? "done" : i === stage ? "cur" : ""}`} style={{ "--w": `${(agreed / TEAM) * 100}%` } as React.CSSProperties}>
            <i />
            <span>{name}</span>
          </div>
        ))}
      </div>
      <div className="stage-act">
        <span>{finished ? t("bd.done") : t("bd.note", { n: stage + 1, s: stages[stage], a: agreed, b: TEAM })}</span>
        <button type="button" className="btn ink sm" disabled={finished} onClick={agree}>
          {finished ? t("bd.fin") : t("bd.ok")}
        </button>
      </div>
      <div className="cols">
        {COLUMNS.map((col) => {
          const here = placed.map((x, i) => ({ ...x, i })).filter((x) => x.col === col);
          return (
            <div
              key={col}
              className={over === col ? "col over" : "col"}
              data-col={col}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging.current !== null) moveTo(dragging.current, col);
                setOver(null);
              }}
            >
              <p>
                <span>{t(`col.${col}`)}</span>
                <span>{here.length}</span>
              </p>
              <div className="drop">
                {here.map((x) => (
                  <div
                    key={x.i}
                    className="task"
                    draggable
                    role="button"
                    tabIndex={0}
                    onDragStart={() => {
                      dragging.current = x.i;
                    }}
                    onDragEnd={() => {
                      dragging.current = null;
                      setOver(null);
                    }}
                    onClick={() => advance(x.i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        advance(x.i);
                      }
                    }}
                  >
                    <span>{tasks[x.i]}</span>
                    <span className={`who ${x.tone}`} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
