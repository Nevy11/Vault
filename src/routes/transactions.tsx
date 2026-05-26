import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Lock,
  Settings,
  HelpCircle,
  Info,
  Check,
  RefreshCw,
  Smartphone,
  Loader2,
  CheckCircle2,
  Building2,
  UserCircle,
  ArrowRight,
  Landmark,
  CreditCard,
  User,
  History,
  Zap,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppShell } from "@/components/app-shell";
import { DepositPanel } from "@/components/deposit-panel";
import { WithdrawPanel } from "@/components/withdraw-panel";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { supabase } from "@/api/supabase";
import { initiateStkPush } from "@/api/daraja";
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
    <div className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-card/40 p-6 backdrop-blur-sm min-w-[240px] transition-all hover:bg-card/60 hover:border-primary/50 shadow-sm">
      {/* Decorative glass reflection */}
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-3xl transition-all group-hover:bg-primary/10" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
              Vault {currency} Wallet
            </div>
          </div>
          <Lock className="w-3.5 h-3.5 text-muted-foreground/40" />
        </div>

        <div className="flex flex-col">
          <div className="text-3xl font-semibold tracking-tight text-primary">
            {loading ? (
              <div className="h-9 w-32 bg-primary/10 animate-pulse rounded-lg" />
            ) : (
              `${currency === "USD" ? "$" : currency + " "}${balance?.toLocaleString() ?? "0.00"}`
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
              Active & Encrypted
            </span>
          </div>
        </div>
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
  "Equity Bank Kenya",
];

const MOBILE_PROVIDERS = ["M-Pesa", "Airtel Money", "T-Kash"];

interface Recipient {
  id: number;
  name: string;
  type: "vault" | "bank" | "mobile";
  identifier: string;
  avatar: string;
  avatarUrl?: string | null;
  color: string;
  bank?: string;
  provider?: string;
}

const RECENT_TRANSACTIONS: Recipient[] = [
  {
    id: 1,
    name: "Maria C.",
    type: "vault",
    identifier: "@maria",
    avatar: "MC",
    color: "bg-emerald-500",
  },
  {
    id: 2,
    name: "KCB Bank",
    type: "bank",
    identifier: "1234567890",
    avatar: "KCB",
    color: "bg-blue-600",
    bank: "KCB Bank (Kenya Commercial Bank)",
  },
  {
    id: 3,
    name: "John L.",
    type: "mobile",
    identifier: "+254712345678",
    avatar: "JL",
    color: "bg-amber-500",
    provider: "M-Pesa",
  },
  {
    id: 4,
    name: "Lisa M.",
    type: "vault",
    identifier: "@lisa",
    avatar: "LM",
    color: "bg-pink-500",
  },
];

const FREQUENT_TRANSACTIONS: Recipient[] = [
  {
    id: 1,
    name: "Maria C.",
    type: "vault",
    identifier: "@maria",
    avatar: "MC",
    color: "bg-emerald-500",
  },
  { id: 5, name: "Ben A.", type: "vault", identifier: "@ben", avatar: "BA", color: "bg-teal-500" },
  {
    id: 6,
    name: "Absa Bank",
    type: "bank",
    identifier: "0987654321",
    avatar: "Absa",
    color: "bg-red-600",
    bank: "Absa Bank Kenya",
  },
  {
    id: 7,
    name: "M-Pesa",
    type: "mobile",
    identifier: "+254722222222",
    avatar: "MP",
    color: "bg-green-600",
    provider: "M-Pesa",
  },
];

function SendPanel() {
  const { currency, refetch: refetchBalance } = useWalletBalance();
  const [method, setMethod] = useState<"vault" | "bank" | "mobile" | null>(null);
  const [amount, setAmount] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [bank, setBank] = useState("");
  const [provider, setProvider] = useState("M-Pesa");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState<"idle" | "confirming" | "processing" | "success">("idle");
  const [refCode, setRefCode] = useState("");

  // Recipient Lists State
  const [recentRecipients, setRecentRecipients] = useState<Recipient[]>([]);
  const [frequentRecipients, setFrequentRecipients] = useState<Recipient[]>([]);

  // Recipient Verification
  const [recipient, setRecipient] = useState<{ id: string; name: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchRecipients = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch Recent: Get last 10 unique receivers
        const { data: recentData } = await supabase
          .from("transactions")
          .select(
            `
            receiver_id,
            profiles:receiver_id (
            id,
            first_name,
            last_name,
            kyc_tag,
            profile_photo_url
            )
            `,
          )
          .eq("sender_id", user.id)
          .eq("type", "transfer")
          .order("created_at", { ascending: false })
          .limit(20);

        if (recentData) {
          const uniqueRecipients: Recipient[] = [];
          const seenIds = new Set();

          recentData.forEach((tx: any) => {
            if (tx.profiles && !seenIds.has(tx.receiver_id)) {
              seenIds.add(tx.receiver_id);
              uniqueRecipients.push({
                id: tx.receiver_id,
                name: `${tx.profiles.first_name} ${tx.profiles.last_name.charAt(0)}.`,
                type: "vault",
                identifier: tx.profiles.kyc_tag || "",
                avatar: tx.profiles.first_name.charAt(0) + tx.profiles.last_name.charAt(0),
                avatarUrl: tx.profiles.profile_photo_url,
                color: "bg-primary/20", // Could randomize this
              });
            }
          });
          setRecentRecipients(uniqueRecipients.slice(0, 5));
        }

        // Fetch Frequent: Get top recipients by frequency
        const { data: freqData } = await supabase
          .from("transactions")
          .select(
            `
            receiver_id,
            profiles:receiver_id (
            id,
            first_name,
            last_name,
            kyc_tag,
            profile_photo_url
            )
            `,
          )
          .eq("sender_id", user.id)
          .eq("type", "transfer");

        if (freqData) {
          const counts: Record<string, number> = {};
          const profileMap: Record<string, any> = {};

          freqData.forEach((tx: any) => {
            if (tx.profiles) {
              const rid = tx.receiver_id;
              counts[rid] = (counts[rid] || 0) + 1;
              profileMap[rid] = tx.profiles;
            }
          });

          const sortedRecipients = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id]) => {
              const p = profileMap[id];
              return {
                id: parseInt(id),
                name: `${p.first_name} ${p.last_name.charAt(0)}.`,
                type: "vault" as const,
                identifier: p.kyc_tag || "",
                avatar: p.first_name.charAt(0) + p.last_name.charAt(0),
                avatarUrl: p.profile_photo_url,
                color: "bg-primary/20",
              };
            });
          setFrequentRecipients(sortedRecipients);
        }
      } catch (err) {
        console.error("Error fetching recipients:", err);
        toast.error("Unable to load recipient suggestions. Please try again.");
      }
    };

    fetchRecipients();
  }, [status === "success"]); // Refresh lists when a new transfer succeeds

  useEffect(() => {
    const searchRecipient = async () => {
      // Remove any existing @ then add one to match DB format
      const searchTag = identifier.trim() ? `@${identifier.replace("@", "").toLowerCase()}` : "";

      if (method === "vault" && searchTag.length >= 4) {
        // @ + at least 3 chars
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      if (method === "vault") {
        const { data, error: rpcError } = await supabase.rpc("vault_transfer", {
          p_sender_id: user.id,
          p_recipient_tag: identifier,
          p_amount: parseFloat(amount),
        });

        if (rpcError) {
          console.error("RPC Error Details:", rpcError);
          throw new Error(rpcError.message || "Transfer failed at database level");
        }

        const result = Array.isArray(data) ? data[0] : data;

        if (!result?.success) {
          throw new Error(result?.message || "Transfer failed");
        }

        setRefCode(
          result.reference || `VT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        );

        // Refetch balance to show updated amount in profile immediately
        await refetchBalance();
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
          Your transfer of {currency} {parseFloat(amount).toLocaleString()} has been processed
          securely.
        </p>
        <div className="bg-card/40 border border-border/50 rounded-2xl p-6 w-full max-w-sm mb-8">
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">Transaction ID</span>
            <span className="font-mono font-medium">{refCode}</span>
          </div>
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">Amount Deducted</span>
            <span className="font-medium">
              {currency} {total.toLocaleString()}
            </span>
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
        <h3 className="text-lg font-light tracking-tight">
          Step 1: Choose Financial Provider Type
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setMethod("vault")}
            className={cn(
              "p-6 rounded-2xl border transition-all text-left group",
              method === "vault"
                ? "border-primary bg-primary/10"
                : "border-border/50 bg-card/30 hover:bg-card/50",
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                method === "vault" ? "bg-primary text-white" : "bg-primary/10 text-primary",
              )}
            >
              <User className="w-6 h-6" />
            </div>
            <div className="text-base font-medium">Vault Account (P2P)</div>
            <p className="text-xs text-muted-foreground mt-1">Instant internal transfer</p>
          </button>
          <button
            onClick={() => setMethod("bank")}
            className={cn(
              "p-6 rounded-2xl border transition-all text-left group",
              method === "bank"
                ? "border-primary bg-primary/10"
                : "border-border/50 bg-card/30 hover:bg-card/50",
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                method === "bank" ? "bg-primary text-white" : "bg-primary/10 text-primary",
              )}
            >
              <Landmark className="w-6 h-6" />
            </div>
            <div className="text-base font-medium">Bank Account</div>
            <p className="text-xs text-muted-foreground mt-1">Send to any Kenyan bank</p>
          </button>
          <button
            onClick={() => setMethod("mobile")}
            className={cn(
              "p-6 rounded-2xl border transition-all text-left group",
              method === "mobile"
                ? "border-primary bg-primary/10"
                : "border-border/50 bg-card/30 hover:bg-card/50",
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                method === "mobile" ? "bg-primary text-white" : "bg-primary/10 text-primary",
              )}
            >
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
              {method === "bank" &&
                (bank ? `Send Money to ${bank.split(" (")[0]}` : "Send Money to Bank Account")}
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
                          provider === p
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                      @
                    </span>
                  )}
                  <Input
                    placeholder={
                      method === "vault"
                        ? "username"
                        : method === "bank"
                          ? "0000000000"
                          : "+254 7XX XXX XXX"
                    }
                    className={cn(
                      "bg-background/40 h-12 border-border/60",
                      method === "vault" && "pl-8",
                    )}
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
                        <span className="text-[10px] text-destructive font-medium uppercase tracking-tighter">
                          Not Found
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount ({currency})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {currency}
                  </span>
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
                <p className="text-[10px] text-muted-foreground text-center">
                  6-digit secure transaction code
                </p>
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
        {(recentRecipients.length > 0 || isSearching) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <History className="w-4 h-4" /> Recent Transactions
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {recentRecipients.map((r) => (
                <button
                  key={`recent-${r.id}`}
                  onClick={() => handleSelectRecipient(r)}
                  className="flex-shrink-0 w-36 p-4 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/60 transition-colors text-left"
                >
                  <Avatar className="w-10 h-10 mb-3 border border-border/40">
                    <AvatarImage src={r.avatarUrl} />
                    <AvatarFallback className={cn("text-xs font-bold", r.color)}>
                      {r.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{r.identifier}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {frequentRecipients.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Zap className="w-4 h-4" /> Most Frequent
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {frequentRecipients.map((r) => (
                <button
                  key={`freq-${r.id}`}
                  onClick={() => handleSelectRecipient(r)}
                  className="flex-shrink-0 w-36 p-4 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/60 transition-colors text-left"
                >
                  <Avatar className="w-10 h-10 mb-3 border border-border/40">
                    <AvatarImage src={r.avatarUrl} />
                    <AvatarFallback className={cn("text-xs font-bold", r.color)}>
                      {r.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{r.identifier}</div>
                </button>
              ))}
            </div>
          </div>
        )}
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
                <span className="font-semibold text-foreground">
                  {recipient ? recipient.name : identifier}
                </span>
              </div>
              {recipient && (
                <div className="flex justify-between text-[10px] -mt-2">
                  <span className="text-muted-foreground italic">KYC Tag Verified</span>
                  <span className="text-primary font-mono">@{identifier.replace("@", "")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Via</span>
                <span className="font-medium capitalize">
                  {method} {bank && `- ${bank.split(" (")[0]}`}
                </span>
              </div>
              <div className="border-t border-border/50 pt-3 flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">
                  {currency} {parseFloat(amount || "0").toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transaction Fee</span>
                <span className="font-medium text-destructive">
                  {currency} {fee.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-primary/20 pt-3 flex justify-between text-base font-semibold">
                <span>Total Deducted</span>
                <span className="text-primary font-mono">
                  {currency} {total.toLocaleString()}
                </span>
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
          <p className="text-sm text-muted-foreground mt-2">
            Verifying PIN and checking ledger balance
          </p>
        </div>
      )}
    </div>
  );
}

function TransactionHistory() {
  const { balance, currency, loading: balanceLoading } = useWalletBalance();
  const { transactions, loading: txLoading } = useTransactions(!balanceLoading);
  const [profile] = useProfileSignal();

  const getTransactionDetails = (t: any) => {
    console.log("Processing transaction:", t);
    const isSender = t.sender_id === (profile as any)?.id;
    const userName = profile?.first_name 
      ? `${profile.first_name} ${profile.last_name || ""}`.trim()
      : (profile?.email?.split('@')[0] || "Vault User");
    const symbol = currency === 'USD' ? '$' : currency + ' ';

    if (t.type === 'transfer') {
      if (isSender) {
        return {
          title: `Transfer to ${t.receiver?.first_name} ${t.receiver?.last_name}`,
          amount: `-${symbol}${t.amount.toLocaleString()}`,
          positive: false,
          icon: t.receiver?.first_name?.[0] || 'V',
          avatarUrl: t.receiver?.profile_photo_url,
          color: "bg-primary/20 text-primary",
        };
      } else {
        return {
          title: `Received from ${t.sender?.first_name} ${t.sender?.last_name}`,
          amount: `+${symbol}${t.amount.toLocaleString()}`,
          positive: true,
          icon: t.sender?.first_name?.[0] || 'V',
          avatarUrl: t.sender?.profile_photo_url,
          color: "bg-emerald-500/20 text-emerald-500",
        };
      }
    } else if (t.type === 'deposit') {
      const bankName = t.method === 'mpesa' ? 'M-Pesa' : (t.description?.includes('Ref:') ? 'Bank' : t.method);
      const initials = bankName.substring(0, 2).toUpperCase();
      console.log("Deposit Avatar URL:", t.sender?.profile_photo_url || profile?.profile_photo_url);
      return {
        title: `${bankName} deposit to ${userName}`,
        amount: `+${symbol}${t.amount.toLocaleString()}`,
        positive: true,
        icon: initials,
        avatarUrl: t.sender?.profile_photo_url || profile?.profile_photo_url || null,
        color: "bg-emerald-500/20 text-emerald-500",
      };
    } else if (t.type === 'withdrawal') {
      const bankName = t.method === 'mpesa' ? 'M-Pesa' : (t.description?.includes('Ref:') ? 'Bank' : t.method);
      return {
        title: `Withdrawal to ${bankName}`,
        amount: `-${symbol}${t.amount.toLocaleString()}`,
        positive: false,
        icon: bankName.substring(0, 2).toUpperCase(),
        // Always prefer the user's own profile photo for withdrawal entries
        avatarUrl: profile?.profile_photo_url || t.receiver?.profile_photo_url || null,
        color: "bg-destructive/20 text-destructive",
      };
    }
    return {
      title: t.description,
      amount: `${symbol}${t.amount.toLocaleString()}`,
      positive: true,
      icon: '?',
      avatarUrl: null,
      color: "bg-secondary text-secondary-foreground",
    };
  };

  const currencySymbol = currency === 'USD' ? '$' : currency + ' ';

  return (
    <div className="mt-12 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-light tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-primary" /> 
          Detailed Ledger History
        </h2>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/40">
          Zero-Trust Immutable Records
        </div>
      </div>

      <div className="rounded-2xl bg-card/30 border border-border/40 p-4 sm:p-6 backdrop-blur-sm shadow-inner">
        <ul className="divide-y divide-border/40">
          {txLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
              <p className="text-xs text-muted-foreground animate-pulse">Syncing transaction ledger...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No activity found in your ledger history.</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-tighter">Initialize your first transaction to see records here.</p>
            </div>
          ) : (
            transactions.map((t) => {
              const details = getTransactionDetails(t);
              return (
                <li key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4 transition-colors hover:bg-white/5 group px-2 rounded-lg -mx-2">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center w-12 shrink-0">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground/60 mb-1">
                        {format(new Date(t.created_at), "MMM")}
                      </span>
                      <span className="text-lg font-serif leading-none">
                        {format(new Date(t.created_at), "dd")}
                      </span>
                    </div>
                    <Avatar className="w-10 h-10 border border-border/40 shrink-0 group-hover:scale-105 transition-transform">
                      <AvatarImage src={details.avatarUrl || undefined} />
                      <AvatarFallback className={cn("text-xs font-bold", details.color)}>
                        {details.icon}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{details.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter ${
                          t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                          t.status === 'pending' ? 'bg-amber-500/10 text-amber-500 animate-pulse' :
                          'bg-destructive/10 text-destructive'
                        }`}>
                          {t.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {format(new Date(t.created_at), "h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto pl-16 sm:pl-0">
                    <div
                      className={`text-base font-semibold font-mono ${details.positive ? "text-primary" : "text-destructive"}`}
                    >
                      {details.amount}
                    </div>
                    <div className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">
                      Bal: {currencySymbol}{t.balance_after?.toLocaleString() || balance?.toLocaleString()}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
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
    navigate({ search: { mode: newMode } });
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
        {/* Back Button */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

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
