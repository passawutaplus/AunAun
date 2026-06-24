-- AI interactions feedback (Like/Dislike on Mentor chat answers)
CREATE TABLE public.ai_interactions_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature TEXT NOT NULL DEFAULT 'mentor_chat',
  prompt TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  personality_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('liked','disliked')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_feedback_user ON public.ai_interactions_feedback(user_id, created_at DESC);
CREATE INDEX idx_ai_feedback_status ON public.ai_interactions_feedback(status, created_at DESC);

ALTER TABLE public.ai_interactions_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback"
ON public.ai_interactions_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own feedback"
ON public.ai_interactions_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all feedback"
ON public.ai_interactions_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: mirror new feedback into ai_training_samples so it appears in the Training Queue
CREATE OR REPLACE FUNCTION public.feedback_to_training_sample()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_training_samples (
    user_id,
    feature,
    user_prompt,
    ai_response,
    user_rating,
    status,
    metadata,
    model
  ) VALUES (
    NEW.user_id,
    NEW.feature,
    NEW.prompt,
    NEW.ai_response,
    CASE WHEN NEW.status = 'liked' THEN 1 ELSE -1 END,
    'pending',
    jsonb_build_object(
      'source', 'ai_interactions_feedback',
      'feedback_id', NEW.id,
      'personality_settings', NEW.personality_settings
    ) || COALESCE(NEW.metadata, '{}'::jsonb),
    COALESCE(NEW.metadata->>'model', NULL)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_feedback_to_training
AFTER INSERT ON public.ai_interactions_feedback
FOR EACH ROW
EXECUTE FUNCTION public.feedback_to_training_sample();