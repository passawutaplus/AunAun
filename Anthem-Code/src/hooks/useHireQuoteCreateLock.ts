import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, sharedDb } from "@/integrations/supabase/client";
import { isChatOfferContent, parseChatOffer } from "@/lib/chatOffer";
import { hireQuoteCreateLocked, type HireQuoteLockRow } from "@/lib/hireQuotePreview";
import { isHireOrderActive, type HireOrderRow } from "@/hooks/useHireOrderFlow";
import { parseHirePaidMessage, parseLegacyHirePaidText } from "@/lib/hirePaymentChat";

type Args = {
  conversationId: string | undefined;
  hiringRequestId: string | null | undefined;
  enabled: boolean;
  /** When the thread already loaded messages, skip a second fetch. */
  messageContents?: Array<string | null | undefined>;
};

export function useHireQuoteCreateLock({
  conversationId,
  hiringRequestId,
  enabled,
  messageContents,
}: Args) {
  const { data: latestQuote = null } = useQuery({
    queryKey: ["chat-hire-latest-quote", hiringRequestId],
    enabled: enabled && !!hiringRequestId,
    queryFn: async () => {
      const { data, error } = await sharedDb
        .from("hire_quotes" as never)
        .select("id,status,expires_at")
        .eq("hiring_request_id", hiringRequestId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return (data ?? null) as (HireQuoteLockRow & { id: string }) | null;
    },
  });

  const { data: latestOrder = null } = useQuery({
    queryKey: ["hire-order-by-request", hiringRequestId],
    enabled: enabled && !!hiringRequestId,
    queryFn: async () => {
      const { data, error } = await sharedDb
        .from("hire_orders" as never)
        .select("id,status")
        .eq("hiring_request_id", hiringRequestId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return (data ?? null) as Pick<HireOrderRow, "id" | "status"> | null;
    },
  });

  const fromMessages = useMemo(() => {
    if (!messageContents) return null;
    return messageContents.some((content) => isChatOfferContent(content));
  }, [messageContents]);

  const { data: chatHint } = useQuery({
    queryKey: ["hire-accounting-chat-hint", conversationId],
    enabled: enabled && !!conversationId && fromMessages === null,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      let offer = null;
      let paidThb = 0;
      let paidAt: string | null = null;
      for (const row of data ?? []) {
        const content = (row as { content?: string | null }).content;
        const createdAt = (row as { created_at?: string }).created_at ?? null;
        if (!offer) {
          const parsed = parseChatOffer(content);
          if (parsed) offer = parsed;
        }
        if (!paidThb) {
          const paid = parseHirePaidMessage(content) || parseLegacyHirePaidText(content);
          if (paid) {
            paidThb = paid.paidAmountThb || 0;
            paidAt = createdAt;
          }
        }
        if (offer && paidThb) break;
      }
      return { offer, paidThb, paidAt };
    },
  });

  const hasChatOffer = fromMessages !== null ? fromMessages : !!chatHint?.offer;
  const orderBlocksNewQuote = isHireOrderActive(latestOrder?.status);
  const quoteLocked = hireQuoteCreateLocked({
    quote: latestQuote,
    hasOrder: !!latestOrder,
    orderBlocksNewQuote,
    hasChatOffer,
  });

  return { quoteLocked, latestOrder, latestQuote, hasChatOffer };
}
