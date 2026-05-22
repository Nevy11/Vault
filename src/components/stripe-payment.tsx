import React, { useState, useEffect } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface StripePaymentProps {
  amount: number;
  onSuccess: () => void;
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
      toast.success("Deposit successful!");
      onSuccess();
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
