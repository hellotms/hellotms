-- Track individual payments for expenses (standard/others)
CREATE TABLE IF NOT EXISTS ledger_payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ledger_id uuid REFERENCES ledger_entries(id) ON DELETE CASCADE,
    amount numeric NOT NULL DEFAULT 0,
    payment_date date NOT NULL DEFAULT CURRENT_DATE,
    method text,
    note text,
    created_at timestamptz DEFAULT now(),
    deleted_at timestamptz
);

-- Enable RLS and standard policies
ALTER TABLE ledger_payments ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'ledger_payments' AND policyname = 'Admin full access to ledger_payments'
    ) THEN
        CREATE POLICY "Admin full access to ledger_payments" ON ledger_payments FOR ALL TO authenticated USING (true);
    END IF;
END $$;
