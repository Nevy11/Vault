-- Fix Joint Savings Withdrawal Approval Logic
-- 1. Auto-approve for the requester when a new request is created
CREATE OR REPLACE FUNCTION auto_approve_withdrawal_requester()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO pot_withdrawal_approvals (request_id, user_id, status)
    VALUES (NEW.id, NEW.requester_id, 'approved');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_withdrawal_request_created ON pot_withdrawal_requests;
CREATE TRIGGER on_withdrawal_request_created
    AFTER INSERT ON pot_withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION auto_approve_withdrawal_requester();

-- 2. Update handle_withdrawal_approval to be more descriptive and handle the status transition
CREATE OR REPLACE FUNCTION handle_withdrawal_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_member_count INTEGER;
    v_approval_count INTEGER;
    v_pot_id UUID;
    v_amount DECIMAL(15, 2);
    v_requester_id UUID;
    v_current_status TEXT;
BEGIN
    -- Get pot_id, amount, requester_id and current status from the request
    SELECT pot_id, amount, requester_id, status 
    INTO v_pot_id, v_amount, v_requester_id, v_current_status
    FROM pot_withdrawal_requests
    WHERE id = NEW.request_id;

    -- If it's already executed or rejected, don't do anything
    IF v_current_status IN ('executed', 'rejected') THEN
        RETURN NEW;
    END IF;

    -- Count active members in the pot
    SELECT COUNT(*) INTO v_member_count
    FROM pot_members
    WHERE pot_id = v_pot_id AND status = 'active';

    -- Count current approvals
    SELECT COUNT(*) INTO v_approval_count
    FROM pot_withdrawal_approvals
    WHERE request_id = NEW.request_id AND status = 'approved';

    -- Update approvals_count on the request
    UPDATE pot_withdrawal_requests
    SET approvals_count = v_approval_count,
        updated_at = now()
    WHERE id = NEW.request_id;

    -- If all members have approved, mark as approved then execute
    IF v_approval_count >= v_member_count THEN
        -- First mark as approved
        UPDATE pot_withdrawal_requests
        SET status = 'approved',
            updated_at = now()
        WHERE id = NEW.request_id;

        -- Then execute the withdrawal (deduct from balance)
        -- We check if it's already been recorded as a contribution to avoid double-deduction
        IF NOT EXISTS (
            SELECT 1 FROM pot_contributions 
            WHERE pot_id = v_pot_id 
            AND user_id = v_requester_id 
            AND amount = v_amount 
            AND type = 'withdrawal'
            AND created_at > now() - interval '10 seconds' -- Basic idempotency check
        ) THEN
            -- Update status to executed
            UPDATE pot_withdrawal_requests
            SET status = 'executed',
                updated_at = now()
            WHERE id = NEW.request_id;

            -- Create a contribution record for the withdrawal to update balance
            INSERT INTO pot_contributions (pot_id, user_id, amount, type)
            VALUES (v_pot_id, v_requester_id, v_amount, 'withdrawal');
            
            -- Notify the requester that it was executed
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                v_requester_id,
                'Withdrawal Executed',
                'Your withdrawal request for KES ' || v_amount || ' has been approved by all members and executed.',
                'success'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update pot_contributions to calculate balance_after automatically
CREATE OR REPLACE FUNCTION update_pot_balance_on_contribution()
RETURNS TRIGGER AS $$
DECLARE
    v_new_balance DECIMAL(15, 2);
BEGIN
    -- Update the pot balance and return the new balance in one step
    IF NEW.type = 'deposit' THEN
        UPDATE joint_pots
        SET balance = balance + NEW.amount,
            updated_at = now()
        WHERE id = NEW.pot_id
        RETURNING balance INTO v_new_balance;
    ELSIF NEW.type = 'withdrawal' THEN
        UPDATE joint_pots
        SET balance = balance - NEW.amount,
            updated_at = now()
        WHERE id = NEW.pot_id
        RETURNING balance INTO v_new_balance;
    END IF;
    
    -- Set the balance_after on the contribution record
    NEW.balance_after := v_new_balance;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is BEFORE INSERT to allow setting NEW.balance_after
DROP TRIGGER IF EXISTS on_pot_contribution ON pot_contributions;
CREATE TRIGGER on_pot_contribution
    BEFORE INSERT ON pot_contributions
    FOR EACH ROW EXECUTE FUNCTION update_pot_balance_on_contribution();
