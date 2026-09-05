import { Link } from "react-router-dom";
import RequireAuth from "@/components/RequireAuth";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { useMyHiringOrgs } from "@/hooks/useHiringOrgs";
import { HIRING_ORG_STATUS_LABEL } from "@/lib/hiringOrg";
import PageLoader from "@/components/ui/PageLoader";

const Inner = () => {
  const { data: orgs, isLoading } = useMyHiringOrgs();
  if (isLoading) return <PageLoader />;
  const org = orgs?.[0];

  return (
    <div className="min-h-screen bg-app-ambient">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        <BackButton to="/hiring" />
        <h1 className="text-2xl font-semibold thai-display">สถานะองค์กร</h1>
        {!org ? (
          <div className="rounded-2xl border border-border/60 p-4 space-y-3">
            <p className="text-sm text-muted-foreground">ยังไม่ได้สมัครองค์กร</p>
            <Button asChild className="rounded-xl"><Link to="/org/register">สมัครองค์กร</Link></Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 p-4 space-y-3">
            <p className="font-medium">{org.display_name}</p>
            <p className="text-sm">สถานะ: {HIRING_ORG_STATUS_LABEL[org.status]}</p>
            {org.status === "pending" ? (
              <p className="text-sm text-muted-foreground">กำลังตรวจองค์กร จะแจ้งผลภายใน 7 วัน ช่วงนี้ยังลงประกาศไม่ได้</p>
            ) : null}
            {org.status === "needs_info" ? (
              <p className="text-sm text-muted-foreground">ขอข้อมูลเพิ่ม: {org.review_note || "—"}</p>
            ) : null}
            {org.status === "approved" ? (
              <Button asChild className="rounded-xl"><Link to="/hiring/new">ลงประกาศ</Link></Button>
            ) : null}
            {org.status === "suspended" ? (
              <p className="text-sm text-muted-foreground">องค์กรถูกระงับ ไม่สามารถลงประกาศได้</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

const HiringOrgStatusPage = () => (
  <RequireAuth>
    <Inner />
  </RequireAuth>
);

export default HiringOrgStatusPage;
