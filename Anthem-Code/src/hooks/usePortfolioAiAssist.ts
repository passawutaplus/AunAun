import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAiUsage } from "@/hooks/useAiUsage";

export interface PortfolioAiAssistResult {
  image_order: number[];
  cover_index: number;
  category: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  tools: string[];
}

interface RunAssistInput {
  imageUrls: string[];
  hint?: string;
  categoryHint?: string;
}

export function usePortfolioAiAssist() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PortfolioAiAssistResult | null>(null);
  const { refetch, limitReached } = useAiUsage();

  const runAssist = useCallback(async (input: RunAssistInput): Promise<PortfolioAiAssistResult | null> => {
    if (limitReached) {
      throw new Error("limit_reached");
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("anthem-portfolio-assist", {
        body: {
          imageUrls: input.imageUrls,
          hint: input.hint?.trim() || undefined,
          categoryHint: input.categoryHint || undefined,
        },
      });
      if (error) throw error;
      if (data?.error === "limit_reached") {
        void refetch();
        throw new Error("limit_reached");
      }
      if (data?.error === "rate_limited") {
        throw new Error("rate_limited");
      }
      if (data?.error) {
        throw new Error(String(data.error));
      }
      const parsed = data as PortfolioAiAssistResult;
      setResult(parsed);
      void refetch();
      return parsed;
    } finally {
      setLoading(false);
    }
  }, [limitReached, refetch]);

  const clearResult = useCallback(() => setResult(null), []);

  return { loading, result, runAssist, clearResult, limitReached };
}
