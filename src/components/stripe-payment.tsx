import React, { useState, useEffect } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/api/supabase";

interface StripePaymentProps {
  amount: number;
  onSuccess: (referenceId: string) => void;
  onCancel: () => void;
}

export function StripePayment({ amount, onSuccess, onCancel }: StripePaymentProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Return URL is required for some payment methods
        return_url: `${window.location.origin}/dashboard`,
      },
      redirect: "if_required",
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message || "An error occurred.");
      } else {
        setMessage("An unexpected error occurred.");
      }
      toast.error(error.message || "Payment failed");
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User session not found");

        // 1. Record the transaction in the UI table
        const { error: txError } = await supabase.from("transactions").insert({
          sender_id: user.id,
          type: "deposit",
          method: "bank",
          amount: amount,
          status: "completed",
          description: `Stripe Deposit: ${paymentIntent.id}`,
        });

        if (txError) console.error("Error recording transaction:", txError);

        // 2. Update the actual ledger and wallet balance
        const { error: ledgerError } = await supabase.rpc("create_ledger_entry", {
          p_user_id: user.id,
          p_amount: amount,
          p_currency: "USD",
          p_type: "deposit",
          p_reference: paymentIntent.id,
          p_description: `Stripe Deposit: ${paymentIntent.id}`,
          p_status: "completed"
        });

        if (ledgerError) {
          console.error("Error updating ledger:", ledgerError);
          toast.error("Payment succeeded but balance update failed. Please contact support.");
        } else {
          toast.success("Deposit successful! Your balance has been updated.");
          onSuccess(paymentIntent.id);
        }
      } catch (dbErr: any) {
        console.error("Database update error:", dbErr);
        toast.error("Payment confirmed, but an error occurred updating your account.");
        // Still call onSuccess as the payment itself was successful
        onSuccess(paymentIntent.id);
      }
    }

    setIsProcessing(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <PaymentElement id="payment-element" />
      </div>
      
      {message && (
        <div id="payment-message" className="text-sm text-destructive text-center">
          {message}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          disabled={isProcessing || !stripe || !elements}
          id="submit"
          className="flex-1"
        >
          <span id="button-text">
            {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
          </span>
        </Button>
      </div>
    </form>
  );
}
