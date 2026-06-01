import { useState, useEffect } from "react";
import { supabase } from "@/api/supabase";
import { toast } from "sonner";

interface PortfolioSummary {
  message: string;
  growthPercentage: number;
  trend: "positive" | "neutral" | "negative";
  loading: boolean;
  error: string | null;
}

/**
 * Hook: usePortfolioSummary
 * Generates a progress-based portfolio message showing growth and improvement
 */
export function usePortfolioSummary(userId: string | null | undefined): PortfolioSummary {
  const [summary, setSummary] = useState<PortfolioSummary>({
    message: "Your portfolio is performing well this month. You're building your wealth steadily.",
    growthPercentage: 0,
    trend: "positive",
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!userId) {
      setSummary((prev) => ({ ...prev, loading: false }));
      return;
    }

    const generateSummary = async () => {
      try {
        setSummary((prev) => ({ ...prev, loading: true, error: null }));

        // 1. Get the user's wallets first to get all wallet_ids
        const { data: wallets, error: walletError } = await supabase
          .from("wallets")
          .select("id")
          .eq("user_id", userId);

        if (walletError) throw walletError;
        if (!wallets || wallets.length === 0) {
          setSummary((prev) => ({ ...prev, loading: false }));
          return;
        }

        const walletIds = wallets.map(w => w.id);

        // Fetch balance history for the last 60 days
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // First, get the wallet_id for this user
        const { data: walletData, error: walletError } = await supabase
          .from("wallets")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (walletError) throw walletError;

        if (!walletData) {
          setSummary((prev) => ({
            ...prev,
            loading: false,
            message: "Welcome to Vault! Start making transactions to see your growth summary.",
          }));
          return;
        }

        const { data: balanceHistory, error: historyError } = await supabase
          .from("balance_history")
          .select("recorded_balance, recorded_at")
          .eq("wallet_id", walletData.id)
          .gte("recorded_at", sixtyDaysAgo.toISOString())
          .order("recorded_at", { ascending: false });

        if (historyError) throw historyError;

        // Get current month and previous month balances
        const currentMonthBalances = balanceHistory?.filter(
          (b) => new Date(b.recorded_at) >= thirtyDaysAgo
        ) || [];
        const previousMonthBalances = balanceHistory?.filter(
          (b) => new Date(b.recorded_at) < thirtyDaysAgo && new Date(b.recorded_at) >= sixtyDaysAgo
        ) || [];

        const currentMonthAvg =
          currentMonthBalances.length > 0
            ? currentMonthBalances.reduce((sum, b) => sum + parseFloat(b.recorded_balance.toString()), 0) / currentMonthBalances.length
            : 0;

        const previousMonthAvg =
          previousMonthBalances.length > 0
            ? previousMonthBalances.reduce((sum, b) => sum + parseFloat(b.recorded_balance.toString()), 0) / previousMonthBalances.length
            : 0;

        // Calculate growth percentage
        let growthPercentage = 0;
        let trend: "positive" | "neutral" | "negative" = "neutral";
        let message = "Great job this month! You're building your wealth steadily.";

        if (previousMonthAvg > 0) {
          growthPercentage = ((currentMonthAvg - previousMonthAvg) / previousMonthAvg) * 100;
        }

        if (growthPercentage > 0) {
          trend = "positive";
          message = `Your portfolio improved by ${growthPercentage.toFixed(0)}% this month. Keep it up! You're trending in the right direction.`;
        } else if (growthPercentage < -5) {
          trend = "negative";
          message = `Your portfolio declined by ${Math.abs(growthPercentage).toFixed(1)}% this month. Consider reviewing your spending and adjusting your strategy.`;
        } else if (growthPercentage < 0) {
          trend = "neutral";
          message = `Your portfolio shifted by ${growthPercentage.toFixed(1)}% this month. This month is a learning opportunity—adjust and improve next month.`;
        } else {
          trend = "neutral";
          message = `Your portfolio remained stable this month. Focus on building new income streams to boost your growth.`;
        }

        // 4. Get AI generated message for a personalized experience
        try {
          const aiPrompt = `My portfolio growth is ${growthPercentage.toFixed(1)}% this month (trend: ${trend}). Provide a short, encouraging ONE-SENTENCE portfolio summary for my dashboard. No markdown, just plain text.`;
          const { data: aiResponse, error: aiError } = await supabase.functions.invoke("gemini-chat", {
            body: { userInput: aiPrompt }
          });
          
          if (!aiError && aiResponse?.text) {
            // Ensure it's truly one sentence and not too long
            const cleanedMessage = aiResponse.text.split(/[.!?]/)[0] + ".";
            message = cleanedMessage;
          }
        } catch (e) {
          console.warn("AI portfolio summary failed, using fallback:", e);
        }

        setSummary({
          message,
          growthPercentage: Math.round(growthPercentage * 10) / 10,
          trend,
          loading: false,
          error: null,
        });
      } catch (error: any) {
        console.error("Portfolio summary generation error:", error);
        setSummary((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to generate portfolio summary",
          message: "Your portfolio is performing well this month. You're building your wealth steadily.",
          growthPercentage: 0,
          trend: "positive",
        }));
      }
    };

    generateSummary();
  }, [userId]);

  return summary;
}

