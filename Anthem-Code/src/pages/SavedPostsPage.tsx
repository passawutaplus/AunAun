import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSavedCommunityPosts } from "@/hooks/useCommunityPostInteractions";
import CommunityPostGridCard from "@/components/feed/CommunityPostGridCard";
import SeoHead from "@/components/SeoHead";
import { cn } from "@/lib/utils";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";

export default function SavedPostsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: savedPosts = [], isLoading } = useSavedCommunityPosts(user?.id);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/portfolio/saved");
  }, [authLoading, user, navigate]);

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">กำลังโหลด...</div>;
  }

  return (
    <div className={cn("min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead title="โพสต์ที่บันทึก" description="โพสต์ชุมชนที่คุณบันทึกไว้บน Aplus1" />
      <div className="sticky top-0 z-30 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="rounded-full">
            <Link to="/portfolio">
              <ArrowLeft className="h-4 w-4 mr-1" /> โปรไฟล์
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" aria-hidden />
            <h1 className="text-sm font-bold">โพสต์ที่บันทึก ({savedPosts.length})</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {savedPosts.length ? (
          <div className="columns-2 md:columns-3 gap-2 sm:gap-3">
            {savedPosts.map((post) => (
              <div key={post.id} className="break-inside-avoid mb-2 sm:mb-3">
                <CommunityPostGridCard post={post} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground mb-4">
              ยังไม่มีโพสต์ที่บันทึก — กดไอคอนบุ๊กมาร์กข้างปุ่มแชร์ในโพสต์เพื่อเก็บไว้อ่านทีหลัง
            </p>
            <Button variant="outline" onClick={() => navigate("/?mode=community")} className="rounded-full">
              ไปดูฟีดชุมชน
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
