import { Request, Response } from "express";
import { supabase } from "@/api/supabase";

/**
 * TYPES
 */
export interface DashboardPayload {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    initials: string;
  };
  wallets: Array<{
    balance: number;
    currency: string;
  }>;
  subAccounts: Array<{
    id: string;
    name: string;
    balance: number;
    iconType: string;
  }>;
}

/**
 * BACKEND CONTROLLER: GET /api/v1/vault/dashboard
 * Feeds the high-fidelity mobile dashboard layout.
 */
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const userId = (req as { user?: { id: string } }).user?.id; // From JWT Auth Middleware
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Atomic data fetching via Promise.all
    const [profileRes, walletRes, subAccountsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("wallets").select("*").eq("user_id", userId),
      supabase.from("sub_accounts").select("*").eq("user_id", userId),
    ]);

    if (profileRes.error) throw profileRes.error;

    const payload: DashboardPayload = {
      user: {
        id: profileRes.data.id,
        firstName: profileRes.data.first_name,
        lastName: profileRes.data.last_name,
        initials: `${profileRes.data.first_name[0]}${profileRes.data.last_name[0]}`.toUpperCase(),
      },
      wallets:
        walletRes.data?.map((w) => ({
          balance: parseFloat(w.balance),
          currency: w.currency,
        })) || [],
      subAccounts:
        subAccountsRes.data?.map((s) => ({
          id: s.id,
          name: s.name,
          balance: parseFloat(s.balance),
          iconType: s.icon_type,
        })) || [],
    };

    return res.status(200).json(payload);
  } catch (err: unknown) {
    console.error("Dashboard Data Error:", err);
    return res.status(500).json({ error: "Internal server error fetching dashboard data" });
  }
};
