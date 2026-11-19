/** วันที่แบบไทย เช่น 19 พ.ย. 2569 */
export function formatJournalDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}
