-- Migration: Automate Withdrawal Payout to Wallet
-- Description: Updates the withdrawal approval trigger to credit the user's personal wallet when fully approved.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_withdrawal_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_member_count INTEGER;
    v_approval_count INTEGER;
    v_pot_id UUID;
    v_amount DECIMAL(15, 2);
    v_requester_id UUID;
    v_requester_wallet_id UUID;
BEGIN
    -- Get pot_id, amount, and requester from the request
    SELECT pot_id, amount, requester_id INTO v_pot_id, v_amount, v_requester_id
    FROM pot_withdrawal_requests
    WHERE id = NEW.request_id;

    -- Count active members in the pot
    SELECT COUNT(*) INTO v_member_count
    FROM pot_members
    WHERE pot_id = v_pot_id AND status = 'active';

    -- Update approvals_count on the request
    SELECT COUNT(*) INTO v_approval_count
    FROM pot_withdrawal_approvals
    WHERE request_id = NEW.request_id AND status = 'approved';

    UPDATE pot_withdrawal_requests
    SET approvals_count = v_approval_count,
        updated_at = now()
    WHERE id = NEW.request_id;

    -- If all members have approved, execute the withdrawal
    IF v_approval_count >= v_member_count THEN
        -- 1. Mark request as executed
        UPDATE pot_withdrawal_requests
        SET status = 'executed',
            updated_at = now()
        WHERE id = NEW.request_id;

        -- 2. Create a contribution record for the withdrawal (this trigger handles pot balance deduction)
        INSERT INTO pot_contributions (pot_id, user_id, amount, type)
        VALUES (v_pot_id, v_requester_id, v_amount, 'withdrawal');

        -- 3. Payout to User's Wallet
        -- Find the user's primary wallet
        SELECT id INTO v_requester_wallet_id
        FROM wallets
        WHERE user_id = v_requester_id
        LIMIT 1;

        IF v_requester_wallet_id IS NOT NULL THEN
            UPDATE wallets
            SET balance = balance + v_amount,
                updated_at = now()
            WHERE id = v_requester_wallet_id;
            
            -- Log this as a transaction for the wallet history
            INSERT INTO transactions (receiver_id, type, method, amount, status, description)
            VALUES (v_requester_id, 'deposit', 'vault', v_amount, 'completed', 'Withdrawal from Joint Pot: ' || (SELECT title FROM joint_pots WHERE id = v_pot_id));
        END IF;
        
        -- 4. Notify requester
        INSERT INTO notifications (user_id, title, message, type, metadata)
        VALUES (
            v_requester_id,
            'Withdrawal Approved!',
            'Your request for KES ' || v_amount || ' has been fully approved and credited to your wallet.',
            'success',
            jsonb_build_object('pot_id', v_pot_id, 'type', 'payout')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
