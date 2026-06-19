import { useEffect, useState } from "react";
import { supabase } from "@/api/supabase";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { type Receipt } from "@/api/receipts";

/**
 * Hook: useReceiptRealtime
 * Listens for newly generated receipts via Supabase Realtime and triggers notifications.
 */
export function useReceiptRealtime() {
  const { profile } = useProfile();
  const [latestReceipt, setLatestReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    if (!profile?.id) return;

    const channelId = Math.random().toString(36).slice(2, 9);
    const channel = supabase
      .channel(`receipt-notifications-${profile.id}-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "receipts",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newReceipt = payload.new as Receipt;
          setLatestReceipt(newReceipt);

          // Trigger high-end notification
          toast.success("New Receipt Generated", {
            description: `Receipt ${newReceipt.receipt_number} for $${newReceipt.amount.toLocaleString()} is now available.`,
            action: {
              label: "View",
              onClick: () => console.log("Open receipt details:", newReceipt.id),
            },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return { latestReceipt };
}
