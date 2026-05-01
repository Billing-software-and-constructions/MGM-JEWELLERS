-- Refactored MGM Jewellers Migration Script
-- Consolidates all schema changes into a single idempotent script.
-- Author: Antigravity (Db Migration Specialist)

-- 1. Setup Functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- 2. Create Tables (Dependency Order)

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gold_rate REAL NOT NULL DEFAULT 10000,
  silver_rate REAL NOT NULL DEFAULT 7000,
  gst_rate REAL DEFAULT 3,
  last_invoice_number INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subcategories Table
CREATE TABLE IF NOT EXISTS public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  seikuli_rate REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Bills Table
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  customer_gst_pan TEXT DEFAULT '',
  gold_rate REAL NOT NULL,
  gst_percentage REAL NOT NULL,
  subtotal REAL NOT NULL,
  gst_amount REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  grand_total REAL NOT NULL,
  invoice_number TEXT,
  credited_amount REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bill Items Table
CREATE TABLE IF NOT EXISTS public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  subcategory_name TEXT DEFAULT '',
  weight REAL NOT NULL,
  gold_amount REAL NOT NULL,
  seikuli_amount REAL NOT NULL,
  seikuli_rate REAL NOT NULL,
  total REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Old Exchanges Table
CREATE TABLE IF NOT EXISTS public.old_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  customer_gst_pan TEXT DEFAULT '',
  category_id UUID NOT NULL REFERENCES public.categories(id),
  category_name TEXT NOT NULL,
  subcategory_id UUID REFERENCES public.subcategories(id),
  subcategory_name TEXT,
  initial_weight REAL NOT NULL,
  final_weight REAL NOT NULL,
  metal_rate REAL NOT NULL,
  exchange_value REAL NOT NULL,
  exchange_type TEXT NOT NULL CHECK (exchange_type IN ('cash', 'ornaments')),
  invoice_number TEXT,
  credited_amount REAL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Indexes
CREATE INDEX IF NOT EXISTS idx_bills_invoice_number ON public.bills(invoice_number);

-- 4. Attach Triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_settings_updated_at') THEN
    CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_categories_updated_at') THEN
    CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subcategories_updated_at') THEN
    CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_old_exchanges_updated_at') THEN
    CREATE TRIGGER update_old_exchanges_updated_at BEFORE UPDATE ON public.old_exchanges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 5. Seed Initial Data (Only if empty)

-- Default User (mgm/mgm123)
INSERT INTO public.users (username, password)
SELECT 'mgm', 'mgm123'
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE username = 'mgm');

-- Default Settings
INSERT INTO public.settings (gold_rate, silver_rate, gst_rate, last_invoice_number)
SELECT 10000, 7000, 3, 0
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- Sample Categories
INSERT INTO public.categories (name)
SELECT name FROM (VALUES ('Chains'), ('Rings'), ('Bangles'), ('Earrings')) AS t(name)
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = t.name);

-- Sample Subcategories
INSERT INTO public.subcategories (category_id, name, seikuli_rate)
SELECT c.id, s.name, s.rate
FROM (VALUES 
  ('Chains', 'Gold Chain', 700),
  ('Chains', 'Silver Chain', 300),
  ('Rings', 'Diamond Ring', 1200),
  ('Rings', 'Gold Ring', 800)
) AS s(cat_name, name, rate)
JOIN public.categories c ON c.name = s.cat_name
WHERE NOT EXISTS (SELECT 1 FROM public.subcategories WHERE category_id = c.id AND name = s.name);

-- 6. Optional: Row Level Security (RLS)
-- Uncomment if needed for Neon direct access security
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.old_exchanges ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Allow public access" ON public.settings FOR ALL USING (true);
-- CREATE POLICY "Allow public access" ON public.categories FOR ALL USING (true);
-- CREATE POLICY "Allow public access" ON public.subcategories FOR ALL USING (true);
-- CREATE POLICY "Allow public access" ON public.bills FOR ALL USING (true);
-- CREATE POLICY "Allow public access" ON public.bill_items FOR ALL USING (true);
-- CREATE POLICY "Allow public access" ON public.old_exchanges FOR ALL USING (true);
-- CREATE POLICY "Allow public access" ON public.users FOR SELECT USING (true);
