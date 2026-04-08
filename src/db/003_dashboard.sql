-- Migration 003: Dashboard Tracking, Subscriptions, and Chat Override overrides

-- 1. Modifying existing products table for threshold alerts
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS low_stock_alert_limit INTEGER DEFAULT 5;

-- 2. New Table: active_chats (For Per-Customer Human Override)
CREATE TABLE IF NOT EXISTS public.active_chats (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    is_human_override BOOLEAN DEFAULT FALSE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (client_id, customer_phone)
);
CREATE INDEX idx_active_chats_client ON public.active_chats(client_id);

-- 3. New Table: event_logs
CREATE TABLE IF NOT EXISTS public.event_logs (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT NOT NULL,
    log_level TEXT NOT NULL,  -- "error" | "warn" | "info" | "debug"
    category TEXT NOT NULL,   -- "webhook" | "ai" | "payment" | "reservation" | "kyc" | "security" | "system"
    event_name TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    duration_ms INTEGER,
    is_debug BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_event_logs_client ON public.event_logs(client_id, created_at DESC);
CREATE INDEX idx_event_logs_level ON public.event_logs(client_id, log_level, created_at DESC);
CREATE INDEX idx_event_logs_category ON public.event_logs(client_id, category, created_at DESC);

-- 4. New Table: api_usage_tracking
CREATE TABLE IF NOT EXISTS public.api_usage_tracking (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT NOT NULL,
    api_provider TEXT NOT NULL,  -- "groq" | "ycloud" | "cashfree" | "supabase"
    api_endpoint TEXT,
    tokens_input INTEGER,
    tokens_output INTEGER,
    cost_usd DECIMAL(10,6),
    cost_inr DECIMAL(10,4),
    response_ms INTEGER,
    success BOOLEAN,
    error_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_api_usage_client ON public.api_usage_tracking(client_id, created_at DESC);
CREATE INDEX idx_api_usage_provider ON public.api_usage_tracking(client_id, api_provider, created_at DESC);

-- 5. New Table: daily_client_stats
CREATE TABLE IF NOT EXISTS public.daily_client_stats (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT NOT NULL,
    stat_date DATE NOT NULL,
    total_revenue_inr DECIMAL(12,2) DEFAULT 0,
    orders_completed INTEGER DEFAULT 0,
    orders_expired INTEGER DEFAULT 0,
    orders_failed INTEGER DEFAULT 0,
    avg_order_value_inr DECIMAL(10,2) DEFAULT 0,
    total_inquiries INTEGER DEFAULT 0,
    reached_reservation INTEGER DEFAULT 0,
    reached_payment INTEGER DEFAULT 0,
    conversion_rate_pct DECIMAL(5,2) DEFAULT 0,
    ai_calls_total INTEGER DEFAULT 0,
    ai_tokens_total INTEGER DEFAULT 0,
    ai_cost_usd DECIMAL(10,6) DEFAULT 0,
    ai_avg_latency_ms INTEGER DEFAULT 0,
    ai_errors INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    whatsapp_cost_inr DECIMAL(10,4) DEFAULT 0,
    unique_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_daily_stats_unique ON public.daily_client_stats(client_id, stat_date);

-- 6. New Table: system_health
CREATE TABLE IF NOT EXISTS public.system_health (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT,
    service_name TEXT NOT NULL, -- "redis" | "groq" | "ycloud" | "cashfree" | "bot_webhook" | "postgres"
    status TEXT NOT NULL, -- "healthy" | "degraded" | "down"
    latency_ms INTEGER,
    error_msg TEXT,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_health_service ON public.system_health(service_name, checked_at DESC);
CREATE INDEX idx_health_client ON public.system_health(client_id, checked_at DESC);

-- 7. New Table: staff_members
CREATE TABLE IF NOT EXISTS public.staff_members (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT NOT NULL,
    supabase_user_id UUID REFERENCES auth.users(id),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'staff',  -- "owner" | "staff"
    is_active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_staff_user ON public.staff_members(supabase_user_id);
CREATE INDEX idx_staff_client ON public.staff_members(client_id);

-- 8. New Table: debug_mode_sessions
CREATE TABLE IF NOT EXISTS public.debug_mode_sessions (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT NOT NULL UNIQUE,
    enabled_by TEXT NOT NULL,
    enabled_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    notes TEXT
);

-- 9. Row Level Security Setup
-- Enable RLS on all clients-owned tables (so the dashboard is secure)
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_client_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Note: In Supabase, creating an RLS policy using `auth.uid()` tied to a mapping table (`staff_members`) 
-- ensures that standard frontend requests strictly filter rows to the user's `client_id`.
-- (Actual policies will be refined inside the dashboard project initialization phase).
