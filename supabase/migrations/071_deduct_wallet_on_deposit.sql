-- Migration: Deduct from Wallet on Joint Deposit
-- Description: Updates the contribution trigger to deduct funds from the user's personal wallet when depositing to a joint pot.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_pot_balance_on_contribution()
RETURNS TRIGGER AS $$
DECLARE
    v_user_wallet_id UUID;
    v_pot_title TEXT;
BEGIN
    -- 1. Update the Pot Balance
    IF NEW.type = 'deposit' THEN
        UPDATE joint_pots
        SET balance = balance + NEW.amount,
            updated_at = now()
        WHERE id = NEW.pot_id;
        
        -- 2. Deduct from User's Personal Wallet
        SELECT id INTO v_user_wallet_id
        FROM wallets
        WHERE user_id = NEW.user_id
        LIMIT 1;

        IF v_user_wallet_id IS NOT NULL THEN
            UPDATE wallets
            SET balance = balance - NEW.amount,
                updated_at = now()
            WHERE id = v_user_wallet_id;
            
            -- Get pot title for transaction record
            SELECT title INTO v_pot_title FROM joint_pots WHERE id = NEW.pot_id;
            
            -- 3. Log as a withdrawal in personal transaction history
            INSERT INTO transactions (sender_id, type, method, amount, status, description)
            VALUES (NEW.user_id, 'withdrawal', 'vault', NEW.amount, 'completed', 'Deposit to Joint Pot: ' || v_pot_title);
        END IF;

    ELSIF NEW.type = 'withdrawal' THEN
        UPDATE joint_pots
        SET balance = balance - NEW.amount,
            updated_at = now()
        WHERE id = NEW.pot_id;
        
        -- Note: Payout to wallet is handled by handle_withdrawal_approval() 
        -- when the request is fully approved.
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
