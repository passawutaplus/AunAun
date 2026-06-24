import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useConversation, useMessages, useStudioConversation, type ChatKind } from "@/hooks/useChat";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatThreadView from "@/components/chat/ChatThreadView";
import ChatPartnerPanel from "@/components/chat/ChatPartnerPanel";
import { ChatErrorBoundary } from "@/components/chat/ChatErrorBoundary";
import { cn } from "@/lib/utils";

const ChatInboxPage = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const studioChat = useStudioConversation();
  const [tab, setTab] = useState<"all" | ChatKind>("all");
  const [search, setSearch] = useState("");
  const [showPartnerMobile, setShowPartnerMobile] = useState(false);

  const { data: conv, isLoading: convLoading, isError: convError } = useConversation(id);
  const { data: messages = [] } = useMessages(id, { subscribe: true });

  useEffect(() => {
    setShowPartnerMobile(false);
  }, [id]);

  useEffect(() => {
    const studioId = searchParams.get("studio");
    if (!studioId || id) return;
    let cancelled = false;
    void studioChat.mutateAsync(studioId).then((convId) => {
      if (!cancelled) navigate(`/chat/${convId}`, { replace: true });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("studio"), id]);

  const hasThread = !!id;
  const showSidebarMobile = !hasThread;
  const showThreadMobile = hasThread;

  const selectConversation = (conversationId: string) => {
    navigate(`/chat/${conversationId}`, { replace: false });
  };

  const clearConversation = () => {
    navigate("/chat", { replace: false });
  };

  const threadContent = (
    <>
      {id && convLoading && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          กำลังโหลด…
        </div>
      )}
      {id && !convLoading && convError && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-4">
          <p className="font-medium text-foreground">โหลดบทสนทนาไม่สำเร็จ</p>
          <button
            type="button"
            onClick={clearConversation}
            className="mt-3 text-sm text-primary hover:underline"
          >
            กลับรายการแชท
          </button>
        </div>
      )}
      {id && !convLoading && !convError && !conv && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-4">
          <p className="font-medium text-foreground">ไม่พบบทสนทนานี้</p>
          <button
            type="button"
            onClick={clearConversation}
            className="mt-3 text-sm text-primary hover:underline"
          >
            กลับรายการแชท
          </button>
        </div>
      )}
      {conv && (
        <ChatThreadView
          conv={conv}
          messages={messages}
          showBack
          onBack={clearConversation}
          showPartnerToggle
          onOpenPartnerPanel={() => setShowPartnerMobile(true)}
        />
      )}
      {!id && (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground px-6">
          <MessageCircle className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium text-foreground">เลือกบทสนทนาเพื่อเริ่มแชท</p>
          <p className="text-sm mt-1 text-center">
            รายการแชทงานจ้างและคอลแลปอยู่ทางซ้าย — คลิกเพื่อเปิดข้อความ
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="h-[100dvh] bg-background overflow-hidden">
      <div className="h-full md:grid md:grid-cols-[minmax(260px,320px)_1fr_minmax(280px,340px)]">
        <div
          className={cn(
            "h-full min-h-0",
            showSidebarMobile ? "flex flex-col" : "hidden",
            "md:flex md:flex-col",
          )}
        >
          <ChatSidebar
            selectedId={id}
            tab={tab}
            onTabChange={setTab}
            search={search}
            onSearchChange={setSearch}
            onSelectConversation={selectConversation}
          />
        </div>

        <div
          className={cn(
            "h-full min-h-0 min-w-0 border-border md:border-x",
            showThreadMobile ? "flex flex-col" : "hidden",
            "md:flex md:flex-col",
          )}
        >
          <ChatErrorBoundary onBack={clearConversation}>{threadContent}</ChatErrorBoundary>
        </div>

        <div className="hidden md:block h-full min-h-0 min-w-0">
          <ChatErrorBoundary onBack={clearConversation}>
            {conv ? (
              <ChatPartnerPanel conversation={conv} messages={messages} />
            ) : (
              <aside className="h-full border-l border-border bg-muted/20" />
            )}
          </ChatErrorBoundary>
        </div>
      </div>

      {showPartnerMobile && conv && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          onClick={() => setShowPartnerMobile(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-[92%] max-w-sm bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ChatErrorBoundary onBack={() => setShowPartnerMobile(false)}>
              <ChatPartnerPanel
                conversation={conv}
                messages={messages}
                onClose={() => setShowPartnerMobile(false)}
              />
            </ChatErrorBoundary>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInboxPage;
