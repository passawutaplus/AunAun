-- Chat system lines (payment cards, cancel/withdraw notices, collab plan updates) are written by the
-- server only. Members call public.post_chat_system_event with an event kind plus ids; the function
-- checks that the caller is a participant and that the referenced row really is in that state, then
-- builds the message text itself. Direct inserts/edits from members may only use normal message types
-- and may not carry the reserved card markers that the app renders as system/payment cards.

-- Reserved markers: system fallback prefix, payment/receipt/work-start cards and the legacy paid line.
CREATE OR REPLACE FUNCTION shared.is_reserved_chat_content(p_content text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = shared, public
AS $$
  SELECT coalesce(
    ltrim(p_content) LIKE '[context]%'
    OR strpos(p_content, '__APLUS1_HIRE_PAID__:') > 0
    OR strpos(p_content, '__APLUS1_HIRE_RECEIPT__:') > 0
    OR strpos(p_content, '__APLUS1_HIRE_WORK_START__:') > 0
    OR p_content ~ '^\s*ชำระเงิน\s*฿?\s*[0-9,]+(\.[0-9]+)?\s*สำเร็จ(แล้ว)?\s*[—–-]\s*SAMECOR\s*พักเงิน',
    false);
$$;

DROP POLICY IF EXISTS "Participants can send messages" ON shared.messages;
CREATE POLICY "Participants can send messages" ON shared.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND coalesce(message_type, 'text') <> 'system'
    AND NOT shared.is_reserved_chat_content(content)
    AND EXISTS (
      SELECT 1 FROM shared.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.client_id = auth.uid() OR c.freelancer_id = auth.uid() OR c.created_by = auth.uid()
          OR EXISTS (SELECT 1 FROM shared.conversation_members m WHERE m.conversation_id = c.id AND m.user_id = auth.uid())
        )
    )
  );

-- The sender may still update their own recent row (soft delete), but not into a system line.
DROP POLICY IF EXISTS "Sender can unsend own messages" ON shared.messages;
CREATE POLICY "Sender can unsend own messages" ON shared.messages
  FOR UPDATE
  USING (auth.uid() = sender_id AND created_at > now() - interval '24 hours')
  WITH CHECK (
    auth.uid() = sender_id
    AND coalesce(message_type, 'text') <> 'system'
    AND NOT shared.is_reserved_chat_content(content)
  );

