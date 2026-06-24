-- Auto-reply on first user message in a conversation
CREATE OR REPLACE FUNCTION public.chat_auto_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prior_count INTEGER;
BEGIN
  IF NEW.sender_role <> 'user' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO prior_count
    FROM public.chat_messages
   WHERE user_id = NEW.user_id
     AND id <> NEW.id;

  IF prior_count = 0 THEN
    INSERT INTO public.chat_messages (user_id, sender_id, sender_role, body, is_read)
    VALUES (
      NEW.user_id,
      NEW.user_id, -- placeholder; system reply
      'admin',
      'สวัสดีครับ! ผมแอดมิน So1o กำลังรีบเข้ามาตอบนะครับ 🙌' || E'\n' ||
      'ระหว่างนี้พิมพ์รายละเอียด/แนบรูปทิ้งไว้ได้เลย เดี๋ยวมาดูให้ครับ',
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_auto_reply ON public.chat_messages;
CREATE TRIGGER trg_chat_auto_reply
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.chat_auto_reply();