import * as React from "react";
import { Banknote, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/core/subscription/useSubscription";
import { useStudioForConversation, useStudioMembers } from "@/hooks/useStudios";
import { supabase } from "@/integrations/supabase/client";
import {
  canOpenStudioCombinedQuote,
  canShowStudioQuoteUpsell,
  openStudioQuotation,
} from "@/lib/studioQuotationHandoff";
import { StudioQuoteUpsellDialog } from "@/components/studio/StudioQuoteUpsellDialog";
import { ChatOfferDialog } from "@/components/chat/ChatOfferDialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isAplus1ChatOffersEnabled } from "@/lib/aplus1Launch";

type Props = {
  conversation: Conversation;
};

export function ChatQuoteActions({ conversation }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier } = useSubscription();
  const [upsellOpen, setUpsellOpen] = React.useState(false);
  const [offerOpen, setOfferOpen] = React.useState(false);

  if (!isAplus1ChatOffersEnabled()) return null;

  const isStudio = !!conversation.studio_id;
  const isFreelancer = !!user?.id && user.id === conversation.freelancer_id;
  const { data: studio } = useStudioForConversation(
    isStudio ? conversation.id : undefined,
    conversation.title || conversation.project_title,
  );
  const { data: members = [] } = useStudioMembers(studio?.id);
  const myRole = members.find((m) => m.user_id === conversation.freelancer_id)?.role;

  const { data: hireMeta } = useQuery({
    queryKey: ["chat-hire-meta-panel", conversation.request_id],
    enabled: !!conversation.request_id && conversation.kind === "hire",
    queryFn: async () => {
      const { data } = await supabase
        .from("hiring_requests")
        .select("client_name, email, phone, message, deadline, project_title")
        .eq("id", conversation.request_id!)
        .maybeSingle();
      return data;
    },
  });

  const openStudioQuote = async () => {
    if (!studio) {
      toast.error("ไม่พบข้อมูล Studio");
      return;
    }
    try {
      await openStudioQuotation({
        tier,
        studio,
        members,
        source: "chat_meta_panel",
        conversationId: conversation.id,
        requestId: conversation.request_id ?? undefined,
        projectTitle: conversation.project_title ?? studio.name,
        clientName: hireMeta?.client_name ?? "ลูกค้า",
        clientEmail: hireMeta?.email ?? undefined,
        clientPhone: hireMeta?.phone ?? undefined,
        message: hireMeta?.message ?? undefined,
        deadline: hireMeta?.deadline ?? undefined,
        onRequireInHouse: () => setUpsellOpen(true),
      });
    } catch {
      toast.error("เปิด So1o ไม่สำเร็จ");
    }
  };

  if (isStudio && studio) {
    if (canOpenStudioCombinedQuote(tier, myRole)) {
      return (
        <>
          <Button type="button" variant="outline" size="sm" className="w-full rounded-xl" onClick={() => void openStudioQuote()}>
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            ใบเสนอราคารวม Studio
          </Button>
          <StudioQuoteUpsellDialog
            open={upsellOpen}
            onOpenChange={setUpsellOpen}
            onUpgrade={() => navigate("/upgrade#tier-details")}
          />
        </>
      );
    }
    if (canShowStudioQuoteUpsell(tier, myRole)) {
      return (
        <>
          <Button type="button" variant="outline" size="sm" className="w-full rounded-xl" onClick={() => setUpsellOpen(true)}>
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            ใบเสนอราคารวม Studio
          </Button>
          <StudioQuoteUpsellDialog
            open={upsellOpen}
            onOpenChange={setUpsellOpen}
            onUpgrade={() => navigate("/upgrade#tier-details")}
          />
        </>
      );
    }
    return null;
  }

  if (conversation.kind !== "hire") return null;
  if (!isFreelancer) return null;

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="w-full rounded-xl"
        onClick={() => setOfferOpen(true)}
      >
        <Banknote className="w-3.5 h-3.5 mr-1.5" />
        เสนอราคา
      </Button>
      <ChatOfferDialog
        open={offerOpen}
        onOpenChange={setOfferOpen}
        conversationId={conversation.id}
        defaultTitle={hireMeta?.project_title ?? conversation.project_title ?? ""}
        defaultClientName={hireMeta?.client_name ?? ""}
        defaultClientEmail={hireMeta?.email ?? ""}
        defaultClientPhone={hireMeta?.phone ?? ""}
      />
    </>
  );
}
