-- Full schema for HVAC AI System

-- Conversations table for chatbot
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inbox replies tracking
CREATE TABLE IF NOT EXISTS public.inbox_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_id text UNIQUE,
  from_email text,
  snippet text,
  classification text,
  processed boolean DEFAULT false,
  auto_reply_sent boolean DEFAULT false,
  received_at timestamptz DEFAULT now()
);

-- Add missing columns to prospects
ALTER TABLE public.prospects 
  ADD COLUMN IF NOT EXISTS last_email_date timestamptz,
  ADD COLUMN IF NOT EXISTS gmail_thread_id text;

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all conversations" ON public.conversations FOR ALL USING (true);
CREATE POLICY "Allow all inbox" ON public.inbox_replies FOR ALL USING (true);
