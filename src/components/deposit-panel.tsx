import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
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

import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/api/supabase";
import { hashPin } from "@/lib/utils";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { useKycGuard } from "@/hooks/use-kyc-guard";

import { StripePayment } from "./stripe-payment";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

// Sub-components
import { DepositHeader } from "./deposit/DepositHeader";
import { PaymentMethodSelector } from "./deposit/PaymentMethodSelector";
import { MobileSourceSelector } from "./deposit/MobileSourceSelector";
import { BankSourceSelector } from "./deposit/BankSourceSelector";
import { DepositAmountInput } from "./deposit/DepositAmountInput";

// Initialize Stripe (use env variable in production)
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
    "pk_test_51Ro0ysE4K5QIsyl6tFrDH7oCDENuxy0P1iq7wWIvwiI5jyUtrf2Tsb0bizDjX0NIaTjiV1gzmGNVPj7GbqeyF4yX005RF2puYW",
);

// Mock Data
const SAVED_BANK_ACCOUNTS = [
  {
    id: "b1",
    name: "Equity Bank",
    accountNumber: "****5678",
    holder: "John Doe",
    color: "bg-orange-600",
  },
  {
    id: "b2",
    name: "KCB Bank",
    accountNumber: "****1234",
    holder: "John Doe",
    color: "bg-green-700",
  },
];

const CARRIERS = ["M-Pesa", "Airtel Money", "T-Kash"];
const BANKS = [
  "KCB Bank",
  "Equity Bank",
  "Co-operative Bank",
  "Absa Bank",
  "NCBA Bank",
  "Standard Chartered",
  "Stanbic Bank",
  "I&M Bank",
];

const EXCHANGE_RATE = 130.0;

type SourceChannel = "bank" | "mobile" | "stripe";
type DepositStatus = "idle" | "processing" | "success" | "stripe_pay" | "awaiting_mpesa";

