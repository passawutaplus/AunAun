import SectionHeader from "@/components/admin/SectionHeader";
import AdminSupabaseUsagePanel from "@/components/admin/AdminSupabaseUsagePanel";

export default function AdminSupabaseUsagePage() {
  return (
    <div>
      <SectionHeader eyebrow="supabase" title="Supabase Usage" description="การใช้งาน DB, Storage และ API" />
      <AdminSupabaseUsagePanel />
    </div>
  );
}
