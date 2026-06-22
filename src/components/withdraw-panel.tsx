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
  Landmark,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, hashPin, calculateTransactionFee } from "@/lib/utils";
import { supabase } from "@/api/supabase";
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
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { useProfile } from "@/hooks/use-profile";
import { useKycGuard } from "@/hooks/use-kyc-guard";
import { evaluateTransaction } from "@/lib/fraud-protection";
import { StepUpAuthModal } from "./step-up-auth-modal";

// Sub-components
import { WithdrawHeader } from "./withdraw/WithdrawHeader";
import { WithdrawChannelSelector } from "./withdraw/WithdrawChannelSelector";
import { WithdrawAmountInput } from "./withdraw/WithdrawAmountInput";
import { BankWithdrawForm } from "./withdraw/BankWithdrawForm";
import { MobileWithdrawSelector } from "./withdraw/MobileWithdrawSelector";

// Mock Data
const SAVED_BANKS = [
  {
    id: "b1",
    name: "Chase Bank",
    accountNumber: "****6789",
    holder: "John Doe",
    logo: "CB",
    color: "bg-blue-600",
  },
  {
    id: "b2",
    name: "Bank of America",
    accountNumber: "****1234",
    holder: "John Doe",
    logo: "BA",
    color: "bg-red-600",
  },
];

const BANKS_LIST = [
  "KCB Bank (Kenya Commercial Bank)",
  "Co-operative Bank of Kenya",
  "NCBA Bank",
  "Absa Bank Kenya",
  "Standard Chartered Kenya",
  "Stanbic Bank Kenya",
  "I&M Bank",
  "DTB (Diamond Trust Bank)",
  "Family Bank",
  "Chase Bank",
  "Bank of America",
];

const EXCHANGE_RATE = 130.0;

const calculateFee = (amount: number, currency: string) => {
  return calculateTransactionFee(amount, currency);
};

type Channel = "bank" | "mobile";
type WithdrawalStatus = "idle" | "confirming" | "processing" | "success";

