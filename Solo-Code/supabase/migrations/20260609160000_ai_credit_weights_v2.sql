-- Rebalance AI credit weights (v2) — heavier business/vision/contract paths.
-- Gemini 2.0 retired 2026-06-01; app defaults now gemini-2.5-flash-lite / gemini-2.5-flash.

UPDATE public.ai_feature_costs
SET cost = 5, label = 'So1o Assistant (ธุรกิจ)', updated_at = now()
WHERE feature = 'ai_assistant_business';

UPDATE public.ai_feature_costs
SET cost = 8, label = 'สร้างสัญญา AI', updated_at = now()
WHERE feature = 'generate_contract';

INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('ai_brief_extract', 10, 'Smart Brief — Quick Capture'),
  ('ai_brief_from_images', 8, 'Smart Brief — วิเคราะห์รูป')
ON CONFLICT (feature) DO UPDATE
  SET cost = EXCLUDED.cost, label = EXCLUDED.label, updated_at = now();

-- Production mix analysis (run in SQL editor):
-- SELECT feature, COUNT(*) AS uses, SUM(cost) AS credits_spent
-- FROM public.ai_credit_ledger
-- WHERE created_at > now() - interval '90 days'
-- GROUP BY feature ORDER BY credits_spent DESC;
