-- Migration: Create Support conversations and messages tables for "Talk to Support"
-- Date: 2026-07-22

-- Seed Support Permission
INSERT INTO public.permissions (name, module, display_name, description, is_system)
VALUES ('support.manage', 'Customers', 'Manage Support', 'Manage customer support conversations and replies', true)
ON CONFLICT (name) DO NOTHING;

-- 1. Create Conversations Table
CREATE TABLE IF NOT EXISTS public.support_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    subject VARCHAR(150) NOT NULL,
    topic VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'waiting_for_customer', 'resolved', 'closed')),
    priority VARCHAR(50) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    customer_last_read_at TIMESTAMPTZ DEFAULT NOW(),
    admin_last_read_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Messages Table
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('customer', 'admin', 'system')),
    sender_customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- 4. Conversations RLS Policies
CREATE POLICY "Customers view own conversations" 
ON public.support_conversations FOR SELECT 
USING (customer_id = auth.uid() OR auth.uid() IN (SELECT id FROM public.admin_users));

CREATE POLICY "Customers insert own conversations" 
ON public.support_conversations FOR INSERT 
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers update own conversations" 
ON public.support_conversations FOR UPDATE 
USING (customer_id = auth.uid() OR auth.uid() IN (SELECT id FROM public.admin_users));

-- 5. Messages RLS Policies
CREATE POLICY "Customers view messages in own conversations" 
ON public.support_messages FOR SELECT 
USING (
    (SELECT customer_id FROM public.support_conversations WHERE id = conversation_id) = auth.uid() 
    OR auth.uid() IN (SELECT id FROM public.admin_users)
);

CREATE POLICY "Customers insert messages in own conversations" 
ON public.support_messages FOR INSERT 
WITH CHECK (
    (SELECT customer_id FROM public.support_conversations WHERE id = conversation_id) = auth.uid()
    AND is_internal_note = FALSE
);

-- 6. Admin general policies
CREATE POLICY "Admins manage all conversations" 
ON public.support_conversations FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.admin_users));

CREATE POLICY "Admins manage all messages" 
ON public.support_messages FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.admin_users));

-- 7. Add Indexes
CREATE INDEX IF NOT EXISTS idx_support_conversations_customer_id ON public.support_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status_last_msg ON public.support_conversations(status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conversations_assigned_status ON public.support_conversations(assigned_admin_id, status);
CREATE INDEX IF NOT EXISTS idx_support_messages_conv_created ON public.support_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_created ON public.support_messages(sender_type, created_at);

-- 8. Add to Realtime Publication (if publication exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
    END IF;
END $$;
