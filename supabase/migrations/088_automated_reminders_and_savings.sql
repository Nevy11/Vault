-- Migration: Automated Reminders and Savings Process

-- 1. Add metadata to notifications for tracking
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 2. Create function to process 3-day reminders and automated savings
CREATE OR REPLACE FUNCTION public.process_recurring_reminders_and_savings()
RETURNS jsonb AS $$
DECLARE
    v_loan RECORD;
    v_goal RECORD;
    v_reminders_count INTEGER := 0;
    v_savings_count INTEGER := 0;
    v_last_reminder TIMESTAMP WITH TIME ZONE;
BEGIN
    -- A. Process Loan Reminders (Every 3 Days)
    FOR v_loan IN SELECT * FROM public.loans WHERE status = 'active' LOOP
        -- Check last reminder for this specific loan
        SELECT created_at INTO v_last_reminder
        FROM public.notifications
        WHERE user_id = v_loan.user_id 
          AND title = 'Loan Repayment Reminder' 
          AND (metadata->>'loan_id')::uuid = v_loan.id
        ORDER BY created_at DESC LIMIT 1;

        IF v_last_reminder IS NULL OR v_last_reminder <= NOW() - INTERVAL '3 days' THEN
            INSERT INTO public.notifications (user_id, title, message, type, metadata)
            VALUES (
                v_loan.user_id,
                'Loan Repayment Reminder',
                'You have KES ' || v_loan.remaining_balance || ' left on your loan. Continue to pay it will increase your limit and trust score!',
                'warning',
                jsonb_build_object('loan_id', v_loan.id)
            );
            v_reminders_count := v_reminders_count + 1;
        END IF;
    END LOOP;

    -- B. Process Savings Reminders (Every 3 Days)
    FOR v_goal IN SELECT * FROM public.savings_goals WHERE status = 'active' LOOP
        -- Check last reminder for this specific goal
        SELECT created_at INTO v_last_reminder
        FROM public.notifications
        WHERE user_id = v_goal.user_id 
          AND title = 'Savings Progress Reminder' 
          AND (metadata->>'goal_id')::uuid = v_goal.id
        ORDER BY created_at DESC LIMIT 1;

        IF v_last_reminder IS NULL OR v_last_reminder <= NOW() - INTERVAL '3 days' THEN
            INSERT INTO public.notifications (user_id, title, message, type, metadata)
            VALUES (
                v_goal.user_id,
                'Savings Progress Reminder',
                'You are at ' || ROUND((v_goal.current_amount / v_goal.target_amount) * 100) || '% of your ' || v_goal.title || ' goal. Continue saving to hit your target and earn rewards!',
                'info',
                jsonb_build_object('goal_id', v_goal.id)
            );
            v_reminders_count := v_reminders_count + 1;
        END IF;
    END LOOP;

    -- C. Process Automated Savings (Deduction from Wallet)
    FOR v_goal IN SELECT * FROM public.savings_goals WHERE status = 'active' AND is_automated = true LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.savings_ledger 
            WHERE goal_id = v_goal.id 
              AND type = 'automated' 
              AND created_at > (
                CASE 
                    WHEN v_goal.automation_frequency = 'daily' THEN NOW() - INTERVAL '1 day'
                    WHEN v_goal.automation_frequency = 'weekly' THEN NOW() - INTERVAL '7 days'
                    WHEN v_goal.automation_frequency = 'monthly' THEN NOW() - INTERVAL '1 month'
                    ELSE NOW() - INTERVAL '7 days'
                END
              )
        ) THEN
            DECLARE
                v_wallet_id UUID;
                v_balance NUMERIC;
            BEGIN
                SELECT id, balance INTO v_wallet_id, v_balance FROM public.wallets WHERE user_id = v_goal.user_id;

                IF v_balance >= v_goal.automation_amount THEN
                    -- 1. Deduct from wallet
                    UPDATE public.wallets SET balance = balance - v_goal.automation_amount WHERE id = v_wallet_id;

                    -- 2. Add to savings goal
                    UPDATE public.savings_goals SET current_amount = current_amount + v_goal.automation_amount WHERE id = v_goal.id;

                    -- 3. Record in transactions ledger
                    INSERT INTO public.transactions (sender_id, type, method, amount, status, description)
                    VALUES (v_goal.user_id, 'withdrawal', 'savings', v_goal.automation_amount, 'completed', 'Automated Saving: ' || v_goal.title);

                    -- 4. Record in savings ledger
                    INSERT INTO public.savings_ledger (goal_id, user_id, amount, source, type, running_total)
                    VALUES (v_goal.id, v_goal.user_id, v_goal.automation_amount, 'Vault Account', 'automated', v_goal.current_amount + v_goal.automation_amount);

                    -- 5. Send notification
                    INSERT INTO public.notifications (user_id, title, message, type, metadata)
                    VALUES (
                        v_goal.user_id,
                        'Automated Saving Processed',
                        'KES ' || v_goal.automation_amount || ' has been automatically saved for your ' || v_goal.title || ' goal.',
                        'success',
                        jsonb_build_object('goal_id', v_goal.id)
                    );

                    v_savings_count := v_savings_count + 1;
                ELSE
                    -- Insufficient balance warning
                    INSERT INTO public.notifications (user_id, title, message, type, metadata)
                    VALUES (
                        v_goal.user_id,
                        'Automated Saving Failed',
                        'We couldn''t process your automated saving of KES ' || v_goal.automation_amount || ' for ' || v_goal.title || ' due to insufficient balance.',
                        'error',
                        jsonb_build_object('goal_id', v_goal.id)
                    );
                END IF;
            END;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'reminders_sent', v_reminders_count,
        'automated_savings_processed', v_savings_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger on Login to run this check
CREATE OR REPLACE FUNCTION public.trigger_recurring_tasks()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.action_type = 'login' THEN
        PERFORM public.process_recurring_reminders_and_savings();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_login_recurring_tasks ON public.activity_logs;
CREATE TRIGGER on_login_recurring_tasks
    AFTER INSERT ON public.activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_recurring_tasks();
