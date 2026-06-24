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
