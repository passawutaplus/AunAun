import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { InlineLoader } from "@/components/ui/BanterLoader";
import EmptyState from "@/components/ui/EmptyState";
import FollowUserRow from "@/components/follow/FollowUserRow";
import { useFollowNotifications } from "@/hooks/useFollowLists";
import { Button } from "@/components/ui/button";

type Props = {
  onBeforeNavigate?: () => void;
};

const FollowNotificationsList = ({ onBeforeNavigate }: Props) => {
  const navigate = useNavigate();
  const { data: followers = [], isLoading } = useFollowNotifications();

  if (isLoading) {
    return <InlineLoader />;
  }

  if (followers.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="ยังไม่มีคนติดตามใหม่"
        description="เมื่อมีคนติดตามคุณ จะแสดงที่นี่และในกล่องแจ้งเตือน"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs text-muted-foreground">ผู้ติดตามล่าสุด · กดติดตามกลับได้ทันที</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs h-8 rounded-full"
          onClick={() => {
            onBeforeNavigate?.();
            navigate("/portfolio/followers");
          }}
        >
          ดูทั้งหมด
        </Button>
      </div>
      <div className="space-y-2">
        {followers.slice(0, 30).map((u) => (
          <FollowUserRow key={u.userId} user={u} showFollowedAt showFollowBack />
        ))}
      </div>
    </div>
  );
};

export default FollowNotificationsList;
