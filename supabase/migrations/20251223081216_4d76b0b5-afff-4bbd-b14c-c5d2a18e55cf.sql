-- Add credited_amount to bills table for cash amount tracking
ALTER TABLE public.bills 
ADD COLUMN IF NOT EXISTS credited_amount numeric DEFAULT 0;

-- Add subcategory_name to bill_items table
ALTER TABLE public.bill_items 
ADD COLUMN IF NOT EXISTS subcategory_name text DEFAULT '';