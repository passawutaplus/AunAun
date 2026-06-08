import { Loader2 } from "lucide-react";

export function AuthLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-muted">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">กำลังโหลด...</p>
    </div>
  );
}