export function DepositPanel() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { currency, balance: walletBalance, refetch: refetchWallet } = useWalletBalance();
  const { checkKyc, KycGuardDialog } = useKycGuard();
  const [channel, setChannel] = useState<SourceChannel>("mobile");
  const [inputCurrency, setInputCurrency] = useState<"USD" | "KES">(
    currency === "KES" ? "KES" : "USD",
  );
  const [amount, setAmount] = useState<string>("");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<DepositStatus>("idle");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>("m1");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState<string>("M-Pesa");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);

  // Sync input currency with wallet currency on initial load
  useEffect(() => {
    if (currency === "KES" || currency === "USD") {
      setInputCurrency(currency as "USD" | "KES");
    }
  }, [currency]);

  // Real-time listener for transaction completion
  useEffect(() => {
    if (!refCode || status !== "awaiting_mpesa") return;

    console.log(`Setting up real-time listener for transaction: ${refCode}`);

    const channel = supabase
      .channel(`deposit-status-${refCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `description=eq.${refCode}`,
        },
        (payload) => {
          console.log("Transaction update detected:", payload.new);
          if (payload.new.status === "completed") {
            toast.success(t("transactions.deposit.payment_confirmed"));
            refetchWallet();
            setStatus("success");
          } else if (payload.new.status === "failed") {
            toast.error(t("transactions.deposit.payment_failed"));
            setStatus("idle");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refCode, status, refetchWallet, t]);

  const currencySymbol = currency === "USD" ? "$" : currency === "KES" ? "KES " : currency + " ";

  const SAVED_NUMBERS = useMemo(() => {
    console.log("DEBUG: Current profile object:", profile);
    const phoneNumber = profile?.phone_number || "No number set";
    return [
      {
        id: "m1",
        name: phoneNumber,
        phone: phoneNumber,
        carrier: "M-Pesa",
        color: "bg-emerald-600",
      },
    ];
  }, [profile]);

  const kesEquivalent = useMemo(() => {
    const val = parseFloat(amount || "0");
    if (inputCurrency === "KES") return val;
    return val * EXCHANGE_RATE;
  }, [amount, inputCurrency]);

  const walletCredit = useMemo(() => {
    const val = parseFloat(amount || "0");
    if (inputCurrency === currency) return val;
    if (inputCurrency === "KES" && currency === "USD") return val / EXCHANGE_RATE;
    if (inputCurrency === "USD" && currency === "KES") return val * EXCHANGE_RATE;
    return val;
  }, [amount, inputCurrency, currency]);

  const handleDepositClick = async () => {
    let kycPassed = false;
    checkKyc(() => { kycPassed = true; });
    if (!kycPassed) return;

    if (!amount || parseFloat(amount) <= 0) {
      toast.error(t("transactions.deposit.valid_amount_error"));
      return;
    }

    if (!pin || pin.length < 6) {
      toast.error(t("transactions.deposit.pin_error"));
      return;
    }

    const userId = profile?.id;
    if (!userId) {
      toast.error(t("transactions.deposit.session_error"));
      return;
    }

    // Verify Vault PIN using secure RPC
    const hashedPin = await hashPin(pin);
    const { data: isValid, error: rpcError } = await supabase.rpc("verify_current_pin", {
      provided_pin_hash: hashedPin,
    });

    if (rpcError || !isValid) {
      toast.error(t("transactions.deposit.invalid_pin_error"));
      setPin(""); // Clear invalid PIN
      return;
    }

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
        toast.error(t("transactions.deposit.stripe_init_error", { error: err.message }));
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
        toast.error(t("transactions.deposit.stripe_init_error", { error: err.message }));
        setStatus("idle");
      }
      return;
    }

    // Determine the phone number to use for the STK push
    let phone = "";
    if (isAddingNew) {
      if (!newPhoneNumber || newPhoneNumber.length < 9) {
        toast.error(t("transactions.deposit.valid_phone_error"));
        return;
      }
      phone = newPhoneNumber;
    } else {
      const source = SAVED_NUMBERS.find((n) => n.id === selectedSourceId);
      phone = source?.phone || "";
    }

    if (!phone || phone === "No number set") {
      toast.error(t("transactions.deposit.valid_mobile_error"));
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
        body: { phoneNumber: formattedPhone, amount: kesEquivalent },
      });

      if (error) {
        // Try to extract provider-friendly message
        let errorMessage = t("transactions.deposit.mpesa_init_error");
        try {
          const errorResponse = await error.context?.json();
          errorMessage =
            errorResponse?.error || errorResponse?.errorMessage || error.message || errorMessage;
        } catch (e) {
          errorMessage = error.message || errorMessage;
        }

        // Show clear localized provider + suggestion message
        toast.error(
          t("transactions.deposit.provider_error", {
            provider: selectedCarrier || "M-Pesa",
            message: errorMessage,
          }),
        );
        setStatus("idle");
        return;
      }

      if (!data || (data.ResponseCode !== "0" && data.ResponseCode !== 0)) {
        const providerMessage =
          data?.errorMessage || data?.ResponseDescription || data?.CustomerMessage || null;
        toast.error(
          t("transactions.deposit.provider_error", {
            provider: selectedCarrier || "M-Pesa",
            message: providerMessage || t("transactions.deposit.payment_failed"),
          }),
        );
        setStatus("idle");
        return;
      }

      // Store the checkout ID for later confirmation
      const checkoutId =
        data.CheckoutRequestID || `DEP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      setRefCode(checkoutId);

      // Record pending transaction
      await supabase.from("transactions").insert({
        sender_id: userId,
        receiver_id: userId,
        type: "deposit",
        method:
          channel === "mobile" ? "mpesa" : selectedSourceId === "stripe-ach" ? "bank" : "bank",
        amount: walletCredit,
        status: "pending",
        description: checkoutId,
      });

      toast.success(t("transactions.deposit.check_phone_toast"));
      setStatus("awaiting_mpesa");
    } catch (error: any) {
      console.error("M-Pesa trigger error:", error);
      toast.error(error.message);
      setStatus("idle");
    }
  };

  // Auto-trigger deposit when PIN is complete
  useEffect(() => {
    if (pin.length === 6 && status === "idle") {
      handleDepositClick();
    }
  }, [pin]);

  const getSourceName = () => {
    if (channel === "stripe") return t("transactions.deposit.credit_card");
    if (selectedSourceId === "stripe-ach") return t("transactions.deposit.stripe_bank_transfer");
    if (isAddingNew)
      return channel === "mobile" ? selectedCarrier : t("transactions.deposit.link_new_bank");
    if (channel === "mobile")
      return SAVED_NUMBERS.find((n) => n.id === selectedSourceId)?.name || selectedCarrier;
    return (
      SAVED_BANK_ACCOUNTS.find((b) => b.id === selectedSourceId)?.name ||
      t("transactions.deposit.bank_account")
    );
  };

  if (status === "stripe_pay" && stripeClientSecret) {
    return (
      <div className="max-w-md mx-auto py-8">
        <h2 className="text-2xl font-light mb-6 text-center">
          {t("transactions.deposit.complete_deposit")}
        </h2>
        <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
          <StripePayment
            amount={walletCredit}
            onSuccess={(ref) => {
              setRefCode(ref);
              setStatus("success");
            }}
            onCancel={() => setStatus("idle")}
          />
        </Elements>
      </div>
    );
  }

  if (status === "awaiting_mpesa") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Smartphone className="w-16 h-16 animate-pulse" />
          </div>
          <div className="absolute -inset-2 rounded-full border-2 border-emerald-500/30 animate-ping" />
        </div>

        <h2 className="text-3xl font-semibold mb-2 text-emerald-500">
          {t("transactions.deposit.action_required")}
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          {t("transactions.deposit.mpesa_pin_note", {
            amount: `KES ${kesEquivalent.toLocaleString()}`,
          })}
        </p>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8 w-full max-w-sm mb-8 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap className="w-20 h-20 text-emerald-500" />
          </div>

          <div className="space-y-4 relative">
            <div className="flex justify-between items-center text-sm border-b border-emerald-500/10 pb-3">
              <span className="text-muted-foreground">
                {t("transactions.deposit.expected_credit")}
              </span>
              <span className="text-2xl font-light text-emerald-500 font-mono">
                {currencySymbol}
                {walletCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {t("transactions.success.transaction_id")}
              </span>
              <span className="font-mono font-medium">{refCode}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("common.status")}</span>
              <span className="text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse">
                {t("transactions.deposit.awaiting_pin")}
              </span>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14"
          asChild
        >
          <Link to="/dashboard">{t("transactions.success.back_to_dashboard")}</Link>
        </Button>
        <p className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest">
          {t("transactions.history.syncing")}
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-16 h-16 animate-in zoom-in-50 duration-500" />
          </div>
          <div className="absolute -inset-2 rounded-full border-2 border-emerald-500/30 animate-ping" />
        </div>

        <h2 className="text-3xl font-semibold mb-2 text-emerald-500">
          {t("transactions.deposit.deposit_success_title")}
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          {t("transactions.deposit.deposit_success_desc")}
        </p>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8 w-full max-w-sm mb-8 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap className="w-20 h-20 text-emerald-500" />
          </div>

          <div className="space-y-4 relative">
            <div className="flex justify-between items-center text-sm border-b border-emerald-500/10 pb-3">
              <span className="text-muted-foreground">
                {t("transactions.deposit.credited_balance")}
              </span>
              <span className="text-2xl font-light text-emerald-500 font-mono">
                {currencySymbol}
                {walletCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {t("transactions.success.transaction_id")}
              </span>
              <span className="font-mono font-medium">{refCode}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("common.status")}</span>
              <span className="text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {t("common.completed")}
              </span>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-14"
          asChild
        >
          <Link to="/dashboard">{t("transactions.success.back_to_dashboard")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DepositHeader />

      <PaymentMethodSelector selected={channel} onSelect={setChannel} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* SECTION 2: LEFT PANEL - DEPOSIT SOURCE SELECTION */}
        <div className="rounded-3xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm">
          <div className="min-h-[300px] animate-in slide-in-from-left-4 duration-500">
            {channel === "mobile" && (
              <MobileSourceSelector
                sources={SAVED_NUMBERS.filter((n) => n.carrier === selectedCarrier)}
                selectedId={selectedSourceId}
                onSelect={setSelectedSourceId}
                isAddingNew={isAddingNew}
                onAddNewToggle={setIsAddingNew}
                newPhoneNumber={newPhoneNumber}
                onNewPhoneChange={setNewPhoneNumber}
                selectedCarrier={selectedCarrier}
                onCarrierChange={setSelectedCarrier}
                carriers={CARRIERS}
              />
            )}

            {channel === "bank" && (
              <BankSourceSelector
                sources={SAVED_BANK_ACCOUNTS}
                selectedId={selectedSourceId}
                onSelect={setSelectedSourceId}
                isAddingNew={isAddingNew}
                onAddNewToggle={setIsAddingNew}
              />
            )}

            {channel === "stripe" && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                  <CreditCard className="w-10 h-10" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-xl font-medium">
                    {t("transactions.deposit.stripe_card_title")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("transactions.deposit.stripe_card_desc")}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest bg-muted/50 px-4 py-2 rounded-full">
                  <LockIcon className="w-3 h-3" /> {t("transactions.deposit.encrypted_by_stripe")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: RIGHT PANEL - INPUTS, AMOUNT & SECURITY AUTHORIZATION */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm space-y-8">
            <DepositAmountInput
              amount={amount}
              onAmountChange={setAmount}
              currency={currency}
              inputCurrency={inputCurrency}
              onCurrencyToggle={() => setInputCurrency((prev) => (prev === "USD" ? "KES" : "USD"))}
              kesEquivalent={kesEquivalent}
            />

            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6 space-y-4 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <History className="w-24 h-24 text-emerald-500" />
              </div>
              <div className="flex justify-between items-center text-xs text-emerald-500/70 uppercase tracking-widest font-bold">
                <span>{t("transactions.deposit.settlement")}</span>
                <span className="bg-emerald-500/20 px-2 py-0.5 rounded">
                  1 USD = {EXCHANGE_RATE} KES
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  {t("transactions.deposit.credit_to_wallet", { currency })}
                </div>
                <div className="text-2xl font-mono text-emerald-500 font-bold">
                  {currencySymbol}
                  {walletCredit.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
                {t("transactions.deposit.vault_pin")}
              </Label>
              <div className="relative">
                <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  maxLength={6}
                  placeholder="******"
                  className="pl-12 h-14 bg-background/40 border-border/60 rounded-2xl text-center text-2xl tracking-[0.6em] focus:ring-primary/20"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
              <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                {t("transactions.deposit.authorize_deposit")}
              </p>
            </div>

            <Button
              size="lg"
              className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl text-lg font-medium shadow-xl shadow-primary/20 group"
              onClick={handleDepositClick}
            >
              {t("transactions.deposit.deposit_btn")}{" "}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="rounded-2xl bg-card/20 border border-border/40 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("transactions.deposit.deposit_footer_note")}
            </p>
          </div>
        </div>
      </div>

      <KycGuardDialog />

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
            {t("transactions.deposit.requesting_funds")}
          </h2>
          <p className="text-base text-muted-foreground mt-3">
            {t("transactions.deposit.stk_push_note")}
          </p>

          <div className="mt-16 flex flex-col items-center gap-8">
            <div className="flex gap-6">
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <div className="w-3 h-3 rounded-full bg-primary animate-bounce" />
            </div>

            <Button
              variant="outline"
              className="rounded-xl border-primary/20 hover:bg-primary/5 text-xs h-10 px-8"
              onClick={() => setStatus("idle")}
            >
              {t("transactions.deposit.cancel_request")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
