import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import SeoHead from "@/components/SeoHead";
import { BRAND_NAME } from "@/lib/brandConfig";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";

/** Reserved path for creator “looking for work” posts (Fastwork-style). */
const JobsSeekingPage = () => (
  <main id="main-content" className={cn("min-h-screen bg-app-ambient lg:pb-12", MOBILE_PAGE_BOTTOM_CLASS)}>
    <SeoHead
      title="โพสต์หางาน"
      description={`ครีเอเตอร์เปิดรับงานบน ${BRAND_NAME} — กำลังเตรียมหน้านี้`}
      path="/jobs"
      noindex
    />
    <div className="max-w-2xl mx-auto px-4 py-10">
      <EmptyState
        icon={Briefcase}
        title="โพสต์หางาน"
        description="หน้านี้สำหรับครีเอเตอร์ที่อยากเปิดรับงาน กำลังจัดให้อยู่ — ถ้ามาหางานจากบริษัท ดูประกาศจ้างได้ที่บอร์ด Hiring"
        action={
          <Button asChild className="rounded-xl">
            <Link to="/hiring">ดูประกาศจ้างบริษัท</Link>
          </Button>
        }
      />
    </div>
  </main>
);

export default JobsSeekingPage;
