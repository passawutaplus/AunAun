import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Music } from "lucide-react";

type Props = {
  imageUrl?: string;
  caption?: string;
  authorName?: string;
};

export function PostPreviewMockup({ imageUrl, caption, authorName = "your_brand" }: Props) {
  const [tab, setTab] = React.useState("ig_feed");

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 h-9 rounded-xl">
          <TabsTrigger value="ig_feed" className="text-xs rounded-lg">
            IG Feed
          </TabsTrigger>
          <TabsTrigger value="ig_story" className="text-xs rounded-lg">
            IG Story
          </TabsTrigger>
          <TabsTrigger value="tiktok" className="text-xs rounded-lg">
            TikTok
          </TabsTrigger>
          <TabsTrigger value="facebook" className="text-xs rounded-lg">
            Facebook
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ig_feed" className="mt-3 flex justify-center">
          <PhoneFrame>
            <IgFeed imageUrl={imageUrl} caption={caption} authorName={authorName} />
          </PhoneFrame>
        </TabsContent>
        <TabsContent value="ig_story" className="mt-3 flex justify-center">
          <PhoneFrame>
            <IgStory imageUrl={imageUrl} authorName={authorName} />
          </PhoneFrame>
        </TabsContent>
        <TabsContent value="tiktok" className="mt-3 flex justify-center">
          <PhoneFrame>
            <TikTokView imageUrl={imageUrl} caption={caption} authorName={authorName} />
          </PhoneFrame>
        </TabsContent>
        <TabsContent value="facebook" className="mt-3 flex justify-center">
          <PhoneFrame>
            <FacebookView imageUrl={imageUrl} caption={caption} authorName={authorName} />
          </PhoneFrame>
        </TabsContent>
      </Tabs>

      <p className="text-[10px] text-muted-foreground text-center">
        เส้นประ = Safe Zone โซนปลอดภัย เลี่ยงวางข้อความสำคัญในโซนที่ปุ่ม native บัง
      </p>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[280px] h-[560px] rounded-[28px] bg-black p-2 shadow-elevated">
      <div className="w-full h-full rounded-[22px] bg-background overflow-hidden relative">
        <StatusBar />
        <div className="absolute inset-x-0 top-[18px] bottom-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="absolute top-0 inset-x-0 h-[18px] z-30 px-3 flex items-center justify-between text-[9px] font-semibold text-foreground/90 bg-background/80 backdrop-blur-sm pointer-events-none">
      <span>9:41</span>
      <div className="absolute left-1/2 -translate-x-1/2 top-0.5 w-12 h-3 bg-black rounded-b-xl" />
      <span className="flex items-center gap-1">
        <span>●●●●</span>
        <span className="inline-block w-4 h-2 border border-foreground/70 rounded-sm relative">
          <span className="absolute inset-0.5 bg-foreground/80 rounded-[1px]" />
        </span>
      </span>
    </div>
  );
}

function PlaceholderImg({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-br from-muted via-muted/60 to-muted-foreground/10 flex items-center justify-center text-xs text-muted-foreground ${className}`}
    >
      ไม่มีรูป
    </div>
  );
}

function SafeZone({
  insets,
}: {
  insets: { top?: number; bottom?: number; right?: number; left?: number };
}) {
  return (
    <div
      className="absolute inset-0 pointer-events-none border-2 border-dashed border-yellow-400/70 rounded-md"
      style={{
        top: insets.top ?? 0,
        bottom: insets.bottom ?? 0,
        left: insets.left ?? 0,
        right: insets.right ?? 0,
      }}
    />
  );
}

function IgFeed({
  imageUrl,
  caption,
  authorName,
}: {
  imageUrl?: string;
  caption?: string;
  authorName: string;
}) {
  return (
    <div className="h-full flex flex-col text-[10px]">
      <div className="flex items-center gap-2 p-2 border-b">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600" />
        <span className="font-semibold flex-1">{authorName}</span>
        <MoreHorizontal className="w-3 h-3" />
      </div>
      <div className="relative aspect-square">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <PlaceholderImg className="w-full h-full" />
        )}
        <SafeZone insets={{ top: 8, bottom: 8, left: 8, right: 8 }} />
      </div>
      <div className="p-2 flex items-center gap-3">
        <Heart className="w-4 h-4" />
        <MessageCircle className="w-4 h-4" />
        <Send className="w-4 h-4" />
        <Bookmark className="w-4 h-4 ml-auto" />
      </div>
      <div className="px-2 pb-2 text-[10px] line-clamp-3 text-foreground/80">
        <span className="font-semibold mr-1">{authorName}</span>
        {caption || "แคปชันของคุณจะปรากฏที่นี่..."}
      </div>
    </div>
  );
}

function IgStory({ imageUrl, authorName }: { imageUrl?: string; authorName: string }) {
  return (
    <div className="relative h-full">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <PlaceholderImg className="w-full h-full" />
      )}
      <div className="absolute top-2 left-2 right-2 flex items-center gap-2 text-white text-[10px] drop-shadow">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 ring-2 ring-white" />
        <span className="font-semibold">{authorName}</span>
      </div>
      {/* Top bar safe zone (story progress + header) ~ 70px, bottom (reply input) ~ 80px */}
      <SafeZone insets={{ top: 70, bottom: 80, left: 12, right: 12 }} />
    </div>
  );
}

function TikTokView({
  imageUrl,
  caption,
  authorName,
}: {
  imageUrl?: string;
  caption?: string;
  authorName: string;
}) {
  return (
    <div className="relative h-full bg-black text-white">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover opacity-90" />
      ) : (
        <PlaceholderImg className="w-full h-full" />
      )}
      <div className="absolute right-2 bottom-20 flex flex-col items-center gap-3 text-white drop-shadow">
        <div className="w-7 h-7 rounded-full bg-white/20" />
        <Heart className="w-5 h-5" />
        <MessageCircle className="w-5 h-5" />
        <Send className="w-5 h-5" />
        <Music className="w-5 h-5" />
      </div>
      <div className="absolute left-2 right-12 bottom-3 text-[10px]">
        <p className="font-semibold">@{authorName}</p>
        <p className="line-clamp-2 mt-1">{caption || "แคปชัน..."}</p>
      </div>
      {/* TikTok right column ~ 50px, bottom ~ 60px */}
      <SafeZone insets={{ top: 8, bottom: 60, left: 8, right: 50 }} />
    </div>
  );
}

function FacebookView({
  imageUrl,
  caption,
  authorName,
}: {
  imageUrl?: string;
  caption?: string;
  authorName: string;
}) {
  return (
    <div className="h-full flex flex-col text-[10px] bg-background">
      <div className="flex items-center gap-2 p-2 border-b">
        <div className="w-7 h-7 rounded-full bg-[#1877F2]" />
        <div className="flex-1">
          <div className="font-semibold">{authorName}</div>
          <div className="text-[8px] text-muted-foreground">2 นาทีที่แล้ว · 🌍</div>
        </div>
        <MoreHorizontal className="w-3 h-3" />
      </div>
      <div className="px-2 py-1.5 line-clamp-3">{caption || "ข้อความโพสต์..."}</div>
      <div className="relative flex-1">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <PlaceholderImg className="w-full h-full" />
        )}
        <SafeZone insets={{ top: 8, bottom: 8, left: 8, right: 8 }} />
      </div>
      <div className="flex items-center justify-around p-1.5 border-t text-muted-foreground">
        <span>👍 ถูกใจ</span>
        <span>💬 แสดงความคิดเห็น</span>
        <span>↪ แชร์</span>
      </div>
    </div>
  );
}
