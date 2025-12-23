-- Reset last_invoice_number to 0 so the next invoice will be 1
UPDATE settings SET last_invoice_number = 0;