import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { WorkItemRow } from "@/components/WorkItemRow";
import { useWorkItemDrawer } from "@/contexts/WorkItemDrawerContext";
import {
  useCreateOpsIssue,
  useOpsIssues,
  useOpsProjects,
} from "@/hooks/useOpsIssues";
import { mapOpsIssue } from "@/lib/work-items";
import { friendlyError } from "@/lib/friendly-error";

export default function WorkPage() {
  const { data: issues, isLoading, error } = useOpsIssues();
  const { data: projects } = useOpsProjects();
  const createIssue = useCreateOpsIssue();
  const { open } = useWorkItemDrawer();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [showForm, setShowForm] = useState(false);

  const items = (issues ?? []).map((row) =>
    mapOpsIssue({
      ...row,
      project_app_scope: row.projects?.app_scope ?? "ecosystem",
    } as Record<string, unknown>),
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createIssue.mutateAsync({
      title: title.trim(),
      project_id: projectId || undefined,
    });
    setTitle("");
    setShowForm(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="งานภายใน"
        subtitle="งานที่ทีมสร้างเองหรือย้ายมาจากคิวอื่น — ใช้จัดการงานภายในองค์กร"
        actions={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" /> สร้างงานใหม่
          </button>
        }
      />
      <div className="space-y-4 p-6">
        {showForm ? (
          <form onSubmit={submit} className="rounded-xl border border-border bg-white p-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="หัวข้องาน..."
              className="mb-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mb-3 w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="">โปรเจกต์ (ไม่ระบุ)</option>
              {(projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={createIssue.isPending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              สร้าง
            </button>
          </form>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600">
            {friendlyError("โหลดงานภายในไม่สำเร็จ")}
            <span className="mt-1 block text-xs text-muted">
              ฟีเจอร์นี้ต้องตั้งค่าฐานข้อมูลก่อน — ติดต่อทีมเทคนิคเพื่อเปิดใช้งาน
            </span>
          </p>
        ) : isLoading ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่มีงาน — กดสร้างงานใหม่ หรือย้ายมาจากกล่องขาเข้า</p>
        ) : (
          items.map((item) => (
            <WorkItemRow key={item.id} item={item} onClick={() => open(item)} />
          ))
        )}
      </div>
    </div>
  );
}
