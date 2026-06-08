import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/db";
import {
  columnToRawStatus,
  type BoardColumn,
  type WorkItem,
  type WorkItemPriority,
  type WorkItemSource,
} from "@/lib/work-items";

function tableForSource(source: WorkItemSource): string {
  switch (source) {
    case "support_ticket":
      return "support_tickets";
    case "feature_suggestion":
      return "feature_suggestions";
    case "app_feedback":
      return "app_feedback";
    case "user_report":
      return "user_reports";
    case "ops_issue":
      return "issues";
  }
}

function priorityToRaw(source: WorkItemSource, priority: WorkItemPriority): string {
  if (source === "ops_issue" || source === "support_ticket") {
    if (priority === "urgent") return "critical";
    return priority;
  }
  return priority;
}

export function useWorkItemMutations() {
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["work-items"] });
    void qc.invalidateQueries({ queryKey: ["ops-issues"] });
    void qc.invalidateQueries({ queryKey: ["hub-metrics"] });
  };

  const updateStatus = useMutation({
    mutationFn: async ({
      item,
      column,
    }: {
      item: WorkItem;
      column: BoardColumn;
    }) => {
      const status = columnToRawStatus(item.source, column);
      if (!status) throw new Error("ไม่รองรับการย้ายคอลัมน์นี้");
      const table = tableForSource(item.source);
      const { error } = await supabase
        .from(table)
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", item.sourceId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updatePriority = useMutation({
    mutationFn: async ({
      item,
      priority,
    }: {
      item: WorkItem;
      priority: WorkItemPriority;
    }) => {
      if (item.source !== "support_ticket" && item.source !== "ops_issue") {
        throw new Error("แก้ priority ได้เฉพาะ ticket และ Hub issue");
      }
      const table = tableForSource(item.source);
      const { error } = await supabase
        .from(table)
        .update({
          priority: priorityToRaw(item.source, priority),
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.sourceId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateAdminNote = useMutation({
    mutationFn: async ({
      item,
      adminNote,
    }: {
      item: WorkItem;
      adminNote: string;
    }) => {
      if (item.source === "ops_issue") throw new Error("ใช้ comments สำหรับ Hub issue");
      const table = tableForSource(item.source);
      const { error } = await supabase
        .from(table)
        .update({ admin_note: adminNote, updated_at: new Date().toISOString() })
        .eq("id", item.sourceId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { updateStatus, updatePriority, updateAdminNote };
}
