/** Thai month abbreviation → month number (1–12). */
const THAI_MONTH: Record<string, number> = {
  "ม.ค.": 1,
  มกราคม: 1,
  "ก.พ.": 2,
  กุมภาพันธ์: 2,
  "มี.ค.": 3,
  มีนาคม: 3,
  "เม.ย.": 4,
  เมษายน: 4,
  "พ.ค.": 5,
  พฤษภาคม: 5,
  "มิ.ย.": 6,
  มิถุนายน: 6,
  "ก.ค.": 7,
  กรกฎาคม: 7,
  "ส.ค.": 8,
  สิงหาคม: 8,
  "ก.ย.": 9,
  กันยายน: 9,
  "ต.ค.": 10,
  ตุลาคม: 10,
  "พ.ย.": 11,
  พฤศจิกายน: 11,
  "ธ.ค.": 12,
  ธันวาคม: 12,
};

/**
 * Converts Thai date strings to ISO YYYY-MM-DD.
 * Handles "31 / ม.ค. / 2569", "31/01/2569", and "2026-01-31".
 */
export function parseThaiDate(input: string): string {
  const s = (input ?? "").trim();
  if (!s) return "";

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    let y = Number(iso[1]);
    if (y > 2400) y -= 543;
    return `${y}-${iso[2]}-${iso[3]}`;
  }

  let month = 0;
  for (const key of Object.keys(THAI_MONTH)) {
    if (s.includes(key)) {
      month = THAI_MONTH[key];
      break;
    }
  }

  const nums = s.match(/\d+/g);
  if (!nums || nums.length < 2) return "";

  let day = 0;
  let year = 0;
  if (month) {
    day = Number(nums[0]);
    year = Number(nums[nums.length - 1]);
  } else if (nums.length >= 3) {
    day = Number(nums[0]);
    month = Number(nums[1]);
    year = Number(nums[2]);
  } else {
    return "";
  }

  if (!day || !month || !year) return "";
  if (year > 2400) year -= 543;
  if (year < 1900 || year > 2200) return "";
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
