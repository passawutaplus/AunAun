-- Harden guest telemetry INSERT policies: keep anon allowed, require minimal shape

DROP POLICY IF EXISTS "Anyone can submit a survey" ON public.survey_responses;
CREATE POLICY "Anyone can submit a survey"
  ON public.survey_responses
  FOR INSERT
  WITH CHECK (
    (
      (auth.uid() IS NOT NULL AND user_id = auth.uid())
      OR (guest_id IS NOT NULL AND char_length(guest_id) BETWEEN 8 AND 128)
    )
    AND answers IS NOT NULL
    AND jsonb_typeof(answers) = 'object'
  );

DROP POLICY IF EXISTS "Anyone can log device event" ON public.user_device_events;
CREATE POLICY "Anyone can log device event"
  ON public.user_device_events
  FOR INSERT
  WITH CHECK (
    session_id IS NOT NULL
    AND char_length(session_id) BETWEEN 8 AND 128
    AND device_type IS NOT NULL
    AND char_length(device_type) BETWEEN 1 AND 64
    AND (user_id IS NULL OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anyone can log calculator usage" ON public.calculator_usage_events;
CREATE POLICY "Anyone can log calculator usage"
  ON public.calculator_usage_events
  FOR INSERT
  WITH CHECK (
    session_id IS NOT NULL
    AND char_length(session_id) BETWEEN 8 AND 128
  );

