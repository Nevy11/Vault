-- Seed data for Vault Application
-- This script populates the new tables with sample data for demonstration.

-- 1. Identify a user (assuming the first user in auth.users)
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- 2. Seed Sub-Accounts
        INSERT INTO public.sub_accounts (user_id, name, balance, currency, icon_type)
        VALUES 
            (v_user_id, 'Vault Trade', 12400.50, 'KES', '📈'),
            (v_user_id, 'Fixed Yield', 50000.00, 'KES', '🏦'),
            (v_user_id, 'Emergency Fund', 2500.00, 'KES', '🚨'),
            (v_user_id, 'Crypto Lock', 0.45, 'BTC', '₿')
        ON CONFLICT (user_id, name) DO NOTHING;

        -- 3. Seed Ledger Entries (with dummy signatures)
        -- In a real app, these signatures must be valid HMACs.
        INSERT INTO public.ledger_entries (user_id, type, amount, description, cryptographic_signature)
        VALUES 
            (v_user_id, 'INFLOW', 1000.00, 'Initial Deposit', 'seed_sig_1'),
            (v_user_id, 'INFLOW', 500.00, 'M-Pesa Transfer', 'seed_sig_2'),
            (v_user_id, 'OUTFLOW', 200.00, 'Vendor Payment', 'seed_sig_3'),
            (v_user_id, 'INFLOW', 1500.00, 'Salary Credit', 'seed_sig_4')
        ON CONFLICT DO NOTHING;

        -- 4. Seed M-PESA Transactions
        INSERT INTO public.mpesa_transactions (user_id, merchant_request_id, checkout_request_id, mpesa_receipt_number, amount, phone_number, status, result_desc)
        VALUES 
            (v_user_id, 'mreq_1', 'creq_1', 'R123456789', 500.00, '254712345678', 'SUCCESS', 'The service request is processed successfully.'),
            (v_user_id, 'mreq_2', 'creq_2', NULL, 1000.00, '254712345678', 'PENDING', 'Request accepted for processing'),
            (v_user_id, 'mreq_3', 'creq_3', NULL, 250.00, '254712345678', 'FAILED', 'The initiator information is invalid.')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
