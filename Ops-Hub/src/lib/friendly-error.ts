/** แปลง error ทางเทคนิคเป็นข้อความที่เข้าใจง่าย */
export function friendlyError(context: string): string {
  return `${context} — ลองกดรีเฟรช หรือติดต่อทีมเทคนิคถ้ายังไม่หาย`;
}
