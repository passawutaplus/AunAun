export const formatTHB = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);

export const formatCompact = (n: number) => {
  const v = n ?? 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1).replace(/\.0$/, "") + "m";
  if (v >= 1_000) return (v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1).replace(/\.0$/, "") + "k";
  return String(v);
};

export const formatThaiDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
};

export const formatThaiDateTime = (iso: string) => {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
};

export const timeAgoTH = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "เมื่อสักครู่";
  if (min < 60) return `${min} นาทีก่อน`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชั่วโมงก่อน`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} วันก่อน`;
  return formatThaiDate(iso);
};

/** Same 5-minute window as activity heartbeat / admin presence. */
export const DESIGNER_ONLINE_WINDOW_MS = 5 * 60_000;

export type DesignerPresence = {
  live: boolean;
  label: string;
};

/**
 * Designer-card presence. Null when the timestamp is missing.
 * Live = last seen within 5 minutes. Otherwise relative ACTIVE … AGO.
 */
export const formatDesignerPresence = (
  iso: string | null | undefined,
  now = Date.now(),
): DesignerPresence | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const diff = Math.max(0, now - t);
  if (diff < DESIGNER_ONLINE_WINDOW_MS) {
    return { live: true, label: "ACTIVE NOW" };
  }
  const min = Math.floor(diff / 60_000);
  if (min < 60) return { live: false, label: `ACTIVE ${min} MIN AGO` };
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return { live: false, label: `ACTIVE ${hr} ${hr === 1 ? "HOUR" : "HOURS"} AGO` };
  }
  const day = Math.floor(hr / 24);
  return { live: false, label: `ACTIVE ${day} ${day === 1 ? "DAY" : "DAYS"} AGO` };
};

/** 24h clock for chat list, e.g. `14:05น.` */
export const clockTimeTH = (iso: string | null | undefined) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}น.`;
  } catch {
    return "";
  }
};
