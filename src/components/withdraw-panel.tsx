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

import { useProfileSignal } from "@/lib/profile-signal";
import { evaluateTransaction } from "@/lib/fraud-protection";

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
  const [profile] = useProfileSignal();
  const { balance, currency, loading, updateBalance } = useWalletBalance();
  const [amount, setAmount] = useState<string>("");
  const [channel, setChannel] = useState<Channel>("bank");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<WithdrawalStatus>("idle");
  const [refCode, setRefCode] = useState("");
  const [mounted, setMounted] = useState(false);

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

    if (pin.length < 4) {
      toast.error(t("transactions.withdraw.enter_pin_error"));
      return;
    }

    try {
      let userId = profile?.id;
      if (!userId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id;
      }

      if (!userId) {
        throw new Error(t("transactions.deposit.session_error"));
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("pin_hash")
        .eq("id", userId)
        .single();

      if (profileError || !profileData) {
        console.error("Profile fetch error:", profileError);
        throw new Error(t("transactions.deposit.identity_error"));
      }

      const hashedPin = await hashPin(pin);
      if (profileData.pin_hash !== hashedPin) {
        setPin(""); // Clear invalid PIN
        throw new Error(t("transactions.withdraw.incorrect_pin_error"));
      }

      setStatus("confirming");
    } catch (error: any) {
      console.error("Withdrawal verification error:", error);
      toast.error(error.message || t("transactions.withdraw.verification_error"));
    }
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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
      <div className="rounded-3xl border border-border/50 bg-card/30 p-8 flex flex-col backdrop-blur-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-light tracking-tight">
            {channel === "bank" && t("transactions.withdraw.withdraw_to_bank")}
            {channel === "mobile" && t("transactions.withdraw.withdraw_to_mobile")}
          </h2>
          <div className="flex p-1 bg-background/60 border border-border/60 rounded-2xl">
            {[
              { id: "bank", label: t("transactions.withdraw.bank_accounts"), icon: Building2 },
              { id: "mobile", label: t("transactions.withdraw.mobile_money"), icon: Smartphone },
            ].map((t) => {
              const ActiveIcon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setChannel(t.id as Channel);
                    setSelectedId(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all",
                    channel === t.id
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ActiveIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-[300px] animate-in slide-in-from-left-4 duration-500">
          {channel === "bank" && (
            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
                  {t("transactions.withdraw.choose_bank")}
                </Label>
                <Select value={selectedBank || ""} onValueChange={setSelectedBank}>
                  <SelectTrigger className="h-14 bg-background/40 border-border/60 rounded-2xl text-base shadow-sm">
                    <SelectValue placeholder={t("transactions.withdraw.search_select_bank")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/50 shadow-xl max-h-[300px]">
                    {BANKS_LIST.map((b) => (
                      <SelectItem
                        key={b}
                        value={b}
                        className="rounded-xl py-3 px-4 focus:bg-primary/10"
                      >
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBank && (
                <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-4 p-5 rounded-2xl border border-primary/20 bg-primary/5 ring-1 ring-primary/10 shadow-lg shadow-primary/5">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shadow-inner">
                      {selectedBank.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-semibold text-foreground">{selectedBank}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("transactions.withdraw.external_bank_rail")}
                      </div>
                    </div>
                    <Check className="w-5 h-5 text-primary" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
                        {t("transactions.form.account_number")}
                      </Label>
                      <Input
                        placeholder="0000000000"
                        className="h-14 bg-background/40 border-border/60 rounded-2xl text-lg font-mono focus:ring-primary/20"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
                        {t("transactions.withdraw.account_holder_name")}
                      </Label>
                      <Input
                        placeholder={t("transactions.withdraw.full_name_records")}
                        className="h-14 bg-background/40 border-border/60 rounded-2xl text-base focus:ring-primary/20"
                        value={bankHolder}
                        onChange={(e) => setBankHolder(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {channel === "mobile" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3">
                {SAVED_MOBILE.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => {
                      setSelectedMobileId(wallet.id);
                      setIsAddingMobile(false);
                    }}
                    className={cn(
                      "flex items-center gap-4 p-5 rounded-2xl border text-left transition-all",
                      selectedMobileId === wallet.id && !isAddingMobile
                        ? "border-primary bg-primary/10 ring-1 ring-primary shadow-lg shadow-primary/5"
                        : "border-border/60 bg-background/20 hover:border-border",
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold",
                        wallet.color,
                      )}
                    >
                      {wallet.provider === "M-Pesa" ? "MP" : "AM"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{wallet.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{wallet.phone}</div>
                    </div>
                    {selectedMobileId === wallet.id && !isAddingMobile && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setIsAddingMobile(true);
                    setSelectedMobileId(null);
                  }}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-2xl border border-dashed text-left transition-all hover:bg-background/40",
                    isAddingMobile
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border/60",
                  )}
                >
                  <div className="w-12 h-12 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-medium">
                    {t("transactions.withdraw.withdraw_new_number")}
                  </div>
                </button>
              </div>

              {isAddingMobile && (
                <div className="p-6 rounded-2xl border border-border/60 bg-background/40 space-y-6 animate-in slide-in-from-top-4 duration-300">
                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
                      {t("transactions.withdraw.provider_choice")}
                    </Label>
                    <div className="flex gap-2 p-1 bg-background/60 rounded-xl border border-border/60">
                      {["M-Pesa", "Airtel Money"].map((p) => (
                        <button
                          key={p}
                          onClick={() => setNewMobile({ ...newMobile, provider: p })}
                          className={cn(
                            "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
                            newMobile.provider === p
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
                        {t("transactions.form.phone_number")}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          +254
                        </span>
                        <Input
                          placeholder="7XX XXX XXX"
                          className="pl-16 h-12 bg-background/60 rounded-xl"
                          value={newMobile.phone}
                          onChange={(e) => setNewMobile({ ...newMobile, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      onClick={() => {
                        if (!newMobile.phone) {
                          toast.error(t("common.errors.enter_phone"));
                          return;
                        }
                        toast.success("Mobile wallet verified!");
                        setIsAddingMobile(false);
                        setSelectedMobileId("m-new"); // Mock selection
                      }}
                    >
                      {t("transactions.withdraw.confirm_mobile_btn")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: AMOUNT, SECURITY & AUTHORIZATION */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">
                {t("transactions.withdraw.vault_balance_label", {
                  currency: mounted ? currency || "USD" : "",
                })}
              </Label>
              <LockIcon className="w-3.5 h-3.5 text-muted-foreground/60" />
            </div>
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  {t("transactions.withdraw.loading_balance")}
                </span>
              </div>
            ) : (
              <div className="text-4xl font-light text-primary tracking-tight">
                {currency === "KES" ? "KSH " : "$"}
                {balance?.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0.00"}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Label
              htmlFor="amount"
              className="text-xs uppercase tracking-wider text-muted-foreground ml-1"
            >
              {t("transactions.withdraw.withdrawal_amount", { currency: currency || "USD" })}
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-2xl font-light">
                {currency === "KES" ? "KSH" : "$"}
              </span>
              <Input
                id="amount"
                type="number"
                className="pl-16 h-16 bg-background/40 border-border/60 rounded-2xl text-3xl font-light focus:ring-primary/20"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-6 space-y-4">
            <div className="flex justify-between items-center text-xs text-muted-foreground uppercase tracking-widest font-bold">
              <span>{t("transactions.withdraw.exchange_rate")}</span>
              <span className="bg-primary/10 px-2 py-0.5 rounded">1 USD = {EXCHANGE_RATE} KES</span>
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
            >
              {t("transactions.withdraw.withdraw_btn")}{" "}
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
