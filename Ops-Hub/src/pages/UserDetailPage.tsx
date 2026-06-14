import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { User360Panel } from "@/components/User360Panel";
import { useUser360 } from "@/hooks/useUser360";

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { data, isLoading, error } = useUser360(userId);

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="User 360"
        subtitle={userId ?? ""}
        actions={
          <Link
            to="/users"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> กลับ
          </Link>
        }
      />

      <main className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">โหลดไม่สำเร็จ</p>
        ) : !data ? (
          <p className="text-sm text-muted">ไม่พบผู้ใช้</p>
        ) : (
          <User360Panel data={data} />
        )}
      </main>
    </div>
  );
}
