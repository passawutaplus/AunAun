import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_PROFILE_VISIBILITY,
  PROFILE_PUBLIC_FIELDS,
  loadProfileVisibility,
  saveProfileVisibility,
  type ProfilePublicField,
  type ProfileVisibility,
} from "@/lib/profileVisibility";
import { supabase } from "@/integrations/supabase/client";

export function ProfileVisibilitySection() {
  const { user } = useAuth();
  const [value, setValue] = useState<ProfileVisibility>(DEFAULT_PROFILE_VISIBILITY);

  useEffect(() => {
    setValue(loadProfileVisibility(user?.id));
  }, [user?.id]);

  const setKey = (key: ProfilePublicField, on: boolean) => {
    if (!user?.id) return;
    const next = { ...value, [key]: on };
    setValue(next);
    saveProfileVisibility(user.id, next);
    void supabase
      .from("profiles")
      .update({ public_visibility: next } as never)
      .eq("user_id", user.id);
    toast.success("บันทึกการมองเห็นแล้ว");
  };

  return (
    <section className="rounded-2xl glass-panel p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Eye className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">ใครเห็นอะไรบนโปรไฟล์</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        ปิดช่องที่ไม่อยากโชว์บนโปรไฟล์สาธารณะ — คนอื่นจะไม่เห็นข้อมูลนั้น
      </p>
      {PROFILE_PUBLIC_FIELDS.map((f) => (
        <div key={f.key} className="flex items-center justify-between gap-4 py-1.5">
          <p className="text-sm">{f.label}</p>
          <button
            type="button"
            aria-pressed={value[f.key]}
            aria-label={f.label}
            onClick={() => setKey(f.key, !value[f.key])}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              value[f.key] ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow-sm ring-1 ring-border/60 transition-transform ${
                value[f.key] ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      ))}
    </section>
  );
}
