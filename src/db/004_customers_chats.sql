-- 004_customers_chats.sql
-- Migration to support the Customers & Chats Dashboard UI

-- 1. Create the `customers` table to group chat messages by unique user
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id VARCHAR REFERENCES public.clients(client_id) NOT NULL,
    name VARCHAR,
    phone_number VARCHAR UNIQUE NOT NULL,
    profile_picture_url TEXT,
    total_spend NUMERIC DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: The `conversations` table already exists but functions as a `messages` table 
-- (it holds raw ycloud_message_id and text_body per row).
-- To support the UI, we just need to link existing conversations to the new customer grouping.

ALTER TABLE public.conversations 
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Enable RLS for Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for customers" ON public.customers 
AS PERMISSIVE FOR ALL TO public 
USING (true) WITH CHECK (true);
