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
import { DepositPanel } from "@/components/deposit-panel";
import { WithdrawPanel } from "@/components/withdraw-panel";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
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
import { cn, hashPin } from "@/lib/utils";

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
  const { balance, currency, loading } = useWalletBalance();

  return (
    <div className="rounded-2xl border border-primary/40 bg-card/40 p-5 backdrop-blur-sm min-w-[200px]">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Vault {currency} Wallet
        </div>
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="mt-3 text-3xl font-light text-primary">
        {loading ? (
          <div className="h-9 w-24 bg-primary/10 animate-pulse rounded" />
        ) : (
          `${currency === "USD" ? "$" : currency + " "}${balance?.toLocaleString() ?? "0.00"}`
        )}
      </div>
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
  const { currency, refetch } = useWalletBalance();
  const [method, setMethod] = useState<"vault" | "bank" | "mobile" | null>(null);
  const [amount, setAmount] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [bank, setBank] = useState("");
  const [provider, setProvider] = useState("M-Pesa");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "confirming" | "processing" | "success">("idle");
  const [refCode, setRefCode] = useState("");
  
  // Recipient Verification
  const [recipient, setRecipient] = useState<{ id: string; name: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const searchRecipient = async () => {
      // Remove any existing @ then add one to match DB format
      const searchTag = identifier.trim() ? `@${identifier.replace("@", "").toLowerCase()}` : "";
      
      if (method === "vault" && searchTag.length >= 4) { // @ + at least 3 chars
        setIsSearching(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("kyc_tag", searchTag) // DB tags start with @ and are lowercase
          .maybeSingle();
        
        if (data) {
          setRecipient({ id: data.id, name: `${data.first_name} ${data.last_name}` });
        } else {
          setRecipient(null);
        }
        setIsSearching(false);
      } else {
        setRecipient(null);
      }
    };

    const timer = setTimeout(searchRecipient, 400);
    return () => clearTimeout(timer);
  }, [identifier, method]);

  const fee = method === "vault" ? 0.0 : 15.0;
  const total = parseFloat(amount || "0") + fee;

  const handleSelectRecipient = (r: Recipient) => {
    setMethod(r.type);
    setIdentifier(r.identifier);
    if (r.bank) setBank(r.bank);
    if (r.provider) setProvider(r.provider);
  };

  const handleSendClick = async () => {
    if (!amount || !identifier || (method === "bank" && !bank) || !pin) {
      toast.error("Please fill all required fields");
      return;
    }
    if (pin.length !== 6) {
      toast.error("PIN must be 6 digits");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Authentication required");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("pin_hash")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        toast.error("Error verifying PIN");
        return;
      }

      const hashedPin = await hashPin(pin);
      if (profile.pin_hash !== hashedPin) {
        toast.error("Incorrect transaction PIN");
        return;
      }

      setStatus("confirming");
    } catch (error) {
      console.error("PIN verification error:", error);
      toast.error("An error occurred while verifying your PIN");
    }
  };

  const handleConfirm = async () => {
    setStatus("processing");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      if (method === "vault") {
        const { data, error: rpcError } = await supabase.rpc("vault_transfer", {
          p_sender_id: user.id,
          p_recipient_tag: identifier,
          p_amount: parseFloat(amount)
        });

        if (rpcError) {
          console.error("RPC Error Details:", rpcError);
          throw new Error(rpcError.message || "Transfer failed at database level");
        }
        
        const result = Array.isArray(data) ? data[0] : data;

        if (!result?.success) {
          throw new Error(result?.message || "Transfer failed");
        }

        setRefCode(result.reference || `VT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
        
        // Refetch balance to show updated amount in profile immediately
        await refetch();
      } else {
        // Mock for other methods for now
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setRefCode(`VT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
      }

      setStatus("success");
      toast.success("Transfer completed successfully!");
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast.error(error.message || "An unexpected error occurred during transfer");
      setStatus("idle");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-6">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">Transfer Successful!</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Your transfer of {currency} {parseFloat(amount).toLocaleString()} has been processed securely.
        </p>
        <div className="bg-card/40 border border-border/50 rounded-2xl p-6 w-full max-w-sm mb-8">
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">Transaction ID</span>
            <span className="font-mono font-medium">{refCode}</span>
          </div>
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">Amount Deducted</span>
            <span className="font-medium">{currency} {total.toLocaleString()}</span>
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
                  {method === "vault" && identifier.length >= 3 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : recipient ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium animate-in fade-in zoom-in duration-300">
                          <Check className="w-3 h-3" /> {recipient.name}
                        </div>
                      ) : (
                        <span className="text-[10px] text-destructive font-medium uppercase tracking-tighter">Not Found</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount ({currency})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
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
                  maxLength={6}
                  placeholder="******"
                  className="bg-background/40 h-12 border-border/60 text-center text-xl tracking-[1em]"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <p className="text-[10px] text-muted-foreground text-center">6-digit secure transaction code</p>
              </div>

              <Button 
                size="lg" 
                className="w-full h-14 text-base font-medium shadow-lg shadow-primary/20"
                onClick={handleSendClick}
                disabled={method === "vault" && !recipient}
              >
                Send Money <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

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
                <span className="font-semibold text-foreground">{recipient ? recipient.name : identifier}</span>
              </div>
              {recipient && (
                <div className="flex justify-between text-[10px] -mt-2">
                  <span className="text-muted-foreground italic">KYC Tag Verified</span>
                  <span className="text-primary font-mono">@{identifier.replace("@", "")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Via</span>
                <span className="font-medium capitalize">{method} {bank && `- ${bank.split(" (")[0]}`}</span>
              </div>
              <div className="border-t border-border/50 pt-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{currency} {parseFloat(amount || "0").toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction Fee</span>
                <span className="font-medium text-destructive">{currency} {fee.toLocaleString()}</span>
              </div>
              <div className="border-t border-primary/20 pt-3 flex justify-between text-base font-semibold">
                <span>Total Deducted</span>
                <span className="text-primary font-mono">{currency} {total.toLocaleString()}</span>
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
    navigate({ search: (prev: any) => ({ ...prev, mode: newMode }) });
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
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <h1 className="text-3xl font-light tracking-tight">{titles[mode]}</h1>
          {mode === "send" && (
            <div className="relative w-full max-w-xs">
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
