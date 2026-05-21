import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { 
  Search, Lock, Settings, HelpCircle, Info, Check, RefreshCw, 
  Smartphone, Loader2, CheckCircle2, Building2, UserCircle, 
  ArrowRight, Landmark, CreditCard, User, History, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/lib/supabase";
import { initiateStkPush } from "@/lib/daraja";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const transactionsSearchSchema = z.object({
  mode: z.enum(["send", "deposit", "withdraw"]).optional(),
});

export const Route = createFileRoute("/transactions")({
  validateSearch: (search) => transactionsSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Transactions — Vault OS" },
      {
        name: "description",
        content: "Send money, deposit funds, and withdraw across your Vault accounts.",
      },
    ],
  }),
  component: TransactionsPage,
});

type Mode = "send" | "deposit" | "withdraw";

function WalletCard() {
  return (
    <div className="rounded-2xl border border-primary/40 bg-card/40 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Vault USD Wallet
        </div>
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="mt-3 text-3xl font-light text-primary">$12,450.75</div>
    </div>
  );
}

const BANKS = [
  "KCB Bank (Kenya Commercial Bank)",
  "Co-operative Bank of Kenya",
  "NCBA Bank",
  "Absa Bank Kenya",
  "Standard Chartered Kenya",
  "Stanbic Bank Kenya",
  "I&M Bank",
  "DTB (Diamond Trust Bank)",
  "Family Bank",
];

const MOBILE_PROVIDERS = ["M-Pesa", "Airtel Money", "T-Kash"];

interface Recipient {
  id: number;
  name: string;
  type: "vault" | "bank" | "mobile";
  identifier: string;
  avatar: string;
  color: string;
  bank?: string;
  provider?: string;
}

const RECENT_TRANSACTIONS: Recipient[] = [
  { id: 1, name: "Maria C.", type: "vault", identifier: "@maria", avatar: "MC", color: "bg-emerald-500" },
  { id: 2, name: "KCB Bank", type: "bank", identifier: "1234567890", avatar: "KCB", color: "bg-blue-600", bank: "KCB Bank (Kenya Commercial Bank)" },
  { id: 3, name: "John L.", type: "mobile", identifier: "+254712345678", avatar: "JL", color: "bg-amber-500", provider: "M-Pesa" },
  { id: 4, name: "Lisa M.", type: "vault", identifier: "@lisa", avatar: "LM", color: "bg-pink-500" },
];

const FREQUENT_TRANSACTIONS: Recipient[] = [
  { id: 1, name: "Maria C.", type: "vault", identifier: "@maria", avatar: "MC", color: "bg-emerald-500" },
  { id: 5, name: "Ben A.", type: "vault", identifier: "@ben", avatar: "BA", color: "bg-teal-500" },
  { id: 6, name: "Absa Bank", type: "bank", identifier: "0987654321", avatar: "Absa", color: "bg-red-600", bank: "Absa Bank Kenya" },
  { id: 7, name: "M-Pesa", type: "mobile", identifier: "+254722222222", avatar: "MP", color: "bg-green-600", provider: "M-Pesa" },
];

