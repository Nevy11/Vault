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
    message: "Great job this month! You're building your wealth steadily.",
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

        // Fetch balance history for the last 60 days
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: balanceHistory, error: historyError } = await supabase
          .from("balance_history")
          .select("recorded_balance, recorded_at")
          .eq("user_id", userId)
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
          if (growthPercentage >= 15) {
            message = `Excellent progress! Your portfolio grew by ${growthPercentage.toFixed(1)}% this month. Keep up this momentum!`;
          } else if (growthPercentage >= 8) {
            message = `Great work! Your portfolio improved by ${growthPercentage.toFixed(1)}% this month. You're trending in the right direction.`;
          } else if (growthPercentage >= 2) {
            message = `Good start! Your portfolio grew by ${growthPercentage.toFixed(1)}% this month. Stay consistent and watch it grow.`;
          } else {
            message = `Progress made! Your portfolio grew by ${growthPercentage.toFixed(1)}% this month. Every step counts.`;
          }
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
          message: "Great job this month! You're building your wealth steadily.",
          growthPercentage: 0,
          trend: "positive",
        }));
      }
    };

    generateSummary();
  }, [userId]);

  return summary;
}

