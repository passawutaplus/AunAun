import { Bookmark } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import { InlineLoader } from "@/components/ui/BanterLoader";
import PackageCard from "@/components/feed/PackageCard";
import { FeedProjectGrid } from "@/components/feed/FeedProjectGrid";
import { PACKAGE_BOOKING_GRID } from "@/lib/feedMasonry";
import { useBookmarkedPackages } from "@/hooks/useCreatorServiceBookmarks";

type Props = {
  userId: string;
};

export default function PortfolioBookingPanel({ userId }: Props) {
  const { data = [], isLoading, isError, refetch } = useBookmarkedPackages(userId);

  if (isLoading) return <InlineLoader />;

  if (isError) {
    return (
      <div className="text-center py-16 glass-panel rounded-2xl space-y-3">
        <p className="text-foreground font-medium">โหลดแพ็กเกจที่บันทึกไม่สำเร็จ</p>
        <p className="text-sm text-muted-foreground">ลองใหม่อีกครั้ง หรือตรวจการเชื่อมต่อ</p>
        <Button variant="outline" className="rounded-full" onClick={() => void refetch()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-primary shrink-0" />
            <h2 className="text-lg font-semibold text-foreground">Booking</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            แพ็กเกจที่คุณกดบุ๊กมาร์กไว้ — กลับมาดูหรือคุยต่อเมื่อพร้อม
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-full shrink-0">
          <Link to="/?mode=packages">ดูแพ็กเกจทั้งหมด</Link>
        </Button>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="ยังไม่มีแพ็กเกจที่บันทึก"
          description="กดไอคอนบุ๊กมาร์กบนการ์ดแพ็กเกจในหน้ารวม เพื่อเก็บไว้เปิดดูทีหลังที่นี่"
          action={
            <Button asChild className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/?mode=packages">ไปดูแพ็กเกจ</Link>
            </Button>
          }
        />
      ) : (
        <FeedProjectGrid itemClassName="h-full" columnsClass={PACKAGE_BOOKING_GRID}>
          {data.map((d) => (
            <PackageCard key={d.service.id} data={d} />
          ))}
        </FeedProjectGrid>
      )}
    </div>
  );
}
