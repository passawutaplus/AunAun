import { capLimits } from "@/seeder/caps";
import { monthlyBudgetUsd } from "@/seeder/config";
import { publicMediaUrl, SupabaseSeederRepo, type AdminItem, type AiSpend } from "@/seeder/repo";
import { runNow, setItemVisibility, setKillSwitch, setPaused, updateTarget } from "./actions";

export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  license_not_allowed: "License ไม่อยู่ใน allowlist",
  missing_attribution: "ไม่มีเครดิต / ลิงก์ต้นทาง",
  missing_image: "ไม่มีรูป",
  download_failed: "โหลดรูปไม่ได้",
  duplicate_phash: "รูปซ้ำ (pHash)",
  below_min_resolution: "ความละเอียดต่ำกว่า 1000px",
  moderation_blocked: "ไม่ผ่าน moderation",
  ai_invalid_output: "AI ตอบผิดรูปแบบ",
};

const SOURCE_NAMES: Record<string, string> = {
  met: "The Met",
  aic: "Art Institute of Chicago",
  cma: "Cleveland Museum",
  si: "Smithsonian",
  chndm: "Cooper Hewitt",
  ov: "Openverse",
};

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 3 : 2 })}`;

function SpendPanel({ spend }: { spend: AiSpend | null }) {
  const budget = monthlyBudgetUsd();
  if (!spend) {
    return (
      <section className="panel spend">
        <h2>ค่าใช้จ่าย AI</h2>
        <p className="muted">อ่านข้อมูลค่าใช้จ่ายไม่ได้ในตอนนี้</p>
      </section>
    );
  }
  const month = spend.monthUsd;
  const pct = Math.min(100, Math.round((month / budget) * 100));
  const level = pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok";
  const total = spend.totalUsd + spend.estimatedLegacyUsd;
  return (
    <section className={`panel spend ${level}`}>
      <div className="spend-main">
        <div>
          <span className="muted">ใช้ไปเดือนนี้ (Claude vision)</span>
          <strong className="spend-big">{usd(month)}</strong>
          <span className="muted">
            จากงบ {usd(budget)} · เหลือ {usd(Math.max(0, budget - month))}
          </span>
        </div>
        <div className="spend-side">
          <div>
            <span className="muted">รวมทั้งหมด</span>
            <b>{usd(total)}</b>
          </div>
          <div>
            <span className="muted">เฉลี่ยต่อภาพ</span>
            <b>{usd(spend.avgUsd)}</b>
          </div>
          <div>
            <span className="muted">ภาพที่ตรวจด้วย AI</span>
            <b>{(spend.tracked + spend.untracked).toLocaleString()}</b>
          </div>
        </div>
      </div>
      <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="งบประมาณเดือนนี้">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="muted small">
        {pct >= 100 ? "เกินงบแล้ว — แนะนำกด Pause · " : pct >= 80 ? "ใกล้ถึงงบ · " : ""}
        นับจริง {spend.tracked.toLocaleString()} ภาพ
        {spend.untracked > 0 ? ` + ประเมิน ${spend.untracked.toLocaleString()} ภาพเก่า (≈ ${usd(spend.estimatedLegacyUsd)}) ที่ยังไม่เคยบันทึก token` : ""}
        {" · "}ตั้งงบด้วย <code>SEEDER_BUDGET_USD</code> (ไม่ได้บังคับ แค่แจ้งเตือน)
      </p>
    </section>
  );
}

function ItemCard({ item, action }: { item: AdminItem; action?: "hide" | "restore" }) {
  const note = typeof item.source_meta?.reject_note === "string" ? item.source_meta.reject_note : null;
  return (
    <li className="item">
      {item.image_sm_path ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={publicMediaUrl(item.image_sm_path)} alt={item.title} loading="lazy" />
      ) : (
        <div className="noimg">ไม่มีรูปที่ย่อแล้ว</div>
      )}
      <div className="meta">
        <strong title={item.title}>{item.title}</strong>
        <span className="muted">
          {item.source.toUpperCase()} · {item.category}
          {item.ai_category && item.ai_category !== item.category ? ` (AI: ${item.ai_category})` : ""}
        </span>
        {item.reject_reason && <span className="tag">{REASON_LABELS[item.reject_reason] ?? item.reject_reason}</span>}
        {note && <span className="muted small">{note}</span>}
        <a href={item.source_url} target="_blank" rel="noreferrer">
          ต้นทาง
        </a>
        {action && (
          <form action={setItemVisibility}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="status" value={action === "hide" ? "hidden" : "published"} />
            <button type="submit" className={action === "hide" ? "danger small" : "small"}>
              {action === "hide" ? "ซ่อน (takedown)" : "เผยแพร่อีกครั้ง"}
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

export default async function SeederAdminPage() {
  let data;
  try {
    const repo = new SupabaseSeederRepo();
    data = await Promise.all([
      repo.isPaused(),
      repo.progress(),
      repo.targets(),
      repo.rejectSummary(),
      repo.recentItems("published", 12),
      repo.recentItems("rejected", 12),
      repo.recentItems("hidden", 6),
      repo.aiSpend().catch(() => null),
      repo.stopReason().catch(() => null),
    ]);
  } catch (e) {
    return (
      <>
        <header className="page-head">
          <h1>Discover Seeder</h1>
        </header>
        <p className="notice">
          เชื่อมฐานข้อมูลของ seeder ไม่ได้: {e instanceof Error ? e.message : "unknown"}. ตั้ง <code>SUPABASE_SERVICE_ROLE_KEY</code> ใน <code>seeder/.env.local</code> แล้วรีสตาร์ท dev server
        </p>
      </>
    );
  }
  const [paused, progress, targets, rejects, published, rejected, hidden, spend, gate] = data;
  const limits = capLimits(process.env.SEEDER_BUDGET_USD);
  const killed = gate?.reason === "kill_switch";

  const totalPublished = progress.reduce((s, p) => s + p.published, 0);
  const totalTarget = progress.reduce((s, p) => s + p.target_count, 0);
  const totalRejected = rejects.reduce((s, r) => s + r.total, 0);
  const totalSkipped = targets.reduce((s, t) => s + t.skipped_count, 0);
  const reasonTotals = new Map<string, number>();
  for (const r of rejects) reasonTotals.set(r.reject_reason, (reasonTotals.get(r.reject_reason) ?? 0) + r.total);

  return (
    <>
      <header className="page-head">
        <h1>Discover Seeder</h1>
        <p className="muted">บอทดึงภาพจากแหล่งที่เปิดสิทธิ์ใช้งาน เข้าตรวจ AI แล้วเผยแพร่ใน Discover · ดูสุขภาพแต่ละแหล่งที่ <a href="/admin/sources">บอท &amp; ลิขสิทธิ์</a></p>
      </header>

      <SpendPanel spend={spend} />

      <section className="stats">
        <div className="stat accent">
          <span>เผยแพร่แล้ว</span>
          <strong>
            {totalPublished.toLocaleString()} <small>/ {totalTarget.toLocaleString()}</small>
          </strong>
        </div>
        <div className="stat">
          <span>ถูกปัด</span>
          <strong>{totalRejected.toLocaleString()}</strong>
        </div>
        <div className="stat">
          <span>ข้ามก่อนเข้า pipeline</span>
          <strong>{totalSkipped.toLocaleString()}</strong>
        </div>
        <div className="stat">
          <span>แหล่งที่เปิดอยู่</span>
          <strong>{new Set(targets.filter((t) => t.enabled).map((t) => t.source)).size}</strong>
        </div>
      </section>

      <section className="panel controls">
        <div>
          <span className={paused ? "status paused" : "status running"}>{paused ? "หยุดอยู่" : "ทำงาน"}</span>
          <span className="muted">cron ทุกวัน 03:00 (เวลาไทย)</span>
        </div>
        <form action={setPaused}>
          <input type="hidden" name="paused" value={paused ? "false" : "true"} />
          <button type="submit" className={paused ? "primary" : "danger"}>
            {paused ? "Resume" : "Pause"}
          </button>
        </form>
        <form action={setKillSwitch}>
          <input type="hidden" name="kill" value={killed ? "false" : "true"} />
          <button type="submit" className={killed ? "primary" : "danger"} title="Stops seeding, AI image analysis and email in one go">
            {killed ? "Kill switch: ON (ปิดสวิตช์)" : "Kill switch"}
          </button>
        </form>
        <form action={runNow} className="inline">
          <select name="category" defaultValue="" disabled={paused}>
            <option value="">ทุกหมวดที่ยังไม่ถึงเป้า</option>
            {progress.map((p) => (
              <option key={p.category} value={p.category}>
                {p.category}
              </option>
            ))}
          </select>
          <button type="submit" className="primary" disabled={paused} title={paused ? "Resume ก่อนจึงสั่งรันได้" : undefined}>
            Run now
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>เพดานการทำงาน</h2>
        <p className="muted">
          {gate?.reason ? `หยุดเพราะ: ${gate.reason}` : "ยังทำงานได้"} · วันนี้ {gate?.usage.itemsToday ?? "?"}/{limits.maxItemsPerDay} รายการ ·
          AI {gate?.usage.aiCallsToday ?? "?"}/{limits.maxAiCallsPerDay} ครั้ง · เดือนนี้ ${gate ? gate.usage.monthUsd.toFixed(2) : "?"}/${limits.monthlyAiUsd} · ต่อรอบสูงสุด {limits.maxItemsPerRun} รายการ
        </p>
      </section>

      <section className="panel">
        <h2>แหล่งที่เปิดอยู่</h2>
        <div className="source-cards">
          {[...new Set(targets.map((t) => t.source))].map((src) => {
            const rows = targets.filter((t) => t.source === src);
            const on = rows.filter((t) => t.enabled).length;
            return (
              <div key={src} className={on ? "source-card" : "source-card off"}>
                <strong>{SOURCE_NAMES[src] ?? src}</strong>
                <span className="muted small">
                  {on}/{rows.length} หมวดเปิด · สแกน {rows.reduce((n, t) => n + t.scanned_count, 0).toLocaleString()}
                </span>
                {spend?.bySource[src] != null && <span className="small">AI {usd(spend.bySource[src])}</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>จำนวนต่อหมวด</h2>
        <table>
          <thead>
            <tr>
              <th>หมวด</th>
              <th>ความคืบหน้า</th>
              <th className="num">เผยแพร่</th>
              <th className="num">เป้า</th>
              <th className="num">ค้าง</th>
              <th className="num">ถูกปัด</th>
            </tr>
          </thead>
          <tbody>
            {progress.map((p) => {
              const pct = Math.min(100, Math.round((p.published / Math.max(1, p.target_count)) * 100));
              return (
                <tr key={p.category}>
                  <td>{p.category}</td>
                  <td>
                    <div className="bar" aria-label={`${pct}%`}>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </td>
                  <td className="num">{p.published}</td>
                  <td className="num">{p.target_count}</td>
                  <td className="num">{p.pending}</td>
                  <td className="num">{p.rejected}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>เหตุผลที่ถูกปัด</h2>
        {rejects.length === 0 ? (
          <p className="muted">ยังไม่มีรายการที่ถูกปัด</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>เหตุผล</th>
                <th>แหล่ง</th>
                <th className="num">จำนวน</th>
              </tr>
            </thead>
            <tbody>
              {rejects.map((r) => (
                <tr key={`${r.reject_reason}-${r.source}`}>
                  <td>{REASON_LABELS[r.reject_reason] ?? r.reject_reason}</td>
                  <td><span className="source">{r.source.toUpperCase()}</span></td>
                  <td className="num">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {reasonTotals.size > 0 && (
          <p className="muted small">
            รวม: {[...reasonTotals].map(([k, v]) => `${REASON_LABELS[k] ?? k} ${v}`).join(" · ")}
          </p>
        )}
      </section>

      <section className="panel">
        <h2>เป้าหมายต่อแหล่ง (seed_targets)</h2>
        <table>
          <thead>
            <tr>
              <th>หมวด</th>
              <th>แหล่ง</th>
              <th>คำค้น</th>
              <th className="num">cursor</th>
              <th className="num">สแกน / ข้าม</th>
              <th>สถานะ</th>
              <th>แก้ไข</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => (
              <tr key={`${t.category}-${t.source}`} className={t.enabled ? "" : "disabled"}>
                <td>{t.category}</td>
                <td><span className="source">{t.source.toUpperCase()}</span></td>
                <td>{t.query}</td>
                <td className="num">{t.cursor}</td>
                <td className="num">
                  {t.scanned_count} / {t.skipped_count}
                </td>
                <td>{t.exhausted ? "ดึงครบแล้ว" : t.enabled ? "เปิด" : "ปิด"}</td>
                <td>
                  <form action={updateTarget} className="inline">
                    <input type="hidden" name="category" value={t.category} />
                    <input type="hidden" name="source" value={t.source} />
                    <input name="target_count" type="number" min={1} defaultValue={t.target_count} className="narrow" aria-label="เป้า" />
                    <label className="check">
                      <input type="checkbox" name="enabled" defaultChecked={t.enabled} /> เปิด
                    </label>
                    {t.exhausted && (
                      <label className="check">
                        <input type="checkbox" name="reset_exhausted" /> เริ่มใหม่
                      </label>
                    )}
                    <button type="submit" className="small">
                      บันทึก
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>เผยแพร่ล่าสุด</h2>
        <ul className="grid">
          {published.map((i) => (
            <ItemCard key={i.id} item={i} action="hide" />
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>ถูกปัดล่าสุด</h2>
        <ul className="grid">
          {rejected.map((i) => (
            <ItemCard key={i.id} item={i} />
          ))}
        </ul>
      </section>

      {hidden.length > 0 && (
        <section className="panel">
          <h2>ซ่อนอยู่</h2>
          <ul className="grid">
            {hidden.map((i) => (
              <ItemCard key={i.id} item={i} action="restore" />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
