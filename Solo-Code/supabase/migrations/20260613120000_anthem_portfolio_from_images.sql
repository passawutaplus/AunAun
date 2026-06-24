-- Anthem portfolio AI assist from images (vision)
INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('anthem_portfolio_from_images', 8, 'Anthem — AI ช่วยลงผลงาน')
ON CONFLICT (feature) DO UPDATE SET cost = 8, label = EXCLUDED.label;
