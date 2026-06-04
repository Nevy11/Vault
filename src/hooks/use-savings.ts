import { useState, useEffect } from "react";
import { supabase } from "@/api/supabase";
import { toast } from "sonner";

export type SavingsGoal = {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  start_date: string;
  deadline_date: string;
  funding_source: string | null;
  is_automated: boolean;
  automation_frequency: string | null;
  automation_amount: number | null;
  automation_provider: string | null;
  status: "active" | "completed" | "missed";
  created_at: string;
  updated_at: string;
  lockUntil?: string | null;
};

export type SavingsLedgerEntry = {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  source: string;
  type: "manual" | "automated";
  running_total: number;
  created_at: string;
};

export function useSavings() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [selectedGoalIndex, setSelectedGoalIndex] = useState(0);
  const [ledger, setLedger] = useState<SavingsLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const goal = goals[selectedGoalIndex] || null;

  const fetchSavingsData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all active goals
      const { data: goalsData, error: goalsError } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: true });

      if (goalsError) throw goalsError;
      setGoals(goalsData || []);

      const activeGoal = goalsData?.[selectedGoalIndex];

      if (activeGoal) {
        // Fetch ledger entries for this goal
        const { data: ledgerData, error: ledgerError } = await supabase
          .from("savings_ledger")
          .select("*")
          .eq("goal_id", activeGoal.id)
          .order("created_at", { ascending: false });

        if (ledgerError) throw ledgerError;
        setLedger(ledgerData || []);
      } else {
        setLedger([]);
      }
    } catch (error) {
      console.error("Error fetching savings data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavingsData();

    // Subscribe to changes
    const goalChannel = supabase
      .channel("savings_goals_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "savings_goals" }, () => {
        fetchSavingsData();
      })
      .subscribe();

    const ledgerChannel = supabase
      .channel("savings_ledger_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "savings_ledger" }, () => {
        fetchSavingsData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(goalChannel);
      supabase.removeChannel(ledgerChannel);
    };
  }, [selectedGoalIndex]);

  const addContribution = async (amount: number, source: string, type: "manual" | "automated") => {
    if (!goal) {
      toast.error("No active savings goal found");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Handle Vault Balance source
      if (source === "vault_balance") {
        // 1. Fetch current wallet balance and currency
        const { data: wallet, error: walletError } = await supabase
          .from("wallets")
          .select("balance, id, currency")
          .eq("user_id", user.id)
          .single();

        if (walletError || !wallet) {
          toast.error("Could not find your Vault wallet");
          return;
        }

        const walletCurrency = wallet.currency || "USD";
        const KES_USD_RATE = 130.0;

        // Convert contribution amount (which is in KES/KSH) to wallet currency if needed
        let amountInWalletCurrency = amount;
        if (walletCurrency === "USD") {
          amountInWalletCurrency = Number((amount / KES_USD_RATE).toFixed(2));
        }

        if (Number(wallet.balance) < amountInWalletCurrency) {
          const displayBalance =
            walletCurrency === "USD"
              ? `KES ${(Number(wallet.balance) * KES_USD_RATE).toLocaleString()}`
              : `KES ${Number(wallet.balance).toLocaleString()}`;

          toast.error("Insufficient Vault balance", {
            description: `You have ${displayBalance} but tried to save KES ${amount.toLocaleString()}`,
          });
          return;
        }

        const newWalletBalance = Number(wallet.balance) - amountInWalletCurrency;

        // 2. Deduct from wallet
        const { error: deductError } = await supabase
          .from("wallets")
          .update({
            balance: newWalletBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", wallet.id);

        if (deductError) throw deductError;

        // 3. Log into transactions table
        const { error: txError } = await supabase.from("transactions").insert({
          sender_id: user.id,
          receiver_id: null, // Self-transfer to savings
          type: "transfer",
          method: "vault",
          amount: amountInWalletCurrency, // Store amount in wallet currency
          status: "completed",
          description: "Transferred to savings",
          balance_after: newWalletBalance,
        });

        if (txError) throw txError;
      }

      const newCurrentAmount = Number(goal.current_amount) + Number(amount);

      // 4. Insert into savings_ledger (Always keep ledger in goal's native currency KES)
      const { error: ledgerError } = await supabase.from("savings_ledger").insert({
        goal_id: goal.id,
        user_id: user.id,
        amount,
        source: source === "vault_balance" ? "Vault" : source,
        type,
        running_total: newCurrentAmount,
      });

      if (ledgerError) throw ledgerError;

      // 5. Update savings_goals current_amount
      const { error: goalUpdateError } = await supabase
        .from("savings_goals")
        .update({ current_amount: newCurrentAmount })
        .eq("id", goal.id);

      if (goalUpdateError) throw goalUpdateError;

      toast.success("Contribution added successfully!");
      fetchSavingsData();
    } catch (error: any) {
      toast.error("Error adding contribution: " + error.message);
    }
  };

  const createGoal = async (goalData: Partial<SavingsGoal>) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      // Check for maximum 2 goals
      if (goals.length >= 2) {
        toast.error("Maximum limit reached", {
          description: "You can only have a maximum of 2 active savings goals at a time.",
          className: "bg-red-50 border-red-200 text-red-900",
        });
        return false;
      }

      const { data, error } = await supabase
        .from("savings_goals")
        .insert({
          ...goalData,
          user_id: user.id,
          status: "active",
          current_amount: 0,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Savings goal created!");
      fetchSavingsData();
      return true;
    } catch (error: any) {
      toast.error("Error creating goal: " + error.message);
      return false;
    }
  };

  const updateGoal = async (id: string, goalData: Partial<SavingsGoal>) => {
    try {
      const { error } = await supabase.from("savings_goals").update(goalData).eq("id", id);

      if (error) throw error;
      toast.success("Savings goal updated!");
      fetchSavingsData();
      return true;
    } catch (error: any) {
      toast.error("Error updating goal: " + error.message);
      return false;
    }
  };

  return {
    goals,
    goal,
    selectedGoalIndex,
    setSelectedGoalIndex,
    ledger,
    loading,
    addContribution,
    createGoal,
    updateGoal,
    refetch: fetchSavingsData,
  };
}
