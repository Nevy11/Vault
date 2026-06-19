-- Migration: Add Balance After to Pot Contributions
-- Description: Adds a column to track the pot balance after each contribution (running total).

BEGIN;

-- 1. Add the column
ALTER TABLE public.pot_contributions 
ADD COLUMN IF NOT EXISTS balance_after NUMERIC(15, 2);

-- 2. Update the trigger function to record the balance after update
CREATE OR REPLACE FUNCTION public.update_pot_balance_on_contribution()
RETURNS TRIGGER AS $$
DECLARE
    v_user_wallet_id UUID;
    v_pot_title TEXT;
    v_new_pot_balance NUMERIC(15, 2);
BEGIN
    -- 1. Calculate and update the Pot Balance
    IF NEW.type = 'deposit' THEN
        UPDATE joint_pots
        SET balance = balance + NEW.amount,
            updated_at = now()
        WHERE id = NEW.pot_id
        RETURNING balance INTO v_new_pot_balance;
        
        -- 2. Deduct from User's Personal Wallet
        SELECT id INTO v_user_wallet_id FROM wallets WHERE user_id = NEW.user_id LIMIT 1;
        IF v_user_wallet_id IS NOT NULL THEN
            UPDATE wallets SET balance = balance - NEW.amount WHERE id = v_user_wallet_id;
            SELECT title INTO v_pot_title FROM joint_pots WHERE id = NEW.pot_id;
            INSERT INTO transactions (sender_id, type, method, amount, status, description)
            VALUES (NEW.user_id, 'withdrawal', 'vault', NEW.amount, 'completed', 'Deposit to Joint Pot: ' || v_pot_title);
        END IF;

    ELSIF NEW.type = 'withdrawal' THEN
        UPDATE joint_pots
        SET balance = balance - NEW.amount,
            updated_at = now()
        WHERE id = NEW.pot_id
        RETURNING balance INTO v_new_pot_balance;
    END IF;
    
    -- 3. Record the resulting balance in the contribution record itself
    -- This creates the "Running Balance" history
    NEW.balance_after := v_new_pot_balance;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
