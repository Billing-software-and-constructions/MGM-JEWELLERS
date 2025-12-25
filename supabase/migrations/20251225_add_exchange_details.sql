-- Add missing columns to old_exchanges table for proper bill reprinting
ALTER TABLE public.old_exchanges 
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_address TEXT,
ADD COLUMN IF NOT EXISTS customer_gst_pan TEXT,
ADD COLUMN IF NOT EXISTS credited_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_number TEXT;
