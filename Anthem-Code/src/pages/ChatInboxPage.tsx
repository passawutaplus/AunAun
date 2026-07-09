import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { MessageCircle, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useConversation, useMessages, useStudioConversation, type ChatKind } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatThreadView from "@/components/chat/ChatThreadView";
import ChatPartnerPanel from "@/components/chat/ChatPartnerPanel";
import { ChatErrorBoundary } from "@/components/chat/ChatErrorBoundary";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { smoothEase } from "@/lib/motion";

const ChatInboxPage = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const studioChat = useStudioConversation();
  const [tab, setTab] = useState<"all" | ChatKind>("all");
  const [search, setSearch] = useState("");
  const [showPartnerMobile, setShowPartnerMobile] = useState(false);
  const reducedMotion = useReducedMotion();

  const {
    data: conv,
    isLoading: convLoading,
    isError: convError,
    isFetching: convFetching,
    refetch: refetchConv,
  } = useConversation(id);
  const {
    data: messages = [],
    isLoading: messagesLoading,
    isFetching: messagesFetching,
    isError: messagesError,
  } = useMessages(id, { subscribe: true });

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

  const retryThread = () => {
    void refetchConv();
    if (user?.id) {
      void qc.invalidateQueries({ queryKey: ["conversations", user.id] });
    }
  };

  const threadContent = (
    <>
      {id && (convLoading || convFetching) && !conv && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          กำลังโหลด…
        </div>
      )}
      {id && !convLoading && !convFetching && convError && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-4 gap-3">
          <p className="font-medium text-foreground">โหลดบทสนทนาไม่สำเร็จ</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={retryThread}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              ลองใหม่
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearConversation}>
              กลับรายการแชท
            </Button>
          </div>
        </div>
      )}
      {id && !convLoading && !convFetching && !convError && !conv && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-4 gap-3">
          <p className="font-medium text-foreground">ไม่พบบทสนทนานี้</p>
          <p className="text-sm text-center">อาจยังไม่มีสิทธิ์เข้าถึง หรือบทสนทนาถูกลบแล้ว</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={retryThread}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              ลองโหลดอีกครั้ง
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={clearConversation}>
              กลับรายการแชท
            </Button>
          </div>
        </div>
      )}
      {conv && (
        <ChatThreadView
          conv={conv}
          messages={messages}
          messagesLoading={messagesLoading || messagesFetching}
          messagesError={messagesError}
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

      <AnimatePresence>
        {showPartnerMobile && conv && (
          <>
            <motion.button
              key="chat-partner-backdrop"
              type="button"
              aria-label="ปิดข้อมูลคู่แชท"
              className="md:hidden fixed inset-0 z-40 bg-background/75 backdrop-blur-sm"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: smoothEase }}
              onClick={() => setShowPartnerMobile(false)}
            />
            <motion.div
              key="chat-partner-panel"
              className="md:hidden fixed right-0 top-0 bottom-0 z-50 w-[92%] max-w-sm bg-background shadow-xl"
              initial={reducedMotion ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: 0.28, ease: smoothEase }}
            >
              <ChatErrorBoundary onBack={() => setShowPartnerMobile(false)}>
                <ChatPartnerPanel
                  conversation={conv}
                  messages={messages}
                  onClose={() => setShowPartnerMobile(false)}
                />
              </ChatErrorBoundary>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatInboxPage;
