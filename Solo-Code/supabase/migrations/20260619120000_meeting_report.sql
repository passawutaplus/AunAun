-- Meeting report: report_markdown, credits_report, reporting status, ai_meeting_report credits

ALTER TABLE public.meeting_captures
  ADD COLUMN IF NOT EXISTS report_markdown text,
  ADD COLUMN IF NOT EXISTS credits_report integer NOT NULL DEFAULT 0;

ALTER TABLE public.meeting_captures DROP CONSTRAINT IF EXISTS meeting_captures_status_check;
ALTER TABLE public.meeting_captures ADD CONSTRAINT meeting_captures_status_check
  CHECK (status IN (
    'pending', 'uploading', 'transcribing', 'transcribed',
    'reporting', 'extracting', 'ready', 'failed'
  ));

INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('ai_meeting_report_15', 5, 'Meeting — สรุปรายงาน ≤15 นาที'),
  ('ai_meeting_report_30', 7, 'Meeting — สรุปรายงาน ≤30 นาที'),
  ('ai_meeting_report_45', 9, 'Meeting — สรุปรายงาน ≤45 นาที'),
  ('ai_meeting_report_60', 10, 'Meeting — สรุปรายงาน ≤60 นาที')
ON CONFLICT (feature) DO UPDATE SET cost = EXCLUDED.cost, label = EXCLUDED.label;