export function WithdrawPanel() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { balance, currency, loading, updateBalance } = useWalletBalance();
  const { checkKyc, KycGuardDialog } = useKycGuard();
  const [amount, setAmount] = useState<string>("");
  const [channel, setChannel] = useState<Channel>("bank");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<WithdrawalStatus>("idle");
  const [refCode, setRefCode] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isPinVerifying, setIsPinVerifying] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [showStepUp, setShowStepUp] = useState(false);

  // Define Step-up threshold (e.g., $500)
  const STEP_UP_THRESHOLD = 500;

  useEffect(() => setMounted(true), []);

  const [selectedMobileId, setSelectedMobileId] = useState<string | null>("m1");
  const [newMobile, setNewMobile] = useState({ provider: "M-Pesa", phone: "" });
  const [isAddingMobile, setIsAddingMobile] = useState(false);

  // Mobile Recipient logic
  const SAVED_MOBILE = useMemo(() => {
    const phoneNumber = profile?.phone_number || t("common.errors.enter_phone");
    return [
      {
        id: "m1",
        name: t("transactions.withdraw.personal_mpesa"),
        phone: phoneNumber,
        provider: "M-Pesa",
        color: "bg-emerald-600",
      },
      {
        id: "m2",
        name: t("transactions.withdraw.secondary_line"),
        phone: "+254 7XX XXX XXX",
        provider: "Airtel Money",
        color: "bg-red-500",
      },
    ];
  }, [profile, t]);

  // Bank Form States
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [bankAccount, setBankAccount] = useState("");
  const [bankHolder, setBankHolder] = useState("");

  const kesEquivalent = useMemo(() => {
    const val = parseFloat(amount || "0");
    return currency === "KES" ? val : val * EXCHANGE_RATE;
  }, [amount, currency]);

  const fee = useMemo(() => {
    return calculateFee(parseFloat(amount || "0"), currency || "USD");
  }, [amount, currency]);

  const totalDeduction = useMemo(() => {
    return parseFloat(amount || "0") + fee;
  }, [amount, fee]);

  const handleWithdrawClick = async () => {
    let kycPassed = false;
    checkKyc(() => { kycPassed = true; });
    if (!kycPassed) return;

    if (!amount || parseFloat(amount) <= 0) {
      toast.error(t("transactions.deposit.valid_amount_error"));
      return;
    }

    if (balance !== null && totalDeduction > balance) {
      toast.error(
        t("transactions.withdraw.insufficient_balance_error", {
          currency: currency === "KES" ? "KSH" : "$",
          amount: totalDeduction.toFixed(2),
        }),
      );
      return;
    }

    if (channel === "bank") {
      if (!selectedBank || !bankAccount || !bankHolder) {
        toast.error(t("transactions.withdraw.fill_bank_error"));
        return;
      }
    } else {
      if (!selectedMobileId && (!isAddingMobile || !newMobile.phone)) {
        toast.error(t("transactions.withdraw.select_mobile_error"));
        return;
      }
    }

    if (pin.length < 6) {
      toast.error("Please enter your 6-digit transaction PIN.");
      return;
    }

    setIsPinVerifying(true);
    try {
      const hashedPin = await hashPin(pin);
      
      const { data: isValid, error: rpcError } = await supabase.rpc("verify_current_pin", {
        provided_pin_hash: hashedPin,
      });

      if (rpcError) throw rpcError;

      if (!isValid) {
        setPin("");
        throw new Error(t("transactions.withdraw.incorrect_pin_error"));
      }

      // Check for Step-up requirement
      if (parseFloat(amount) >= STEP_UP_THRESHOLD) {
        setShowStepUp(true);
      } else {
        setIdempotencyKey(crypto.randomUUID());
        setStatus("confirming");
      }
    } catch (error: any) {
      console.error("Withdrawal verification error:", error);
      toast.error(error.message || t("transactions.withdraw.verification_error"));
    } finally {
      setIsPinVerifying(false);
    }
  };

  const handleStepUpVerified = () => {
    setShowStepUp(false);
    setIdempotencyKey(crypto.randomUUID());
    setStatus("confirming");
  };

  // Auto-trigger withdrawal when PIN is complete
  useEffect(() => {
    if (pin.length === 6 && status === "idle") {
      handleWithdrawClick();
    }
  }, [pin]);

  const handleConfirmWithdraw = async () => {
    setStatus("processing");
    try {
      const userId = profile?.id || (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error(t("common.errors.user_not_found"));

      // 1. FRAUD DETECTION INTERCEPTOR (Informational only, we allow the transaction)
      const fraudCheck = await evaluateTransaction(userId, totalDeduction);
      if (fraudCheck.isFraudulent) {
        console.warn("Fraud check flagged:", fraudCheck.reason);
        // We no longer throw here to "just allow the transactions"
      }

      // 2. Call the RPC function
      const { data, error: txError } = await supabase.rpc("process_secure_withdrawal", {
        p_user_id: userId,
        p_amount: totalDeduction,
        p_method: channel === "mobile" ? "mpesa" : "bank",
        p_description:
          channel === "mobile"
            ? `Withdrawal to ${getRecipientName()}`
            : `Withdrawal to ${selectedBank}: ${bankAccount}`,
        p_idempotency_key: idempotencyKey,
      });

      if (txError) throw txError;

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.success) {
        throw new Error(result?.message || t("transactions.withdraw.withdrawal_failed_error"));
      }

      if (result.new_balance !== undefined) {
        await updateBalance(result.new_balance);
      }

      setRefCode(
        result.reference || `WTH-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      );
      setStatus("success");
      toast.success(t("transactions.withdraw.withdrawal_success_toast"));
    } catch (err: any) {
      console.error("Withdrawal error:", err);
      toast.error(err.message || t("transactions.withdraw.withdrawal_failed_error"));
      setStatus("idle");
    }
  };

  const getRecipientName = () => {
    if (channel === "bank") return selectedBank || t("transactions.withdraw.choose_bank");
    if (isAddingMobile) return newMobile.provider;
    return (
      SAVED_MOBILE.find((m) => m.id === selectedMobileId)?.name ||
      t("transactions.withdraw.withdraw_to_mobile")
    );
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">
          {t("transactions.withdraw.withdrawal_success_title")}
        </h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          {t("transactions.withdraw.withdrawal_success_desc")}
        </p>

        <div className="bg-card/40 border border-border/50 rounded-2xl p-6 w-full max-w-sm mb-8 backdrop-blur-sm">
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">
              {t("transactions.success.transaction_id")}
            </span>
            <span className="font-mono font-medium">{refCode}</span>
          </div>
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">
              {t("transactions.withdraw.amount_withdrawn")}
            </span>
            <span className="font-medium">
              {currency === "KES" ? "KSH" : "$"}
              {parseFloat(amount).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">{t("transactions.withdraw.equivalent")}</span>
            <span className="font-medium">{kesEquivalent.toLocaleString()}</span>
          </div>
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">{t("transactions.withdraw.destination")}</span>
            <span className="font-medium">{getRecipientName()}</span>
          </div>
          <div className="border-t border-border/50 pt-3 flex justify-between text-sm">
            <span className="text-muted-foreground">{t("common.status")}</span>
            <span className="text-primary font-medium">
              {t("transactions.ledger.transaction.processing")}
            </span>
          </div>
        </div>

        <Button variant="outline" className="w-full max-w-xs" asChild>
          <Link to="/dashboard">{t("transactions.success.back_to_dashboard")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <WithdrawHeader />

      <WithdrawChannelSelector selected={channel} onSelect={setChannel} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="rounded-3xl border border-border/50 bg-card/30 p-8 flex flex-col backdrop-blur-sm">
          <div className="min-h-[300px] animate-in slide-in-from-left-4 duration-500">
            {channel === "bank" && (
              <BankWithdrawForm
                banks={BANKS_LIST}
                selectedBank={selectedBank}
                onBankChange={setSelectedBank}
                accountNumber={bankAccount}
                onAccountNumberChange={setBankAccount}
                accountHolder={bankHolder}
                onAccountHolderChange={setBankHolder}
              />
            )}

            {channel === "mobile" && (
              <MobileWithdrawSelector
                sources={SAVED_MOBILE}
                selectedId={selectedMobileId}
                onSelect={setSelectedMobileId}
                isAddingNew={isAddingMobile}
                onAddNewToggle={setIsAddingMobile}
                newMobile={newMobile}
                onNewMobileChange={setNewMobile}
                onConfirmNew={() => {
                  if (!newMobile.phone) {
                    toast.error(t("common.errors.enter_phone"));
                    return;
                  }
                  toast.success("Mobile wallet verified!");
                  setIsAddingMobile(false);
                  setSelectedMobileId("m-new"); // Mock selection
                }}
              />
            )}
          </div>
        </div>

        {/* RIGHT PANEL: AMOUNT, SECURITY & AUTHORIZATION */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm space-y-8">
            <WithdrawAmountInput
              amount={amount}
              onAmountChange={setAmount}
              currency={currency}
              balance={balance}
              loading={loading}
            />

            <div className="rounded-2xl bg-primary/5 border border-primary/10 p-6 space-y-4">
              <div className="flex justify-between items-center text-xs text-muted-foreground uppercase tracking-widest font-bold">
                <span>{t("transactions.withdraw.exchange_rate")}</span>
                <span className="bg-primary/10 px-2 py-0.5 rounded">
                  1 USD = {EXCHANGE_RATE} KES
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  {t("transactions.withdraw.equivalent_kes")}
                </div>
                <div className="text-2xl font-mono text-primary font-bold">
                  KES {kesEquivalent.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/40">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
                  {t("transactions.withdraw.secure_pin")}
                </Label>
                <div className="relative">
                  <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                  <Input
                    type="password"
                    maxLength={6}
                    placeholder="******"
                    className="pl-12 h-14 bg-background/40 border-border/60 rounded-2xl text-center text-2xl tracking-[0.8em] focus:ring-primary/20"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  {t("transactions.withdraw.pin_6digit_note")}
                </p>
              </div>

              <Button
                className="w-full h-16 text-lg font-medium shadow-xl shadow-primary/20 rounded-2xl group"
                onClick={handleWithdrawClick}
                disabled={isPinVerifying || profile?.is_suspended}
              >
                {isPinVerifying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {profile?.is_suspended ? "Account Suspended" : t("transactions.withdraw.withdraw_btn")}{" "}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-5 flex items-start gap-4">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("transactions.withdraw.withdraw_footer_note")}
            </p>
          </div>
        </div>
      </div>

      {/* Step-up Authentication Modal */}
      <StepUpAuthModal
        isOpen={showStepUp}
        onClose={() => setShowStepUp(false)}
        onVerified={handleStepUpVerified}
        purpose="high_value_withdrawal"
        description={`For your security, a verification code is required for withdrawals over $${STEP_UP_THRESHOLD}.`}
      />

      {/* Confirmation Dialog */}
      <Dialog open={status === "confirming"} onOpenChange={(o) => !o && setStatus("idle")}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-background border-border/50">
          <div className="p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-light">
                {t("transactions.withdraw.confirm_title")}
              </DialogTitle>
              <DialogDescription>{t("transactions.withdraw.confirm_desc")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-card/60 border border-border/50 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {t("transactions.withdraw.you_are_withdrawing")}
                  </span>
                  <span className="font-semibold text-foreground text-lg">
                    {currency === "KES" ? "KSH" : "$"}
                    {parseFloat(amount || "0").toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {t("transactions.withdraw.platform_fee")}
                  </span>
                  <span className="text-destructive font-medium">
                    {currency === "KES" ? "KSH " : "$"}
                    {fee.toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-primary/20 pt-4 flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {t("transactions.withdraw.total_deduction")}
                  </span>
                  <span className="text-xl font-mono text-primary font-bold">
                    {currency === "KES" ? "KSH" : "$"}
                    {totalDeduction.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" className="h-12" onClick={() => setStatus("idle")}>
                {t("transactions.withdraw.cancel")}
              </Button>
              <Button className="h-12" onClick={handleConfirmWithdraw}>
                {t("transactions.withdraw.yes_withdraw")}
              </Button>
            </div>
          </div>
          <div className="bg-primary/5 p-3 text-center border-t border-primary/10">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
              <LockIcon className="w-3 h-3" /> {t("transactions.withdraw.secure_encrypted_note")}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <KycGuardDialog />

      {/* Processing Overlay */}
      {status === "processing" && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-primary/10 animate-pulse" />
            <Loader2 className="w-24 h-24 text-primary animate-spin absolute inset-0" />
          </div>
          <h2 className="text-2xl font-light mt-8 tracking-tight">
            {t("transactions.withdraw.authorizing_withdrawal")}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {t("transactions.withdraw.verifying_pin_note")}
          </p>
          <div className="mt-12 flex gap-4">
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
          </div>
        </div>
      )}
    </div>
  );
}
