-- Add customer details columns to bills table
ALTER TABLE public.bills 
ADD COLUMN IF NOT EXISTS customer_phone text DEFAULT '',
ADD COLUMN IF NOT EXISTS customer_address text DEFAULT '',
ADD COLUMN IF NOT EXISTS customer_gst_pan text DEFAULT '';