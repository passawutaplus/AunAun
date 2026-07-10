import { UserPlus, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmptyState from "@/components/ui/EmptyState";
import { InlineLoader } from "@/components/ui/BanterLoader";
import FollowUserRow from "@/components/follow/FollowUserRow";
import { useFollowersList, useFollowingList } from "@/hooks/useFollowLists";

type Props = {
  userId: string;
  defaultTab?: "followers" | "following";
};

const FollowConnectionsPanel = ({ userId, defaultTab = "followers" }: Props) => {
  const { data: followers = [], isLoading: loadingFollowers } = useFollowersList(userId);
  const { data: following = [], isLoading: loadingFollowing } = useFollowingList(userId);

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-secondary rounded-full p-1 h-11 border border-border">
        <TabsTrigger value="followers" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 text-sm">
          <UserPlus className="w-4 h-4" />
          ผู้ติดตาม
          {followers.length > 0 && (
            <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{followers.length}</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="following" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 text-sm">
          <Users className="w-4 h-4" />
          กำลังติดตาม
          {following.length > 0 && (
            <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{following.length}</span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="followers" className="mt-4 space-y-2">
        {loadingFollowers ? (
          <InlineLoader />
        ) : followers.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="ยังไม่มีผู้ติดตาม"
            description="เมื่อมีคนติดตามคุณ รายชื่อจะปรากฏที่นี่"
          />
        ) : (
          followers.map((u) => <FollowUserRow key={u.userId} user={u} showFollowBack />)
        )}
      </TabsContent>

      <TabsContent value="following" className="mt-4 space-y-2">
        {loadingFollowing ? (
          <InlineLoader />
        ) : following.length === 0 ? (
          <EmptyState
            icon={Users}
            title="ยังไม่ได้ติดตามใคร"
            description="ติดตามดีไซเนอร์เพื่อดูผลงานและอัปเดตของพวกเขา"
          />
        ) : (
          following.map((u) => <FollowUserRow key={u.userId} user={u} showFollowBack />)
        )}
      </TabsContent>
    </Tabs>
  );
};

export default FollowConnectionsPanel;
