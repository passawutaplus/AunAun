-- Per-preset chat history for So1o Assistant sidebar
ALTER TABLE public.ai_chat_messages
  ADD COLUMN IF NOT EXISTS preset text NOT NULL DEFAULT 'mentor';

CREATE INDEX IF NOT EXISTS idx_aicm_user_preset
  ON public.ai_chat_messages(user_id, preset, created_at);

INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('ai_assistant_copy', 1, 'So1o Assistant (Copy)'),
  ('ai_assistant_legal', 2, 'So1o Assistant (Legal)')
ON CONFLICT (feature) DO NOTHING;
