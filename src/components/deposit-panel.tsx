import React, { useState, useMemo } from "react";
import {
  Building2,
  Smartphone,
  Plus,
  Check,
  Info,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Lock as LockIcon,
  ChevronDown,
  Search,
  CreditCard,
  History,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

import { useProfileSignal } from "@/lib/profile-signal";
import { supabase } from "@/api/supabase";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { TransactionPinModal } from "@/components/transaction-pin-modal";

// Mobile Money & Banks Configuration
const MOBILE_MONEY = [
  { id: "mm-mpesa", name: "M-Pesa", logo: "/logos/mpesa.svg", color: "bg-emerald-600" },
  { id: "mm-airtel", name: "Airtel Money", logo: "/logos/airtel.svg", color: "bg-red-500" },
  { id: "mm-tkash", name: "T-Kash", logo: "/logos/tkash.svg", color: "bg-purple-600" },
];

const BANKS_WITH_LOGOS = [
  { id: "b-kcb", name: "KCB Bank", logo: "/logos/kcb.svg", color: "bg-blue-700" },
  { id: "b-coop", name: "Co-operative Bank", logo: "/logos/coop.svg", color: "bg-green-700" },
  { id: "b-ncba", name: "NCBA Bank", logo: "/logos/ncba.svg", color: "bg-blue-800" },
  { id: "b-absa", name: "Absa Bank", logo: "/logos/absa.svg", color: "bg-red-600" },
];

// Constants
const EXCHANGE_RATE = 130; // 1 USD = 130 KES (approximate)
const SAVED_NUMBERS = [
  { id: "m1", phone: "+254712345678", carrier: "M-Pesa", logo: "/logos/mpesa.svg" },
  { id: "m2", phone: "+254798765432", carrier: "M-Pesa", logo: "/logos/mpesa.svg" },
];
const SAVED_BANK_ACCOUNTS = [];
const CARRIERS = [
  { name: "M-Pesa", logo: "/logos/mpesa.svg" },
  { name: "Airtel Money", logo: "/logos/airtel.svg" },
  { name: "T-Kash", logo: "/logos/tkash.svg" },
];
const BANKS = ["Stripe ACH"];

type SourceChannel = "mobile" | "bank" | "stripe";
type DepositStatus = "idle" | "processing" | "confirming" | "stripe_pay" | "success";

export function DepositPanel() {
  const [profile] = useProfileSignal();
  const { currency, balance: walletBalance } = useWalletBalance();
  const [channel, setChannel] = useState<SourceChannel>("mobile");
  const [amount, setAmount] = useState<string>("");
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [status, setStatus] = useState<DepositStatus>("idle");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>("m1");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState<string>("M-Pesa");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);

  // Derived values
  const currencySymbol = currency === "USD" ? "$" : currency === "KES" ? "KES " : currency + " ";
  const numAmount = parseFloat(amount || "0");
  const kesEquivalent = currency === "USD" ? numAmount * EXCHANGE_RATE : numAmount;
  const usdEquivalent = currency === "USD" ? numAmount : numAmount / EXCHANGE_RATE;

  const handleDepositClick = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const userId = profile?.id;
    if (!userId) {
      toast.error("User session not found. Please log in again.");
      return;
    }

    setIsPinModalOpen(true);
  };

  const handlePinVerified = async () => {
    const userId = profile?.id;
    if (!userId) return;

    if (channel === "stripe") {
      setStatus("processing");
      try {
        const { data, error } = await supabase.functions.invoke("stripe-create-intent", {
          body: { amount: parseFloat(amount), user_id: userId },
        });

        if (error) throw error;
        if (data.clientSecret) {
          setStripeClientSecret(data.clientSecret);
          setStatus("stripe_pay");
        } else {
          throw new Error("No client secret returned");
        }
      } catch (err: any) {
        toast.error("Failed to initiate Stripe payment: " + err.message);
        setStatus("idle");
      }
      return;
    }

    if (channel === "bank" && selectedSourceId === "stripe-ach") {
      setStatus("processing");
      try {
        const { data, error } = await supabase.functions.invoke("stripe-create-intent", {
          body: { amount: parseFloat(amount), user_id: userId },
        });

        if (error) throw error;
        if (data.clientSecret) {
          setStripeClientSecret(data.clientSecret);
          setStatus("stripe_pay");
        } else {
          throw new Error("No client secret returned");
        }
      } catch (err: any) {
        toast.error("Failed to initiate Stripe payment: " + err.message);
        setStatus("idle");
      }
      return;
    }

    // Determine the phone number to use for the STK push
    let phone = "";
    if (isAddingNew) {
      if (!newPhoneNumber || newPhoneNumber.length < 9) {
        toast.error("Please provide a valid phone number");
        return;
      }
      phone = newPhoneNumber;
    } else {
      const source = SAVED_NUMBERS.find((n) => n.id === selectedSourceId);
      phone = source?.phone || "";
    }

    if (!phone || phone === "No number set") {
      toast.error("Please select or enter a valid mobile number");
      return;
    }

    // Standardize to 254... format
    let formattedPhone = phone.replace(/\D/g, ""); // Remove non-digits
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith("+")) {
      formattedPhone = formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith("254") && formattedPhone.length === 9) {
      formattedPhone = "254" + formattedPhone;
    }

    setStatus("processing");
    try {
      const { data, error } = await supabase.functions.invoke("mpesa-deposit", {
        body: { phoneNumber: formattedPhone, amount: parseFloat(amount) * EXCHANGE_RATE },
      });

      if (error) {
        let errorMessage = "Failed to initiate M-Pesa payment";
        try {
          const errorResponse = await error.context?.json();
          errorMessage =
            errorResponse?.error || errorResponse?.errorMessage || error.message || errorMessage;
        } catch (e) {
          errorMessage = error.message || errorMessage;
        }
        throw new Error(errorMessage);
      }

      if (!data || (data.ResponseCode !== "0" && data.ResponseCode !== 0)) {
        throw new Error(
          data?.errorMessage ||
            data?.ResponseDescription ||
            data?.CustomerMessage ||
            "Payment initiation failed: No response from provider",
        );
      }

      const checkoutId =
        data.CheckoutRequestID || `DEP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      setRefCode(checkoutId);

      await supabase.from("transactions").insert({
        sender_id: userId,
        receiver_id: userId,
        type: "deposit",
        method:
          channel === "mobile" ? "mpesa" : selectedSourceId === "stripe-ach" ? "bank" : "bank",
        amount: parseFloat(amount),
        status: "pending",
        description: channel === "mobile" ? `M-Pesa Deposit - ${checkoutId}` : `Bank Deposit - ${checkoutId}`,
      });

      toast.success("Check your phone for the M-Pesa PIN prompt");
      setStatus("confirming");
    } catch (error: any) {
      console.error("M-Pesa trigger error:", error);
      toast.error(error.message);
      setStatus("idle");
    }
  };

  const handleConfirmDeposit = async () => {
    // Handle the confirmed deposit
    setStatus("success");
  };

  const getSourceName = () => {
    if (isAddingNew) {
      return newPhoneNumber || "Mobile Money";
    }
    const source = SAVED_NUMBERS.find((n) => n.id === selectedSourceId);
    return source?.phone || "Selected Source";
  };

  if (status === "stripe_pay" && stripeClientSecret) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">Redirecting to Stripe payment...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
          <h2 className="text-2xl font-semibold">Deposit Successful!</h2>
          <p className="text-muted-foreground">Your deposit has been processed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
      {/* LEFT PANEL - DEPOSIT METHODS */}
      <div className="space-y-6">
        {/* Mobile Money Section */}
        <div className="rounded-3xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Smartphone className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold">Mobile Money</h3>
          </div>
          <Select value={selectedSourceId || ""} onValueChange={setSelectedSourceId}>
            <SelectTrigger className="w-full h-12 rounded-xl">
              <SelectValue placeholder="Select a phone number" />
            </SelectTrigger>
            <SelectContent>
              {SAVED_NUMBERS.map((num) => (
                <SelectItem key={num.id} value={num.id}>
                  {num.phone} ({num.carrier})
                </SelectItem>
              ))}
              <SelectItem value="new">+ Add New Number</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bank Transfer Section */}
        <div className="rounded-3xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold">Bank Transfer</h3>
          </div>
          <p className="text-sm text-muted-foreground">Connect your bank account for direct transfers</p>
        </div>

        {/* Card Payment Section */}
        <div className="rounded-3xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-semibold">Card Payment</h3>
          </div>
          <p className="text-sm text-muted-foreground">Pay securely with Visa, Mastercard, or Amex</p>
        </div>
      </div>

      {/* SECTION 3: RIGHT PANEL - INPUTS, AMOUNT & SECURITY AUTHORIZATION */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm space-y-8">
          <div className="space-y-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
              Deposit Amount ({currency})
            </Label>
            <div className="relative">
              <span
                className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-light",
                  currency === "USD" ? "text-2xl" : "text-lg",
                )}
              >
                {currencySymbol}
              </span>
              <Input
                type="number"
                placeholder="0.00"
                className={cn(
                  "h-16 bg-background/40 border-border/60 rounded-2xl text-3xl font-light focus:ring-primary/20",
                  currency === "USD" ? "pl-10" : "pl-16",
                )}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 space-y-4 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <History className="w-24 h-24 text-emerald-500" />
            </div>
            <div className="flex justify-between items-center text-xs text-emerald-500/70 uppercase tracking-widest font-bold">
              <span>Conversion</span>
              <span className="bg-emerald-500/20 px-2 py-0.5 rounded">
                1 USD = {EXCHANGE_RATE} KES
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                {currency === "USD" ? "Equivalent KES" : "Equivalent USD"}
              </div>
              <div className="text-2xl font-mono text-emerald-500 font-bold">
                {currency === "USD" ? "KES " : "$"}
                {(currency === "USD" ? kesEquivalent : usdEquivalent).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <Button
              size="lg"
              className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl text-lg font-medium shadow-xl shadow-primary/20 group"
              onClick={handleDepositClick}
            >
              Deposit Funds{" "}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        <div className="rounded-2xl bg-card/20 border border-border/40 p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Deposits are processed instantly via our secure payment rails. Network fee may apply
            based on your carrier or bank.
          </p>
        </div>
      </div>

      <TransactionPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onVerified={handlePinVerified}
        title="Authorize Deposit"
        description={`Securely authorize your deposit of ${currencySymbol}${parseFloat(amount || "0").toLocaleString()} via ${getSourceName()}.`}
      />

      <Dialog open={status === "confirming"} onOpenChange={(o) => !o && setStatus("idle")}>
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-background/60 backdrop-blur-xl border-white/10 shadow-2xl">
          <div className="p-8 space-y-8">
            <div className="w-16 h-16 rounded-3xl bg-primary/20 flex items-center justify-center text-primary mx-auto">
              <Zap className="w-8 h-8" />
            </div>

            <div className="text-center space-y-3">
              <DialogTitle className="text-2xl font-light">Confirm Deposit</DialogTitle>
              <DialogDescription className="text-base">
                Are you sure you want to deposit{" "}
                <span className="text-primary font-semibold font-mono">
                  ${parseFloat(amount || "0").toLocaleString()}
                </span>{" "}
                from your <span className="font-semibold">{getSourceName()}</span> account into your
                Vault Wallet?
              </DialogDescription>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 space-y-4 border border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Exchange Amount</span>
                <span className="font-mono text-emerald-500">
                  KES {kesEquivalent.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee</span>
                <span className="text-primary">FREE</span>
              </div>
              <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                <span className="text-sm font-medium">Total Credit</span>
                <span className="text-2xl font-light font-mono text-primary">
                  ${parseFloat(amount || "0").toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="ghost"
                className="h-14 rounded-2xl hover:bg-white/5"
                onClick={() => setStatus("idle")}
              >
                NO, CANCEL
              </Button>
              <Button
                className="h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                onClick={handleConfirmDeposit}
              >
                YES, DEPOSIT
              </Button>
            </div>
          </div>

          <div className="bg-primary/5 p-4 text-center border-t border-white/5">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-2 tracking-widest uppercase">
              <LockIcon className="w-3 h-3" /> PCI-DSS Compliant Gateway
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Processing Overlay */}
      {status === "processing" && (
        <div className="fixed inset-0 bg-background/40 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-primary/10 animate-pulse" />
            <Loader2 className="w-32 h-32 text-primary animate-spin absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-10 h-10 text-primary/50 animate-pulse" />
            </div>
          </div>
          <h2 className="text-3xl font-light mt-12 tracking-tight text-foreground animate-pulse">
            Requesting funds securely...
          </h2>
          <p className="text-base text-muted-foreground mt-3">
            Triggering secure STK Push / Automated Debit Request
          </p>

          <div className="mt-16 flex gap-6">
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      )}
    </div>
  );
}
