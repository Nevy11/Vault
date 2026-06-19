import { supabase } from "@/api/supabase";

export interface FraudCheckResult {
  isFraudulent: boolean;
  reason?: string;
  errorCode?: string;
}

/**
 * Velocity Check: Flag if a user attempts more than 3 transactions within a 5-minute window.
 */
export async function checkVelocity(userId: string): Promise<FraudCheckResult> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", fiveMinutesAgo);

  if (error) {
    console.error("Error in velocity check:", error);
    return { isFraudulent: false }; // Fail open or closed? Usually open for UX, but closed for security.
  }

  if (count !== null && count >= 3) {
    return {
      isFraudulent: true,
      reason: "Velocity limit exceeded: too many transactions in a short period.",
      errorCode: "ERR_FRAUD_VELOCITY",
    };
  }

  return { isFraudulent: false };
}

/**
 * Value Spike Check: Calculate the user's rolling average for the last 10 transactions.
 * Flag if the current transaction is greater than 400% of that average.
 */
export async function checkValueSpike(
  userId: string,
  currentAmount: number,
): Promise<FraudCheckResult> {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .eq("sender_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error in value spike check:", error);
    return { isFraudulent: false };
  }

  // If new user (fewer than 3 transactions), skip spike check or use a fixed threshold
  if (!data || data.length < 3) {
    return { isFraudulent: false };
  }

  const avg = data.reduce((sum, tx) => sum + Number(tx.amount), 0) / data.length;
  const threshold = avg * 4.0; // 400%

  if (currentAmount > threshold) {
    return {
      isFraudulent: true,
      reason: `Transaction amount exceeds historical average spike threshold (${threshold.toFixed(2)}).`,
      errorCode: "ERR_FRAUD_SPIKE",
    };
  }

  return { isFraudulent: false };
}

/**
 * Main interceptor function to evaluate a transaction before processing.
 */
export async function evaluateTransaction(
  userId: string,
  amount: number,
): Promise<FraudCheckResult> {
  // 1. Run checks in parallel for performance
  const [velocityResult, spikeResult] = await Promise.all([
    checkVelocity(userId),
    checkValueSpike(userId, amount),
  ]);

  if (velocityResult.isFraudulent) return velocityResult;
  if (spikeResult.isFraudulent) return spikeResult;

  return { isFraudulent: false };
}
