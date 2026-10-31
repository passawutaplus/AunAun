import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { SettingsCard, SettingsSwitch, useSaveStatus } from "@/components/settings/SettingsCard";
import {
  DEFAULT_PROFILE_VISIBILITY,
  PROFILE_PUBLIC_FIELDS,
  loadProfileVisibility,
  parseProfileVisibility,
  saveProfileVisibility,
  type ProfilePublicField,
  type ProfileVisibility,
} from "@/lib/profileVisibility";
import { supabase } from "@/integrations/supabase/client";

export function ProfileVisibilitySection() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { status, track } = useSaveStatus();
  const [value, setValue] = useState<ProfileVisibility>(DEFAULT_PROFILE_VISIBILITY);
  const username = (profile as { username?: string | null } | undefined)?.username;
  const publicHref = username ? `/@${username}` : user?.id ? `/u/${user.id}` : "/";

  const serverVisibility = (profile as { public_visibility?: unknown } | undefined)?.public_visibility;

  useEffect(() => {
    // Account copy wins (other devices); this browser's copy is the fallback
    setValue(serverVisibility ? parseProfileVisibility(serverVisibility) : loadProfileVisibility(user?.id));
  }, [user?.id, serverVisibility]);

  const setKey = (key: ProfilePublicField, on: boolean) => {
    if (!user?.id) return;
    const next = { ...value, [key]: on };
    setValue(next);
    saveProfileVisibility(user.id, next);
    void track(
      Promise.resolve(
        supabase
          .from("profiles")
          .update({ public_visibility: next } as never)
          .eq("user_id", user.id),
      ).then(({ error }) => {
        if (error) throw error;
      }),
    );
  };

  return (
    <SettingsCard
      icon={Eye}
      title="ใครเห็นอะไรบนโปรไฟล์"
      description="ปิดสิ่งที่ไม่อยากให้คนอื่นเห็น"
      status={status}
      action={
        <Link
          to={publicHref}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          ดูแบบคนอื่นเห็น
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <div className="divide-y divide-border/50">
        {PROFILE_PUBLIC_FIELDS.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-4 py-2.5">
            <p className="text-sm">{f.label}</p>
            <SettingsSwitch checked={value[f.key]} label={f.label} onChange={(on) => setKey(f.key, on)} />
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}