CREATE OR REPLACE FUNCTION public.post_chat_system_event(
  p_conversation_id uuid,
  p_event text,
  p_ref_id uuid DEFAULT NULL,
  p_fields text[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, anthem, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_conv shared.conversations%ROWTYPE;
  v_other uuid;
  v_actor text;
  v_content text;
  v_dedupe boolean := false;
  v_id uuid;
  v_order shared.hire_orders%ROWTYPE;
  v_quote jsonb;
  v_title text;
  v_service text;
  v_doc record;
  v_row record;
  v_labels text[];
  v_acks jsonb;
  v_found boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO v_conv FROM shared.conversations WHERE id = p_conversation_id;
  IF NOT FOUND OR (
    v_conv.client_id = v_uid OR v_conv.freelancer_id = v_uid OR v_conv.created_by = v_uid
    OR EXISTS (SELECT 1 FROM shared.conversation_members m WHERE m.conversation_id = v_conv.id AND m.user_id = v_uid)
  ) IS NOT TRUE THEN
    RAISE EXCEPTION 'NOT_PARTICIPANT' USING errcode = '42501';
  END IF;

  -- Block enforcement (1:1 chats): a blocked user cannot post system lines either.
  IF coalesce(v_conv.conversation_type, '') <> 'group' AND coalesce(v_conv.kind, '') NOT IN ('group', 'studio') THEN
    v_other := CASE WHEN v_uid = v_conv.client_id THEN v_conv.freelancer_id ELSE v_conv.client_id END;
    IF v_other IS NOT NULL AND v_other <> v_uid AND anthem.is_blocked_from_opportunity(v_uid, v_other) THEN
      RAISE EXCEPTION 'CHAT_BLOCKED' USING errcode = 'P0001';
    END IF;
  END IF;

  SELECT coalesce(nullif(btrim(p.display_name), ''), 'มีคน') INTO v_actor
  FROM public.profiles p WHERE p.user_id = v_uid LIMIT 1;
  v_actor := left(coalesce(v_actor, 'มีคน'), 60);

  IF p_event IN ('hire_paid', 'hire_receipt', 'hire_work_start') THEN
    IF p_ref_id IS NULL AND p_event = 'hire_work_start' THEN
      SELECT * INTO v_order FROM shared.hire_orders o
      WHERE (o.conversation_id = v_conv.id OR (v_conv.request_id IS NOT NULL AND o.hiring_request_id = v_conv.request_id))
        AND o.paid_at IS NOT NULL AND o.cancelled_at IS NULL
      ORDER BY o.paid_at DESC LIMIT 1;
    ELSE
      SELECT * INTO v_order FROM shared.hire_orders o WHERE o.id = p_ref_id;
    END IF;
    IF v_order.id IS NULL
       OR v_order.paid_at IS NULL OR v_order.cancelled_at IS NOT NULL
       OR (v_order.conversation_id = v_conv.id OR v_order.hiring_request_id = v_conv.request_id) IS NOT TRUE
       OR (p_event <> 'hire_work_start' AND v_order.buyer_id IS DISTINCT FROM v_uid) THEN
      RAISE EXCEPTION 'EVENT_NOT_FOUND';
    END IF;

    SELECT q.payload INTO v_quote FROM shared.hire_quotes q WHERE q.id = v_order.quote_id;
    v_title := left(coalesce(
      nullif(btrim(v_quote ->> 'title'), ''),
      nullif(btrim(v_order.metadata ->> 'offer_title'), ''),
      CASE WHEN p_event = 'hire_paid' THEN 'ข้อเสนอ' ELSE 'งานจ้าง' END), 120);
    v_dedupe := true;

    IF p_event = 'hire_paid' THEN
      v_content := '__APLUS1_HIRE_PAID__:' || json_build_object(
        'v', 1, 'kind', 'hire_paid',
        'offerTitle', v_title,
        'offerAmountThb', round(coalesce(v_order.job_price_satang, 0) / 100.0),
        'paidAmountThb', round(coalesce(nullif(v_order.amount_paid_satang, 0), v_order.buyer_pays_satang, 0) / 100.0),
        'quoteId', v_order.quote_id,
        'orderId', v_order.id)::text;
    ELSIF p_event = 'hire_receipt' THEN
      SELECT d.id, d.doc_number INTO v_doc FROM shared.hire_documents d
      WHERE d.hire_order_id = v_order.id AND d.kind = 'receipt'
      ORDER BY d.issued_at DESC NULLS LAST LIMIT 1;
      v_content := '__APLUS1_HIRE_RECEIPT__:' || json_build_object(
        'v', 1, 'kind', 'hire_receipt',
        'offerTitle', v_title,
        'offerAmountThb', round(coalesce(v_order.job_price_satang, 0) / 100.0),
        'paidAmountThb', round(coalesce(nullif(v_order.amount_paid_satang, 0), v_order.buyer_pays_satang, 0) / 100.0),
        'isDeposit', coalesce(v_order.deposit_percent, 100) < 100,
        'depositPercent', CASE WHEN coalesce(v_order.deposit_percent, 100) < 100
                               THEN least(100, greatest(1, round(v_order.deposit_percent))) END,
        'docNumber', left(v_doc.doc_number, 40),
        'documentId', v_doc.id,
        'orderId', v_order.id,
        'quoteId', v_order.quote_id,
        'paymentMethod', left(v_order.payment_method, 40))::text;
    ELSE
      v_content := '__APLUS1_HIRE_WORK_START__:' || json_build_object(
        'v', 1, 'kind', 'hire_work_start',
        'offerTitle', v_title,
        'offerAmountThb', round(coalesce(v_order.job_price_satang, 0) / 100.0),
        'items', coalesce((
          SELECT json_agg(json_build_object(
                   'name', left(btrim(it ->> 'name'), 120),
                   'quantity', greatest(0, coalesce((it ->> 'quantity')::numeric, 0)),
                   'unitPrice', greatest(0, round(coalesce((it ->> 'unitPrice')::numeric, 0)))) ORDER BY ord)
          FROM (
            SELECT it, ord FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(v_quote -> 'items') = 'array' THEN v_quote -> 'items' ELSE '[]'::jsonb END
            ) WITH ORDINALITY AS t(it, ord)
            WHERE jsonb_typeof(it) = 'object' AND btrim(coalesce(it ->> 'name', '')) <> ''
            ORDER BY ord LIMIT 20
          ) s), '[]'::json),
        'startDate', left(v_quote ->> 'startDate', 32),
        'endDate', left(v_quote ->> 'endDate', 32),
        'dueDate', left(v_quote ->> 'dueDate', 32),
        'milestones', coalesce((
          SELECT json_agg(json_build_object(
                   'id', left(m ->> 'id', 40),
                   'label', left(m ->> 'label', 80),
                   'date', left(m ->> 'date', 32)) ORDER BY ord)
          FROM (
            SELECT m, ord FROM jsonb_array_elements(
              CASE WHEN jsonb_typeof(v_quote -> 'milestones') = 'array' THEN v_quote -> 'milestones' ELSE '[]'::jsonb END
            ) WITH ORDINALITY AS t(m, ord)
            WHERE jsonb_typeof(m) = 'object'
            ORDER BY ord LIMIT 12
          ) s), '[]'::json),
        'showFullTimeline', coalesce((v_quote ->> 'showFullTimeline')::boolean, true),
        'quoteId', v_order.quote_id,
        'orderId', v_order.id)::text;
    END IF;

  ELSIF p_event IN ('hire_cancel_withdrawn', 'hire_cancel_edited') THEN
    SELECT r.status, r.money_terms INTO v_row FROM anthem.hire_cancel_requests r
    WHERE r.id = p_ref_id AND r.conversation_id = v_conv.id AND r.initiator_id = v_uid;
    IF NOT FOUND
       OR (p_event = 'hire_cancel_withdrawn' AND v_row.status IS DISTINCT FROM 'withdrawn')
       OR (p_event = 'hire_cancel_edited' AND coalesce(v_row.status, '') NOT IN ('pending', 'countered')) THEN
      RAISE EXCEPTION 'EVENT_NOT_FOUND';
    END IF;
    v_content := CASE p_event
      WHEN 'hire_cancel_withdrawn' THEN 'ถอนคำขอยกเลิกงานแล้ว — งานดำเนินต่อ'
      ELSE 'มีการแก้ไขคำขอยกเลิกงาน — เงื่อนไขเงิน: ' || left(coalesce(v_row.money_terms, '-'), 200)
           || ' (กำหนดพิจารณาเดิมไม่เปลี่ยน)'
    END;

  ELSIF p_event IN ('collab_end_withdrawn', 'collab_end_edited', 'collab_end_left') THEN
    SELECT r.status INTO v_row FROM shared.collab_end_requests r
    WHERE r.id = p_ref_id AND r.conversation_id = v_conv.id AND r.initiator_id = v_uid;
    IF NOT FOUND
       OR (p_event = 'collab_end_withdrawn' AND v_row.status IS DISTINCT FROM 'withdrawn')
       OR (p_event = 'collab_end_edited' AND v_row.status IS DISTINCT FROM 'pending')
       OR (p_event = 'collab_end_left' AND coalesce(v_row.status, '') NOT IN ('pending', 'approved')) THEN
      RAISE EXCEPTION 'EVENT_NOT_FOUND';
    END IF;
    v_content := CASE p_event
      WHEN 'collab_end_withdrawn' THEN 'ถอนคำขอยุติคอลแลปแล้ว — ทำต่อได้ตามเดิม'
      WHEN 'collab_end_edited' THEN 'มีการแก้ไขเหตุผลถอนตัว'
      ELSE 'ถอนตัวแล้ว — สละสิทธิ์และเครดิตทั้งหมด อีกฝ่ายทำต่อได้ (ไม่นับเป็นจบงาน)'
    END;

  ELSIF p_event = 'collab_group_expand_withdrawn' THEN
    v_found := false;
    IF to_regclass('shared.collab_group_expand_requests') IS NOT NULL THEN
      EXECUTE 'SELECT EXISTS (SELECT 1 FROM shared.collab_group_expand_requests
                 WHERE id = $1 AND source_conversation_id = $2 AND proposed_by = $3 AND status = ''withdrawn'')'
        INTO v_found USING p_ref_id, v_conv.id, v_uid;
    END IF;
    IF v_found IS NOT TRUE THEN
      RAISE EXCEPTION 'EVENT_NOT_FOUND';
    END IF;
    v_content := 'ถอนคำขอสร้างกลุ่มแล้ว';

  ELSIF p_event = 'collab_task_assigned' THEN
    SELECT t.title, t.assignee_id INTO v_row FROM shared.collab_tasks t
    WHERE t.id = p_ref_id AND t.conversation_id = v_conv.id AND t.assignee_id IS NOT NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'EVENT_NOT_FOUND';
    END IF;
    IF v_row.assignee_id = v_uid THEN
      v_content := v_actor || ' รับงาน “' || left(v_row.title, 200) || '”';
    ELSE
      v_content := v_actor || ' มอบงาน “' || left(v_row.title, 200) || '” ให้ ' || coalesce(
        (SELECT left(nullif(btrim(p.display_name), ''), 60) FROM public.profiles p WHERE p.user_id = v_row.assignee_id LIMIT 1),
        'ผู้ร่วมงาน');
    END IF;

  ELSIF p_event IN ('collab_plan_edited', 'collab_plan_edited_reconfirm', 'collab_plan_agreed',
                    'collab_plan_unagreed', 'collab_close_requested', 'collab_closed') THEN
    SELECT cp.acks INTO v_acks FROM shared.collab_plans cp WHERE cp.conversation_id = v_conv.id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'EVENT_NOT_FOUND';
    END IF;
    v_acks := coalesce(v_acks, '{}'::jsonb);

    IF p_event IN ('collab_plan_edited', 'collab_plan_edited_reconfirm') THEN
      -- Field keys only; labels come from this fixed map (same as AGREEMENT_FIELD_LABELS).
      SELECT array_agg(label ORDER BY first_ord) INTO v_labels FROM (
        SELECT label, min(ord) AS first_ord FROM (
          SELECT CASE f
                   WHEN 'what' THEN 'ทำอะไร' WHEN 'roles' THEN 'ใครทำอะไร' WHEN 'brief' THEN 'บรีฟ'
                   WHEN 'destinations' THEN 'ปลายทางของงาน' WHEN 'dueAt' THEN 'วันเสร็จ'
                   WHEN 'rightsPreset' THEN 'เครดิตและสิทธิ์' WHEN 'rightsNote' THEN 'เครดิตและสิทธิ์'
                   WHEN 'links' THEN 'อ้างอิง' WHEN 'deliverables' THEN 'ชิ้นงานที่จะส่ง' WHEN 'note' THEN 'โน้ต'
                 END AS label, ord
          FROM unnest(coalesce(p_fields, '{}'::text[])) WITH ORDINALITY AS t(f, ord)
        ) x WHERE label IS NOT NULL GROUP BY label
      ) y;
      IF v_labels IS NULL OR cardinality(v_labels) = 0 THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND';
      END IF;
      v_content := CASE p_event
        WHEN 'collab_plan_edited' THEN v_actor || ' แก้แผน: ' || array_to_string(v_labels, ', ')
        ELSE v_actor || ' แก้' || array_to_string(v_labels, ', ') || ' — ทุกคนต้องยืนยันแผนใหม่'
      END;
    ELSIF p_event = 'collab_plan_agreed' THEN
      IF NOT (coalesce(v_acks -> 'align', '{}'::jsonb) ? v_uid::text)
         OR shared._collab_all_acked(v_conv, v_acks -> 'align') IS NOT TRUE THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND';
      END IF;
      v_content := 'ทุกคนตกลงแผนคอลแลปแล้ว ✓';
    ELSIF p_event = 'collab_plan_unagreed' THEN
      IF coalesce(v_acks -> 'align', '{}'::jsonb) ? v_uid::text THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND';
      END IF;
      v_content := v_actor || ' ยกเลิกการตกลงแผน';
    ELSIF p_event = 'collab_close_requested' THEN
      IF NOT (coalesce(v_acks -> 'publish', '{}'::jsonb) ? v_uid::text) THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND';
      END IF;
      v_content := v_actor || ' ขอปิดคอลแลป (งานเสร็จแล้ว) — กดยืนยันในแผนคอลแลป';
    ELSE
      IF shared._collab_all_acked(v_conv, v_acks -> 'publish') IS NOT TRUE THEN
        RAISE EXCEPTION 'EVENT_NOT_FOUND';
      END IF;
      v_content := 'ปิดคอลแลปแล้ว — งานเสร็จเรียบร้อย ขอบคุณที่ร่วมงานกัน';
    END IF;

  ELSIF p_event = 'chat_opened' THEN
    -- Opening line of a new hire/collab chat; only while the thread is still empty.
    IF EXISTS (SELECT 1 FROM shared.messages m WHERE m.conversation_id = v_conv.id) THEN
      RETURN NULL;
    END IF;
    IF v_conv.kind = 'hire' THEN
      v_title := left(nullif(btrim(v_conv.project_title), ''), 120);
      SELECT left(nullif(btrim(s.title), ''), 120) INTO v_service FROM anthem.creator_services s WHERE s.id = v_conv.service_id;
      IF v_service IS NOT NULL THEN
        v_content := 'คุยจากบริการ «' || v_service || '»'
          || coalesce(' · จากผลงาน «' || v_title || '»', '') || ' · สนใจใช้แพ็กนี้ อยากคุยรายละเอียด';
      ELSIF v_title IS NOT NULL THEN
        v_content := 'คุยโอกาสจากผลงาน «' || v_title || '» — สนใจงานที่เกี่ยวข้อง';
      ELSE
        v_content := 'เริ่มสนทนางานจ้าง — คุยรายละเอียดได้เลย';
      END IF;
    ELSIF v_conv.kind = 'collab' THEN
      v_content := 'เริ่มสนทนาคอลแลป — คุยไอเดียได้เลย';
    ELSE
      RAISE EXCEPTION 'EVENT_NOT_FOUND';
    END IF;

  ELSE
    RAISE EXCEPTION 'UNKNOWN_EVENT';
  END IF;

  IF v_dedupe THEN
    SELECT m.id INTO v_id FROM shared.messages m
    WHERE m.conversation_id = v_conv.id AND m.message_type = 'system' AND m.content = v_content
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      RETURN v_id;
    END IF;
  END IF;

  INSERT INTO shared.messages (conversation_id, sender_id, content, message_type)
  VALUES (v_conv.id, v_uid, v_content, 'system')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Everyone in the chat (client, freelancer, members) has a key in the given ack map.
CREATE OR REPLACE FUNCTION shared._collab_all_acked(p_conv shared.conversations, p_acks jsonb)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
  SELECT jsonb_typeof(p_acks) = 'object'
     AND NOT EXISTS (
       SELECT 1 FROM (
         SELECT p_conv.client_id AS uid
         UNION SELECT p_conv.freelancer_id
         UNION SELECT m.user_id FROM shared.conversation_members m WHERE m.conversation_id = p_conv.id
       ) u
       WHERE u.uid IS NOT NULL AND NOT (p_acks ? u.uid::text)
     );
$$;

REVOKE ALL ON FUNCTION shared._collab_all_acked(shared.conversations, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.post_chat_system_event(uuid, text, uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_chat_system_event(uuid, text, uuid, text[]) TO authenticated;
