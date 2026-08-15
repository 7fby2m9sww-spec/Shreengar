-- Migration: Extend Support Conversations Table for Contact Form & Add Atomic RPC (Sprint 3.3.6)
BEGIN;

-- 1. Make customer_id nullable so guest visitors can submit Contact inquiries
ALTER TABLE public.support_conversations ALTER COLUMN customer_id DROP NOT NULL;

-- 2. Add reference_number, guest contact fields, and source identifier
ALTER TABLE public.support_conversations
ADD COLUMN IF NOT EXISTS reference_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'support_portal' CHECK (source IN ('support_portal', 'contact_page'));

-- 3. Extend support_messages sender_type CHECK constraint to support 'guest' explicitly
ALTER TABLE public.support_messages DROP CONSTRAINT IF EXISTS support_messages_sender_type_check;
ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_sender_type_check CHECK (sender_type IN ('customer', 'guest', 'admin', 'system'));

-- 4. Clean recreate atomic PostgreSQL RPC (SECURITY INVOKER)
DROP FUNCTION IF EXISTS public.create_contact_support_conversation(
    UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, TEXT
);

CREATE FUNCTION public.create_contact_support_conversation(
    p_customer_id UUID,
    p_guest_name VARCHAR(255),
    p_guest_email VARCHAR(255),
    p_guest_phone VARCHAR(50),
    p_subject VARCHAR(150),
    p_topic VARCHAR(50),
    p_message TEXT,
    p_source VARCHAR(50),
    p_reference_number TEXT
)
RETURNS TABLE (
    conversation_id UUID,
    reference_number TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_conv_id UUID;
    v_now TIMESTAMPTZ := NOW();
    v_sender_type VARCHAR(50);
BEGIN
    -- Input Validation inside transaction
    IF (p_reference_number IS NULL OR LENGTH(TRIM(p_reference_number)) < 10) THEN
        RAISE EXCEPTION 'Reference number is required';
    END IF;

    IF (p_customer_id IS NULL AND (p_guest_name IS NULL OR p_guest_email IS NULL)) THEN
        RAISE EXCEPTION 'Guest inquiries require guest_name and guest_email';
    END IF;

    IF (p_subject IS NULL OR LENGTH(TRIM(p_subject)) < 3 OR LENGTH(p_subject) > 150) THEN
        RAISE EXCEPTION 'Subject must be between 3 and 150 characters';
    END IF;

    IF (p_message IS NULL OR LENGTH(TRIM(p_message)) < 10 OR LENGTH(p_message) > 3000) THEN
        RAISE EXCEPTION 'Message must be between 10 and 3000 characters';
    END IF;

    -- 1. Insert Support Conversation
    INSERT INTO public.support_conversations (
        customer_id,
        guest_name,
        guest_email,
        guest_phone,
        subject,
        topic,
        source,
        reference_number,
        status,
        priority,
        last_message_at,
        customer_last_read_at,
        admin_last_read_at,
        created_at,
        updated_at
    ) VALUES (
        p_customer_id,
        p_guest_name,
        p_guest_email,
        p_guest_phone,
        p_subject,
        COALESCE(p_topic, 'General Inquiry'),
        COALESCE(p_source, 'contact_page'),
        p_reference_number,
        'open',
        'normal',
        v_now,
        v_now, -- Customer read own sent message
        NULL,  -- Admin unread for new inquiry
        v_now,
        v_now
    )
    RETURNING id INTO v_conv_id;

    -- Determine sender_type
    IF p_customer_id IS NOT NULL THEN
        v_sender_type := 'customer';
    ELSE
        v_sender_type := 'guest';
    END IF;

    -- 2. Insert Initial Support Message (Atomic in same transaction)
    INSERT INTO public.support_messages (
        conversation_id,
        sender_type,
        sender_customer_id,
        message,
        is_internal_note,
        created_at,
        updated_at
    ) VALUES (
        v_conv_id,
        v_sender_type,
        p_customer_id,
        p_message,
        FALSE,
        v_now,
        v_now
    );

    RETURN QUERY SELECT v_conv_id, p_reference_number;
END;
$$;

-- 5. Revoke RPC execution from browser roles and grant explicitly to service_role
REVOKE ALL ON FUNCTION public.create_contact_support_conversation(
    UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_contact_support_conversation(
    UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, TEXT
) TO service_role;

COMMIT;
