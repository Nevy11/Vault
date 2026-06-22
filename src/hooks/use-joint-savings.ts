import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/api/supabase";
import { toast } from "sonner";

export type JointPot = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  target_amount: number;
  balance: number;
  status: string;
  created_at: string;
};

export type JointPotMember = {
  id: string;
  pot_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  profile?: any;
};

export type JointContribution = {
  id: string;
  pot_id: string;
  user_id: string;
  amount: number;
  type: "deposit" | "withdrawal";
  balance_after: number;
  created_at: string;
  profile?: any;
};

export type WithdrawalRequest = {
  id: string;
  pot_id: string;
  requester_id: string;
  amount: number;
  reason: string;
  status: string;
  created_at: string;
  profile?: any;
  approvals?: any[];
};

export type JointPotInvite = {
  id: string;
  pot_id: string;
  user_id: string;
  status: string;
  created_at: string;
  pot?: JointPot;
};

export function useJointSavings() {
  const [pots, setPots] = useState<JointPot[]>([]);
  const [selectedPotId, setSelectedPotId] = useState<string | null>(null);
  const [selectedPot, setSelectedPot] = useState<JointPot | null>(null);
  const [members, setMembers] = useState<JointPotMember[]>([]);
  const [contributions, setContributions] = useState<JointContribution[]>([]);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [invites, setInvites] = useState<JointPotInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  const fetchPots = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("pot_members")
        .select("*, pot:joint_pots(*)")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) {
        console.error("Error fetching pots:", error);
      } else {
        const userPots = (data || []).map((m: any) => m.pot).filter((p: any) => p !== null);

        setPots(userPots);

        if (userPots.length > 0 && !selectedPotId) {
          setSelectedPotId(userPots[0].id);
        }
      }
    } catch (err) {
      console.error("Critical error in fetchPots:", err);
    }
  }, [selectedPotId]);

  const fetchInvites = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("pot_members")
        .select(
          `
          *,
          pot:joint_pots(
            *,
            creator:profiles!joint_pots_creator_id_fkey(*)
          )
        `,
        )
        .eq("user_id", user.id)
        .eq("status", "invited");

      if (error) {
        console.error("Error fetching invites:", error);
      } else {
        setInvites(data || []);
      }
    } catch (err) {
      console.error("Critical error in fetchInvites:", err);
    }
  }, []);

  const fetchPotDetails = useCallback(
    async (potId: string) => {
      // Only show loading if we don't have a selected pot yet or it's a new one
      if (!selectedPot || selectedPot.id !== potId) {
        setLoading(true);
      }

      try {
        const { data: pot, error: potErr } = await supabase
          .from("joint_pots")
          .select("*")
          .eq("id", potId)
          .single();

        if (potErr) throw potErr;
        setSelectedPot(pot);

        const [membersRes, contributionsRes, requestsRes] = await Promise.all([
          supabase.from("pot_members").select("*, profile:profiles(*)").eq("pot_id", potId),
          supabase
            .from("pot_contributions")
            .select("*, profile:profiles(*)")
            .eq("pot_id", potId)
            .order("created_at", { ascending: false }),
          supabase
            .from("pot_withdrawal_requests")
            .select("*, profile:profiles(*), approvals:pot_withdrawal_approvals(*)")
            .eq("pot_id", potId)
            .order("created_at", { ascending: false }),
        ]);

        setMembers(membersRes.data || []);
        setContributions(contributionsRes.data || []);
        setRequests(requestsRes.data || []);
      } catch (err) {
        console.error("Error fetching pot details:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedPot],
  );

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchPots(), fetchInvites()]);
      setInitialFetchDone(true);
      setLoading(false);
    };
    init();

    // SETUP REALTIME SUBSCRIPTIONS
    // Use a unique channel name to avoid collisions between multiple hook instances
    const channelName = `joint_pots_realtime_${Math.random().toString(36).substring(7)}`;
    const potsChannel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "joint_pots" }, () => {
        fetchPots();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pot_members" }, () => {
        fetchPots();
        fetchInvites();
        if (selectedPotId) fetchPotDetails(selectedPotId);
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pot_withdrawal_requests" },
        () => {
          if (selectedPotId) fetchPotDetails(selectedPotId);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pot_withdrawal_approvals" },
        () => {
          if (selectedPotId) fetchPotDetails(selectedPotId);
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "pot_contributions" }, () => {
        if (selectedPotId) fetchPotDetails(selectedPotId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(potsChannel);
    };
  }, [selectedPotId, fetchPots, fetchInvites, fetchPotDetails]);

  useEffect(() => {
    if (selectedPotId) {
      fetchPotDetails(selectedPotId);
    }
  }, [selectedPotId, fetchPotDetails]);

  const createPot = async (
    title: string,
    description: string,
    target: number,
    initialMembers?: string[],
  ) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: pot, error: potErr } = await supabase
      .from("joint_pots")
      .insert({
        creator_id: user.id,
        title,
        description,
        target_amount: target,
      })
      .select()
      .single();

    if (potErr) {
      toast.error("Failed to create pot");
      return;
    }

    const { error: memberErr } = await supabase.from("pot_members").insert({
      pot_id: pot.id,
      user_id: user.id,
      role: "admin",
      status: "active",
    });

    if (memberErr) {
      toast.error("Failed to add you as admin");
    } else {
      toast.success("Joint saving pot created!");

      // Handle initial member invitations
      if (initialMembers && initialMembers.length > 0) {
        for (const tag of initialMembers) {
          if (tag.trim()) await inviteMember(pot.id, tag.trim());
        }
      }

      fetchPots();
    }
  };

  const inviteMember = async (potId: string, kycTag: string) => {
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("kyc_tag", kycTag)
      .single();

    if (profileErr || !profile) {
      toast.error("User not found");
      return;
    }

    const { error } = await supabase.from("pot_members").insert({
      pot_id: potId,
      user_id: profile.id,
      status: "invited",
    });

    if (error) {
      toast.error("User already invited or in pot");
    } else {
      toast.success(`Invited ${kycTag} to the pot!`);
      fetchPotDetails(potId);
    }
  };

  const deposit = async (potId: string, amount: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Fetch user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("balance, id, currency")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      toast.error("Could not find your Vault wallet");
      return;
    }

    const KES_USD_RATE = 130.0;
    const amountInWalletCurrency =
      wallet.currency === "USD" ? Number((amount / KES_USD_RATE).toFixed(2)) : amount;

    if (Number(wallet.balance) < amountInWalletCurrency) {
      toast.error("Insufficient Vault balance");
      return;
    }

    // 2. Call create_ledger_entry RPC function to deduct wallet and log transaction
    const potTitle = selectedPot?.title || "Joint Savings Pot";
    const { error: ledgerError } = await supabase.rpc("create_ledger_entry", {
      p_user_id: user.id,
      p_amount: -amountInWalletCurrency,
      p_currency: wallet.currency || "USD",
      p_type: "withdrawal",
      p_reference: `joint_deposit_${potId}_${Date.now()}`,
      p_description: `Joint Savings Deposit: ${potTitle}`,
      p_status: "completed",
      p_metadata: { payment_method: "vault", pot_id: potId },
    });

    if (ledgerError) {
      toast.error("Failed to deduct from wallet: " + ledgerError.message);
      return;
    }

    // 3. Record the joint savings contribution
    const { error } = await supabase.from("pot_contributions").insert({
      pot_id: potId,
      user_id: user.id,
      amount,
      type: "deposit",
    });

    if (error) {
      toast.error("Wallet deducted, but failed to record joint contribution");
    } else {
      toast.success(`Deposited KES ${amount.toLocaleString()}!`);
      
      // 4. Insert custom joint savings notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Joint Savings Deposit",
        message: `Your deposit of KES ${amount.toLocaleString()} to "${potTitle}" was successful.`,
        type: "success",
        metadata: { pot_id: potId, type: "pot_deposit" }
      });

      fetchPotDetails(potId);
    }
  };

  const requestWithdrawal = async (potId: string, amount: number, reason: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("pot_withdrawal_requests").insert({
      pot_id: potId,
      requester_id: user.id,
      amount,
      reason,
    });

    if (error) {
      toast.error("Failed to request withdrawal");
    } else {
      toast.success("Withdrawal request submitted for approval");
      fetchPotDetails(potId);
    }
  };

  const approveWithdrawal = async (requestId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("pot_withdrawal_approvals").insert({
      request_id: requestId,
      user_id: user.id,
      status: "approved",
    });

    if (error) {
      toast.error("Already approved or error occurred");
    } else {
      toast.success("Approved withdrawal");
      if (selectedPotId) fetchPotDetails(selectedPotId);
    }
  };

  const acceptInvite = async (potId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("pot_members")
      .update({
        status: "active",
      })
      .eq("pot_id", potId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to join pot");
    } else {
      toast.success("Joined shared pot!");
      
      // Mark matching notification as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("metadata->>pot_id", potId)
        .eq("metadata->>type", "pot_invite");

      fetchPots();
      fetchInvites();
    }
  };

  const declineInvite = async (potId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("pot_members")
      .update({
        status: "declined",
      })
      .eq("pot_id", potId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to decline invite");
    } else {
      toast.success("Invite declined");

      // Mark matching notification as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("metadata->>pot_id", potId)
        .eq("metadata->>type", "pot_invite");

      fetchInvites();
    }
  };

  return {
    pots,
    selectedPotId,
    setSelectedPotId,
    selectedPot,
    members,
    contributions,
    requests,
    invites,
    loading,
    createPot,
    inviteMember,
    deposit,
    requestWithdrawal,
    approveWithdrawal,
    acceptInvite,
    declineInvite,
    refetch: () => {
      fetchPots();
      if (selectedPotId) fetchPotDetails(selectedPotId);
    },
  };
}
