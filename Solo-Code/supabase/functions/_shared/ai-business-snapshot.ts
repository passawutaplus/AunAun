import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const BUSINESS_SYSTEM_PROMPT = `คุณคือที่ปรึกษาธุรกิจสำหรับฟรีแลนซ์ไทย ตอบจากข้อมูลจริงที่ให้มาเท่านั้น
- ใช้ภาษาไทย กระชับ เป็นมิตร เหมาะกับแชท LINE
- ถ้าข้อมูลไม่พอ บอกตรงๆ ว่าขาดอะไร
- อ้างอิงชื่อลูกค้าและตัวเลขจากข้อมูล ห้ามมั่ว`;

const BUSINESS_KEYWORD_RE = /ลูกค้า|รายได้|ทวง|ค้างชำระ|ใบแจ้งหนี้|ใบเสนอราคา|ยอดขาย|debt|invoice/i;

export function isBusinessQuestion(message: string): boolean {
  return BUSINESS_KEYWORD_RE.test(message);
}

export async function buildBusinessSnapshot(admin: SupabaseClient, userId: string) {
  const [clientsRes, quotationsRes, incomesRes] = await Promise.all([
    admin.from("saved_clients").select("id,name,payment_terms,created_at").eq("user_id", userId),
    admin
      .from("quotations")
      .select("number,project_name,client_name,status,due_date,paid_partial")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(80),
    admin
      .from("finance_incomes")
      .select("id,net,gross,source,source_quotation_id,receive_date,category")
      .eq("user_id", userId)
      .order("receive_date", { ascending: false })
      .limit(120),
  ]);

  const clients = clientsRes.data ?? [];
  const quotations = quotationsRes.data ?? [];
  const incomes = incomesRes.data ?? [];

  const revenueByClient = new Map<string, number>();
  for (const inc of incomes) {
    const net = Number(inc.net ?? inc.gross ?? 0);
    const q = quotations.find((qt) => qt.number && inc.source_quotation_id === qt.number);
    const name = q?.client_name ?? inc.source ?? "ไม่ระบุ";
    revenueByClient.set(name, (revenueByClient.get(name) ?? 0) + net);
  }

  const topClients = [...revenueByClient.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total_revenue]) => ({ name, total_revenue }));

  const today = new Date().toISOString().slice(0, 10);
  const overdueQuotations = quotations
    .filter((q) => q.due_date && q.due_date < today && q.status !== "paid")
    .slice(0, 8)
    .map((q) => ({
      number: q.number,
      client_name: q.client_name,
      due_date: q.due_date,
      status: q.status,
      paid_partial: Number(q.paid_partial ?? 0),
    }));

  const pendingByDue = quotations
    .filter((q) => q.status !== "paid" && q.status !== "cancelled")
    .sort((a, b) => String(a.due_date ?? "").localeCompare(String(b.due_date ?? "")))
    .slice(0, 8)
    .map((q) => ({
      number: q.number,
      client_name: q.client_name,
      status: q.status,
      due_date: q.due_date,
      project_name: q.project_name,
    }));

  return {
    generated_at: new Date().toISOString(),
    client_count: clients.length,
    top_clients_by_revenue: topClients,
    overdue_invoices: overdueQuotations,
    upcoming_by_due_date: pendingByDue,
    recent_income_count: incomes.length,
  };
}
