-- 005_invoices.sql
-- Migration to support the Billing & Invoices Dashboard UI

-- 1. Create the `invoices` table
CREATE TABLE IF NOT EXISTS public.invoices (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR REFERENCES public.clients(client_id) NOT NULL,
    invoice_number VARCHAR UNIQUE NOT NULL,
    customer_name VARCHAR NOT NULL,
    customer_phone VARCHAR,
    customer_email VARCHAR,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR NOT NULL DEFAULT 'generated'
        CHECK (status IN ('generated', 'sent', 'paid', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 3. Permissive dev policy
CREATE POLICY "Enable all for invoices" ON public.invoices
AS PERMISSIVE FOR ALL TO public
USING (true) WITH CHECK (true);

-- 4. Helper function to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number(p_client_id VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    next_seq INTEGER;
    year_str VARCHAR;
BEGIN
    year_str := EXTRACT(YEAR FROM NOW())::VARCHAR;
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)
    ), 0) + 1
    INTO next_seq
    FROM public.invoices
    WHERE client_id = p_client_id
      AND invoice_number LIKE 'INV-' || year_str || '-%';
    RETURN 'INV-' || year_str || '-' || LPAD(next_seq::VARCHAR, 3, '0');
END;
$$ LANGUAGE plpgsql;