function SendPanel() {
  const [method, setMethod] = useState<"vault" | "bank" | "mobile" | null>(null);
  const [amount, setAmount] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [bank, setBank] = useState("");
  const [provider, setProvider] = useState("M-Pesa");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "confirming" | "processing" | "success">("idle");
  const [refCode, setRefCode] = useState("");

  const fee = 15.0; // Flat fee for simulation
  const total = parseFloat(amount || "0") + fee;

  const handleSelectRecipient = (r: Recipient) => {
    setMethod(r.type);
    setIdentifier(r.identifier);
    if (r.bank) setBank(r.bank);
    if (r.provider) setProvider(r.provider);
  };

  const handleSendClick = () => {
    if (!amount || !identifier || (method === "bank" && !bank) || !pin) {
      toast.error("Please fill all required fields");
      return;
    }
    if (pin.length !== 4) {
      toast.error("PIN must be 4 digits");
      return;
    }
    setStatus("confirming");
  };

  const handleConfirm = async () => {
    setStatus("processing");
    // Simulate backend processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setRefCode(`VT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
    setStatus("success");
    toast.success("Transfer completed successfully!");
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Transfer Successful!</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Your transfer of KES {parseFloat(amount).toLocaleString()} has been processed securely.
        </p>
        <div className="bg-card/40 border border-border/50 rounded-2xl p-6 w-full max-w-sm mb-8">
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">Transaction ID</span>
            <span className="font-mono font-medium">{refCode}</span>
          </div>
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">Amount Deducted</span>
            <span className="font-medium">KES {total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="text-primary font-medium">Completed</span>
          </div>
        </div>
        <Button variant="outline" className="w-full max-w-xs" asChild>
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Lists */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <History className="w-4 h-4" /> Recent Transactions
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {RECENT_TRANSACTIONS.map((r) => (
              <button
                key={`recent-${r.id}`}
                onClick={() => handleSelectRecipient(r)}
                className="flex-shrink-0 w-36 p-4 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/60 transition-colors text-left"
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold mb-3", r.color)}>
                  {r.avatar}
                </div>
                <div className="text-sm font-medium truncate">{r.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{r.identifier}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Zap className="w-4 h-4" /> Most Frequent
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {FREQUENT_TRANSACTIONS.map((r) => (
              <button
                key={`freq-${r.id}`}
                onClick={() => handleSelectRecipient(r)}
                className="flex-shrink-0 w-36 p-4 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/60 transition-colors text-left"
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold mb-3", r.color)}>
                  {r.avatar}
                </div>
                <div className="text-sm font-medium truncate">{r.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{r.identifier}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Step 1: Provider Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-light tracking-tight">Step 1: Choose Financial Provider Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setMethod("vault")}
            className={cn(
              "p-6 rounded-2xl border transition-all text-left group",
              method === "vault" ? "border-primary bg-primary/10" : "border-border/50 bg-card/30 hover:bg-card/50"
            )}
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors", method === "vault" ? "bg-primary text-white" : "bg-primary/10 text-primary")}>
              <User className="w-6 h-6" />
            </div>
            <div className="text-base font-medium">Vault Account (P2P)</div>
            <p className="text-xs text-muted-foreground mt-1">Instant internal transfer</p>
          </button>
          <button
            onClick={() => setMethod("bank")}
            className={cn(
              "p-6 rounded-2xl border transition-all text-left group",
              method === "bank" ? "border-primary bg-primary/10" : "border-border/50 bg-card/30 hover:bg-card/50"
            )}
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors", method === "bank" ? "bg-primary text-white" : "bg-primary/10 text-primary")}>
              <Landmark className="w-6 h-6" />
            </div>
            <div className="text-base font-medium">Bank Account</div>
            <p className="text-xs text-muted-foreground mt-1">Send to any Kenyan bank</p>
          </button>
          <button
            onClick={() => setMethod("mobile")}
            className={cn(
              "p-6 rounded-2xl border transition-all text-left group",
              method === "mobile" ? "border-primary bg-primary/10" : "border-border/50 bg-card/30 hover:bg-card/50"
            )}
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors", method === "mobile" ? "bg-primary text-white" : "bg-primary/10 text-primary")}>
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="text-base font-medium">Mobile Money</div>
            <p className="text-xs text-muted-foreground mt-1">Send to M-Pesa or Airtel</p>
          </button>
        </div>
      </div>

      {/* Step 2: Dynamic Form */}
      {method && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-light tracking-tight">
              {method === "vault" && "Vault-to-Vault Transfer"}
              {method === "bank" && (bank ? `Send Money to ${bank.split(" (")[0]}` : "Send Money to Bank Account")}
              {method === "mobile" && "Send Money to Mobile Wallet"}
            </h3>
            <WalletCard />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card/30 border border-border/50 rounded-3xl p-8 backdrop-blur-sm">
            <div className="space-y-5">
              {method === "bank" && (
                <div className="space-y-2">
                  <Label>Select Bank</Label>
                  <Select value={bank} onValueChange={setBank}>
                    <SelectTrigger className="bg-background/40 h-12 border-border/60">
                      <SelectValue placeholder="Choose a bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {BANKS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {method === "mobile" && (
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-background/40 border border-border/60 rounded-lg">
                    {MOBILE_PROVIDERS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setProvider(p)}
                        className={cn(
                          "py-2 rounded-md text-sm font-medium transition-all",
                          provider === p ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  {method === "vault" && "Recipient Username / Tag"}
                  {method === "bank" && "Account Number"}
                  {method === "mobile" && "Phone Number"}
                </Label>
                <div className="relative">
                  {method === "vault" && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">@</span>
                  )}
                  <Input
                    placeholder={
                      method === "vault" ? "username" : 
                      method === "bank" ? "0000000000" : 
                      "+254 7XX XXX XXX"
                    }
                    className={cn("bg-background/40 h-12 border-border/60", method === "vault" && "pl-8")}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount (KES)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">KES</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="bg-background/40 h-12 pl-12 border-border/60 text-lg font-medium"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-5 flex flex-col justify-end">
              <div className="space-y-2">
                <Label>Vault Transaction PIN</Label>
                <Input
                  type="password"
                  maxLength={4}
                  placeholder="****"
                  className="bg-background/40 h-12 border-border/60 text-center text-xl tracking-[1em]"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground text-center">4-digit secure transaction code</p>
              </div>

              <Button 
                size="lg" 
                className="w-full h-14 text-base font-medium shadow-lg shadow-primary/20"
                onClick={handleSendClick}
              >
                Send Money <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Dialog open={status === "confirming"} onOpenChange={(open) => !open && setStatus("idle")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Transaction</DialogTitle>
            <DialogDescription>
              Please verify the transfer details before proceeding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-2xl bg-muted/50 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recipient</span>
                <span className="font-medium">{identifier}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Via</span>
                <span className="font-medium capitalize">{method} {bank && `- ${bank.split(" (")[0]}`}</span>
              </div>
              <div className="border-t border-border/50 pt-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">KES {parseFloat(amount || "0").toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction Fee</span>
                <span className="font-medium text-destructive">KES {fee.toLocaleString()}</span>
              </div>
              <div className="border-t border-primary/20 pt-3 flex justify-between text-base font-semibold">
                <span>Total Deducted</span>
                <span className="text-primary font-mono">KES {total.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex sm:justify-between gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setStatus("idle")}>
              NO, CANCEL
            </Button>
            <Button className="flex-1" onClick={handleConfirm}>
              YES, CONFIRM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Processing Overlay */}
      {status === "processing" && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 animate-pulse" />
            <Loader2 className="w-24 h-24 text-primary animate-spin absolute inset-0" />
          </div>
          <h2 className="text-xl font-medium mt-8">Processing transfer securely...</h2>
          <p className="text-sm text-muted-foreground mt-2">Verifying PIN and checking ledger balance</p>
        </div>
      )}
    </div>
  );
}

function DepositPanel() {
  const [method, setMethod] = useState("stripe");
  const [amount, setAmount] = useState("");
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [phoneMode, setPhoneMode] = useState<"saved" | "custom">("saved");
  const [customPhone, setCustomPhone] = useState("");
  const [loadingPhone, setLoadingPhone] = useState(false);
  const [depositing, setDepositing] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingPhone(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setLoadingPhone(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("phone_number")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      const p = (data?.phone_number as string | undefined) ?? null;
      setSavedPhone(p);
      setPhoneMode(p ? "saved" : "custom");
      setLoadingPhone(false);
    })();
    return () => { active = false; };
  }, []);

  const methods = [
    {
      id: "stripe",
      title: "Visa/Mastercard (via Stripe)",
      sub: "Card **** 1234",
      fee: "Fee: $0.00 (Vault Covered)",
    },
    {
      id: "mpesa",
      title: "M-Pesa (Mobile Money)",
      sub: "Lipa na M-Pesa STK Push",
      fee: "Fee: 1.0% (M-Pesa Standard)",
    },
    {
      id: "flutterwave",
      title: "Flutterwave",
      sub: "Mobile Money / USSD",
      fee: "Fee: External",
    },
    {
      id: "ach",
      title: "Connected Chase Account (ACH)",
      sub: "Standard ACH Transfer",
      fee: "",
    },
  ];

  const targetPhone = phoneMode === "saved" ? savedPhone : customPhone.trim();
  const validPhone = !!targetPhone && /^\+?\d[\d\s-]{6,}$/.test(targetPhone);
  const canSubmit = (method !== "mpesa" && method !== "flutterwave") || validPhone;
  const isMpesa = method === "mpesa";

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (isMpesa) {
      if (!targetPhone) {
        toast.error("Please provide a phone number");
        return;
      }
      
      setDepositing(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        await initiateStkPush({
          userId: user.id,
          phoneNumber: targetPhone,
          amount: parseFloat(amount),
        });
        toast.success("STK Push sent! Please check your phone to complete the payment.");
      } catch (error: any) {
        toast.error(error.message || "Failed to initiate M-Pesa deposit");
      } finally {
        setDepositing(false);
      }
    } else if (method === "flutterwave") {
      toast.info("Flutterwave integration is not yet complete. Please use M-Pesa or other methods.");
    }
    else {
      toast.info("This payment method is not yet integrated.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <div className="space-y-4">
        <WalletCard />
        <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
          <label className="text-xs text-muted-foreground">Deposit Amount</label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
            <span className="text-muted-foreground">$</span>
            <input 
              className="flex-1 bg-transparent text-lg outline-none" 
              placeholder="0.00" 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/30 p-5 flex flex-col">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
          Select Payment Method
        </div>
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2">
          {methods.map((m) => {
            const active = method === m.id;
            return (
              <div key={m.id}>
              <button
                onClick={() => setMethod(m.id)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${
                  active ? "border-primary bg-primary/10" : "border-border/60 hover:border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${
                      active ? "bg-primary border-primary" : "border-border"
                    }`}
                  >
                    {active && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{m.sub}</div>
                    {m.fee && <div className="text-xs text-muted-foreground mt-0.5">{m.fee}</div>}
                  </div>
                </div>
              </button>
              {active && (m.id === "flutterwave" || m.id === "mpesa") && (
                <div className="mt-2 ml-2 rounded-xl border border-border/50 bg-background/40 p-4 space-y-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" /> Mobile Money Number
                  </div>
                  {loadingPhone ? (
                    <div className="text-xs text-muted-foreground">Loading saved number…</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!savedPhone}
                        onClick={() => setPhoneMode("saved")}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          phoneMode === "saved" && savedPhone
                            ? "border-primary bg-primary/10"
                            : "border-border/60 hover:border-border"
                        } ${!savedPhone ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Saved
                        </div>
                        <div className="text-sm font-medium mt-0.5 truncate">
                          {savedPhone ?? "No number on file"}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhoneMode("custom")}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          phoneMode === "custom"
                            ? "border-primary bg-primary/10"
                            : "border-border/60 hover:border-border"
                        }`}
                      >
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Other
                        </div>
                        <div className="text-sm font-medium mt-0.5">Enter number</div>
                      </button>
                    </div>
                  )}
                  {phoneMode === "custom" && (
                    <div>
                      <Input
                        type="tel"
                        inputMode="tel"
                        placeholder="+254 7XX XXX XXX"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        className="bg-background/60"
                      />
                      {!validPhone && customPhone.length > 0 && (
                        <p className="text-[11px] text-destructive mt-1">
                          Enter a valid phone number
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    A push prompt will be sent to {targetPhone || "this number"} to confirm the deposit.
                  </p>
                </div>
              )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3" /> Integer cent precision applied (Source 20).
        </div>
        <Button 
          className="mt-4 w-full" 
          disabled={!canSubmit || depositing}
          onClick={handleDeposit}
        >
          {depositing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Deposit Funds"
          )}
        </Button>
      </div>
    </div>
  );
}

function WithdrawPanel() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      <div className="space-y-4">
        <WalletCard />
        <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
          <label className="text-xs text-muted-foreground">Withdrawal Amount</label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
            <span className="text-muted-foreground">$</span>
            <input className="flex-1 bg-transparent text-lg outline-none" placeholder="" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card/30 p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Select Recipient
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-4">
          <span>[ Vault Contacts ]</span>
          <span className="text-primary">[ Bank Accounts ]</span>
          <span>[ Mobile Money ]</span>
        </div>

        <ul className="space-y-3 mb-5">
          <li className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-xs">
              B
            </div>
            <div>
              <div className="text-sm font-medium">Bank of America</div>
              <div className="text-[11px] text-muted-foreground">(Source 88)</div>
            </div>
          </li>
          <li className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
              C
            </div>
            <div>
              <div className="text-sm font-medium">Chase Bank</div>
              <div className="text-[11px] text-muted-foreground">(Source 88)</div>
            </div>
          </li>
        </ul>

        <div className="flex justify-between text-xs text-muted-foreground border-t border-border/40 pt-3">
          <span>Exchange Rate (USD/KES):</span>
          <span className="text-foreground">130.00</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Equivalent:</span>
          <span className="text-foreground">KES 0.00</span>
        </div>

        <div className="mt-5 rounded-xl border border-border/60 p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Account Verification Required
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Verification needed for large bank transfers. (Source 23/81 84).
          </p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">PIN</span>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="w-2 h-2 rounded-full bg-primary" />
                ))}
              </div>
            </div>
            <button className="w-8 h-8 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="w-3 h-3" /> Verify account or select method
        </div>
        <Button className="mt-3 w-full" disabled>
          Withdraw Funds
        </Button>
      </div>
    </div>
  );
}

function TransactionsPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [mode, setMode] = useState<Mode>(initialMode || "send");

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    navigate({ search: (prev) => ({ ...prev, mode: newMode }) });
  };

  const tabs: { id: Mode; label: string }[] = [
    { id: "send", label: "Send Money" },
    { id: "deposit", label: "Deposit" },
    { id: "withdraw", label: "Withdraw" },
  ];

  const titles: Record<Mode, string> = {
    send: "Send Money",
    deposit: "Deposit Funds",
    withdraw: "Withdrawal",
  };

  return (
    <AppShell>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full border border-border/50 bg-card/40 p-1 backdrop-blur-sm">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => handleModeChange(t.id)}
                className={`px-5 py-2 rounded-full text-sm transition-colors ${
                  mode === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-light tracking-tight">{titles[mode]}</h1>
          {mode === "send" && (
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9 bg-card/40" />
            </div>
          )}
        </div>

        {mode === "send" && <SendPanel />}
        {mode === "deposit" && <DepositPanel />}
        {mode === "withdraw" && <WithdrawPanel />}
      </main>
    </AppShell>
  );
}
