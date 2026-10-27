import { useEffect, useState } from "react";
import { GuideTour } from "@/components/tour/GuideTour";
import { CHAT_TOUR } from "@/components/tour/tours";
import { usePageTour } from "@/hooks/usePageTour";
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
import { ChatInboxTopBar } from "@/components/chat/ChatInboxTopBar";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { smoothEase } from "@/lib/motion";

const PARTNER_PANEL_KEY = "aplus1-chat-partner-panel-open";

function readPartnerPanelOpen(): boolean {
  try {
    const v = localStorage.getItem(PARTNER_PANEL_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* ignore */
  }
  return true;
}

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
  const [partnerPanelOpen, setPartnerPanelOpen] = useState(readPartnerPanelOpen);
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
    try {
      localStorage.setItem(PARTNER_PANEL_KEY, partnerPanelOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [partnerPanelOpen]);

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

  // Moving around inside /chat replaces the entry, so Back leaves chat to the page you came from.
  const selectConversation = (conversationId: string) => {
    navigate(`/chat/${conversationId}`, { replace: true });
  };

  const clearConversation = () => {
    navigate("/chat", { replace: true });
  };

  const retryThread = () => {
    void refetchConv();
    if (user?.id) {
      void qc.invalidateQueries({ queryKey: ["conversations", user.id] });
    }
  };

  const openPartnerPanel = () => {
    setPartnerPanelOpen(true);
    setShowPartnerMobile(true);
  };

  const togglePartnerPanel = () => {
    // Below xl the panel is a slide-over, not a docked column.
    if (!window.matchMedia("(min-width: 1280px)").matches) {
      setShowPartnerMobile((open) => !open);
      return;
    }
    setPartnerPanelOpen((open) => !open);
  };

  const threadContent = (
    <>
      {id && (convLoading || convFetching) && !conv && (
        <InlineLoader className="flex-1 py-0" />
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
          partnerPanelOpen={partnerPanelOpen}
          onOpenPartnerPanel={openPartnerPanel}
          onTogglePartnerPanel={togglePartnerPanel}
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

  // First visit to chat: short tour of list / cards / Plan & Tasks; "?" in the top bar replays it.
  const chatTour = usePageTour("chat", true, 1200);

  return (
    <main id="main-content" className="chat-paper flex h-[100dvh] flex-col overflow-hidden bg-background">
      <ChatInboxTopBar onTour={chatTour.start} />
      <div className="flex min-h-0 flex-1">
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col md:grid",
          "transition-[grid-template-columns] duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          // Tablets get list + thread; the partner panel docks as a third column only on wide screens.
          "md:grid-cols-[minmax(260px,320px)_1fr]",
          partnerPanelOpen
            ? "xl:grid-cols-[minmax(260px,320px)_1fr_minmax(280px,340px)]"
            : "xl:grid-cols-[minmax(260px,320px)_1fr_0fr]",
        )}
      >
        <div
          className={cn(
            "h-full min-h-0 min-w-0 flex-1 flex-col",
            showSidebarMobile ? "flex" : "hidden",
            "md:flex",
          )}
        >
          <div data-tour="chat-list" className="flex h-full min-h-0 flex-col">
          <ChatSidebar
            selectedId={id}
            tab={tab}
            onTabChange={setTab}
            search={search}
            onSearchChange={setSearch}
            onSelectConversation={selectConversation}
            onTour={chatTour.start}
          />
          </div>
        </div>

        <div
          className={cn(
            "h-full min-h-0 min-w-0 flex-1 flex-col border-border md:border-x",
            showThreadMobile ? "flex" : "hidden",
            "md:flex",
          )}
        >
          <div data-tour={id ? "chat-thread" : undefined} className="flex h-full min-h-0 flex-col">
            <ChatErrorBoundary onBack={clearConversation}>{threadContent}</ChatErrorBoundary>
          </div>
        </div>

        <div
          className={cn(
            "hidden xl:block h-full min-h-0 min-w-0 overflow-hidden",
            !partnerPanelOpen && "pointer-events-none",
          )}
          aria-hidden={!partnerPanelOpen}
        >
          <motion.div
            data-tour={partnerPanelOpen && conv ? "chat-side" : undefined}
            className="h-full w-full min-w-[280px] max-w-[340px] ml-auto"
            initial={false}
            animate={
              reducedMotion
                ? { opacity: partnerPanelOpen ? 1 : 0 }
                : {
                    x: partnerPanelOpen ? 0 : 28,
                    opacity: partnerPanelOpen ? 1 : 0,
                  }
            }
            transition={{ duration: 0.35, ease: smoothEase }}
          >
            <ChatErrorBoundary onBack={clearConversation}>
              {conv ? (
                <ChatPartnerPanel
                  conversation={conv}
                  messages={messages}
                  onClose={() => setPartnerPanelOpen(false)}
                  collapseLabel="หุบแผง"
                />
              ) : (
                <aside className="h-full border-l border-border bg-muted/20" />
              )}
            </ChatErrorBoundary>
          </motion.div>
        </div>
      </div>
      </div>

      <AnimatePresence>
        {showPartnerMobile && conv && (
          <>
            <motion.button
              key="chat-partner-backdrop"
              type="button"
              aria-label="ปิดข้อมูลคู่แชท"
              className="xl:hidden fixed inset-x-0 top-14 bottom-0 z-40 bg-background/75 backdrop-blur-sm"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: smoothEase }}
              onClick={() => setShowPartnerMobile(false)}
            />
            <motion.div
              key="chat-partner-panel"
              className="xl:hidden fixed right-0 top-14 bottom-0 z-50 w-[92%] max-w-sm bg-background shadow-sm"
              initial={reducedMotion ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: 0.32, ease: smoothEase }}
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
      <GuideTour tourId="chat" label="ทัวร์แนะนำแชท" steps={CHAT_TOUR} open={chatTour.open} onClose={chatTour.close} />
    </main>
  );
};

export default ChatInboxPage;
