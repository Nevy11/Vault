import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  Plus,
  Trash2,
  Users,
  Clock,
  Home,
  Utensils,
  ShoppingBag,
  Tv,
  Tag,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingCart,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppShell } from "@/components/app-shell";
import { DepositPanel } from "@/components/deposit-panel";
import { WithdrawPanel } from "@/components/withdraw-panel";
import { TransactionPinModal } from "@/components/transaction-pin-modal";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { useTransactions } from "@/hooks/use-transactions";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/api/supabase";
import { initiateStkPush } from "@/api/daraja";
import { toast } from "sonner";
import { format } from "date-fns";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn, hashPin } from "@/lib/utils";
import i18n from "@/lib/i18n";

const transactionsSearchSchema = z.object({
  mode: z.enum(["send", "deposit", "withdraw", "split"]).optional(),
});

export const Route = createFileRoute("/transactions")({
  validateSearch: (search) => transactionsSearchSchema.parse(search),
  head: () => {
    const t = i18n.t;
    return {
      meta: [
        { title: t("transactions.page_title") },
        {
          name: "description",
          content: t("transactions.page_description"),
        },
      ],
    };
  },
  component: TransactionsPage,
});

type Mode = "send" | "deposit" | "withdraw" | "split";

function WalletCard() {
  const { balance, currency, loading } = useWalletBalance();
  const { t } = useTranslation();

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
              {t("transactions.wallet_card.vault_wallet", { currency })}
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
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
              {t("transactions.wallet_card.active_encrypted")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const BANKS = [
  "kcb",
  "coop",
  "ncba",
  "absa",
  "stanchart",
  "stanbic",
  "im",
  "dtb",
  "family",
  "equity",
];

const MOBILE_PROVIDERS = ["mpesa", "airtel", "tkash"];

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

function SendPanel({ searchFilter }: { searchFilter?: string }) {
  const { t } = useTranslation();
  const { currency, refetch: refetchBalance } = useWalletBalance();
  const [method, setMethod] = useState<"vault" | "bank" | "mobile" | null>(null);
  const [amount, setAmount] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [note, setNote] = useState("");
  const [bank, setBank] = useState("");
  const [provider, setProvider] = useState("M-Pesa");
  const [selectedCategory, setSelectedCategory] = useState("Transfer");
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "confirming" | "processing" | "success">("idle");
  const [refCode, setRefCode] = useState("");

  const categories = [
    { id: "Transfer", label: "General Transfer", icon: ArrowRight },
    { id: "Dining", label: "Dining & Food", icon: Utensils },
    { id: "Shopping", label: "Shopping", icon: ShoppingBag },
    { id: "Transport", label: "Transport", icon: Smartphone },
    { id: "Utilities", label: "Bills & Utilities", icon: Zap },
    { id: "Groceries", label: "Groceries", icon: ShoppingCart },
    { id: "Entertainment", label: "Entertainment", icon: Tv },
    { id: "Healthcare", label: "Medical & Health", icon: HeartPulse },
    { id: "Personal", label: "Personal Gift", icon: User },
  ];

  // Recipient Lists State
  const [recentRecipients, setRecentRecipients] = useState<Recipient[]>([]);
  const [frequentRecipients, setFrequentRecipients] = useState<Recipient[]>([]);

  // Recipient Verification
  const [recipient, setRecipient] = useState<{ id: string; name: string; tag?: string } | null>(
    null,
  );
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Derived filtered lists
  const filteredRecent = useMemo(() => {
    if (!searchFilter) return recentRecipients;
    const s = searchFilter.toLowerCase();
    return recentRecipients.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.identifier.toLowerCase().includes(s) ||
        r.type.toLowerCase().includes(s),
    );
  }, [recentRecipients, searchFilter]);

  const filteredFrequent = useMemo(() => {
    if (!searchFilter) return frequentRecipients;
    const s = searchFilter.toLowerCase();
    return frequentRecipients.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.identifier.toLowerCase().includes(s) ||
        r.type.toLowerCase().includes(s),
    );
  }, [frequentRecipients, searchFilter]);

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
        toast.error(t("transactions.errors.load_recipients"));
      }
    };

    fetchRecipients();
  }, [status === "success", t]); // Refresh lists when a new transfer succeeds

  useEffect(() => {
    const searchRecipient = async () => {
      const query = identifier.trim().toLowerCase();
      // Trigger search if it's just '@' OR if query length >= 2
      const isAtSymbol = query === "@";
      const shouldSearch = method === "vault" && (isAtSymbol || query.length >= 2);

      if (shouldSearch) {
        setIsSearching(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let queryBuilder = supabase
          .from("profiles")
          .select("id, first_name, last_name, kyc_tag, profile_photo_url")
          .neq("id", user?.id);

        // If it's just '@', don't filter by name/tag, just show all
        if (!isAtSymbol) {
          queryBuilder = queryBuilder.or(`first_name.ilike.%${query}%,kyc_tag.ilike.%${query}%`);
        }

        const { data } = await queryBuilder.limit(5);

        if (data && data.length > 0) {
          setSearchResults(data);
          setShowSuggestions(true);

          // Check for exact match to show verified badge
          const exactMatch = data.find(
            (p) => p.kyc_tag?.toLowerCase() === `@${query.replace("@", "")}`,
          );
          if (exactMatch) {
            setRecipient({
              id: exactMatch.id,
              name: `${exactMatch.first_name} ${exactMatch.last_name}`,
              tag: exactMatch.kyc_tag,
            });
          } else {
            setRecipient(null);
          }
        } else {
          setSearchResults([]);
          setRecipient(null);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
        setRecipient(null);
        setShowSuggestions(false);
      }
    };

    const timer = setTimeout(searchRecipient, 400);
    return () => clearTimeout(timer);
  }, [identifier, method]);

  // Add click listener to close suggestions
  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const fee = method === "vault" ? 0.0 : 15.0;
  const total = parseFloat(amount || "0") + fee;

  const handleSelectRecipient = (r: Recipient) => {
    setMethod(r.type);
    setIdentifier(r.type === "vault" ? r.identifier.replace("@", "") : r.identifier);
    if (r.bank) setBank(r.bank);
    if (r.provider) setProvider(r.provider);
  };

  const handleSendClick = () => {
    if (!amount || !identifier || (method === "bank" && !bank)) {
      toast.error(t("transactions.errors.fill_required"));
      return;
    }
    setIdempotencyKey(crypto.randomUUID());
    setIsPinModalOpen(true);
  };

  const handlePinVerified = () => {
    setStatus("confirming");
  };

  const handleConfirm = async () => {
    setStatus("processing");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      if (method === "vault") {
        const fullTag = identifier.startsWith("@") ? identifier : `@${identifier}`;
        const { data, error: rpcError } = await supabase.rpc("vault_transfer", {
          p_sender_id: user.id,
          p_recipient_tag: fullTag,
          p_amount: parseFloat(amount),
          p_category: selectedCategory,
          p_note: note.trim() || null,
          p_idempotency_key: idempotencyKey,
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
        const { data, error: rpcError } = await supabase.rpc("process_secure_withdrawal", {
          p_user_id: user.id,
          p_amount: total,
          p_method: method === "mobile" ? "mpesa" : "bank",
          p_description:
            method === "mobile"
              ? `Transfer to ${provider}: ${identifier}`
              : `Bank Transfer to ${bank}: ${identifier}`,
          p_idempotency_key: idempotencyKey,
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
          result.reference || `WTH-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        );

        // Refetch balance to show updated amount in profile immediately
        await refetchBalance();
      }

      setStatus("success");
      toast.success(t("transactions.success.message"));
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
        <h2 className="text-2xl font-semibold mb-2">{t("transactions.success.title")}</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          {t("transactions.success.description", {
            currency,
            amount: parseFloat(amount).toLocaleString(),
          })}
        </p>
        <div className="bg-card/40 border border-border/50 rounded-2xl p-6 w-full max-w-sm mb-8">
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">
              {t("transactions.success.transaction_id")}
            </span>
            <span className="font-mono font-medium">{refCode}</span>
          </div>
          <div className="flex justify-between mb-3 text-sm">
            <span className="text-muted-foreground">
              {t("transactions.success.amount_deducted")}
            </span>
            <span className="font-medium">
              {currency} {total.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("common.status")}</span>
            <span className="text-primary font-medium">{t("common.completed")}</span>
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
      {/* Step 1: Provider Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-light tracking-tight">{t("transactions.steps.step1")}</h3>
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
            <div className="text-base font-medium">{t("transactions.providers.vault")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("transactions.providers.vault_desc")}
            </p>
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
            <div className="text-base font-medium">{t("transactions.providers.bank")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("transactions.providers.bank_desc")}
            </p>
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
            <div className="text-base font-medium">{t("transactions.providers.mobile")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("transactions.providers.mobile_desc")}
            </p>
          </button>
        </div>
      </div>

      {/* Step 2: Dynamic Form */}
      {method && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-light tracking-tight">
              {method === "vault" && t("transactions.steps.step2_vault")}
              {method === "bank" &&
                (bank
                  ? t("transactions.steps.step2_bank_specific", { bank: bank.split(" (")[0] })
                  : t("transactions.steps.step2_bank"))}
              {method === "mobile" && t("transactions.steps.step2_mobile")}
            </h3>
            <WalletCard />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card/30 border border-border/50 rounded-3xl p-8 backdrop-blur-sm">
            <div className="space-y-5">
              {method === "bank" && (
                <div className="space-y-2">
                  <Label>{t("transactions.form.select_bank")}</Label>
                  <Select value={bank} onValueChange={setBank}>
                    <SelectTrigger className="bg-background/40 h-12 border-border/60">
                      <SelectValue placeholder={t("transactions.form.choose_bank")} />
                    </SelectTrigger>
                    <SelectContent>
                      {BANKS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {t(`transactions.banks.${b}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {method === "mobile" && (
                <div className="space-y-2">
                  <Label>{t("transactions.form.provider")}</Label>
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
                        {t(`transactions.mobile_providers.${p}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  {method === "vault" && t("transactions.form.recipient_username")}
                  {method === "bank" && t("transactions.form.account_number")}
                  {method === "mobile" && t("transactions.form.phone_number")}
                </Label>
                <div className="relative">
                  <Input
                    placeholder={
                      method === "vault"
                        ? t("transactions.form.username_placeholder")
                        : method === "bank"
                          ? t("transactions.form.account_placeholder")
                          : t("transactions.form.phone_placeholder")
                    }
                    className="bg-background/40 h-12 border-border/60"
                    value={identifier}
                    onChange={(e) => {
                      const val = e.target.value;
                      setIdentifier(val);
                      if (method === "vault") setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (method === "vault" && searchResults.length > 0) setShowSuggestions(true);
                    }}
                  />
                  {method === "vault" && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : recipient ? (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium animate-in fade-in zoom-in duration-300">
                          <Check className="w-3 h-3" /> {recipient.name}
                        </div>
                      ) : identifier.length >= 3 && !showSuggestions ? (
                        <span className="text-[10px] text-destructive font-medium uppercase tracking-tighter">
                          {t("transactions.errors.not_found")}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {/* Suggestions Dropdown */}
                  {method === "vault" && showSuggestions && searchResults.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-1">
                        {searchResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-primary/5 text-left transition-colors group"
                            onClick={() => {
                              setIdentifier(p.kyc_tag.replace("@", ""));
                              setRecipient({
                                id: p.id,
                                name: `${p.first_name} ${p.last_name}`,
                                tag: p.kyc_tag,
                              });
                              setShowSuggestions(false);
                            }}
                          >
                            <Avatar className="w-8 h-8 border border-border/40">
                              <AvatarImage src={p.profile_photo_url} />
                              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                {p.first_name[0]}
                                {p.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                {p.first_name} {p.last_name}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {p.kyc_tag}
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("transactions.form.amount_label", { currency })}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {currency}
                  </span>
                  <Input
                    type="number"
                    placeholder={t("transactions.form.amount_placeholder")}
                    className="bg-background/40 h-12 pl-12 border-border/60 text-lg font-medium"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Note (Optional context for AI)</Label>
                <Input
                  placeholder="e.g. Lunch at KFC, Uber ride"
                  className="bg-background/40 h-12 border-border/60"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {method === "vault" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label>Spending Category</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.slice(0, 9).map((cat) => {
                      const CatIcon = cat.icon;
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-xl border transition-all gap-1 group",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border/40 bg-background/20 text-muted-foreground hover:bg-background/40",
                          )}
                        >
                          <CatIcon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                          <span className="text-[8px] font-bold uppercase tracking-tight truncate w-full px-1">
                            {cat.label.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5 flex flex-col justify-end">
              <Button
                size="lg"
                className="w-full h-14 text-base font-medium shadow-lg shadow-primary/20"
                onClick={handleSendClick}
                disabled={(method === "vault" && !recipient) || profile?.is_suspended}
              >
                {profile?.is_suspended ? "Account Suspended" : t("transactions.form.send_money_btn")}{" "}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>

            </div>
          </div>
        </div>
      )}

      {/* Header & Lists */}
      <div className="space-y-6">
        {(filteredRecent.length > 0 || isSearching) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <History className="w-4 h-4" />{" "}
              {searchFilter
                ? t("transactions.recipients.search_recent")
                : t("transactions.recipients.recent")}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {filteredRecent.map((r) => (
                <button
                  key={`recent-${r.id}`}
                  onClick={() => handleSelectRecipient(r)}
                  className="flex-shrink-0 w-36 p-4 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/60 transition-colors text-left"
                >
                  <Avatar className="w-10 h-10 mb-3 border border-border/40">
                    <AvatarImage src={r.avatarUrl ?? undefined} />
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

        {(filteredFrequent.length > 0 || isSearching) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Zap className="w-4 h-4" />{" "}
              {searchFilter
                ? t("transactions.recipients.search_frequent")
                : t("transactions.recipients.frequent")}
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {filteredFrequent.map((r) => (
                <button
                  key={`freq-${r.id}`}
                  onClick={() => handleSelectRecipient(r)}
                  className="flex-shrink-0 w-36 p-4 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/60 transition-colors text-left"
                >
                  <Avatar className="w-10 h-10 mb-3 border border-border/40">
                    <AvatarImage src={r.avatarUrl ?? undefined} />
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

        {searchFilter && filteredRecent.length === 0 && filteredFrequent.length === 0 && (
          <div className="py-12 text-center border border-dashed border-border/40 rounded-3xl bg-muted/5">
            <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("transactions.recipients.no_match", { searchFilter })}
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Dialog open={status === "confirming"} onOpenChange={(open) => !open && setStatus("idle")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("transactions.confirmation.title")}</DialogTitle>
            <DialogDescription>{t("transactions.confirmation.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-2xl bg-muted/50 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("transactions.confirmation.recipient")}
                </span>
                <span className="font-semibold text-foreground">
                  {recipient ? recipient.name : identifier}
                </span>
              </div>
              {recipient && (
                <div className="flex justify-between text-[10px] -mt-2">
                  <span className="text-muted-foreground italic">
                    {t("transactions.confirmation.kyc_verified")}
                  </span>
                  <span className="text-primary font-mono">@{identifier.replace("@", "")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("transactions.confirmation.via")}</span>
                <span className="font-medium capitalize">
                  {method} {bank && `- ${bank.split(" (")[0]}`}
                </span>
              </div>
              <div className="border-t border-border/50 pt-3 flex justify-between text-sm">
                <span className="text-muted-foreground">{t("common.amount")}</span>
                <span className="font-medium">
                  {currency} {parseFloat(amount || "0").toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("transactions.confirmation.fee")}</span>
                <span className="font-medium text-destructive">
                  {currency} {fee.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-primary/20 pt-3 flex justify-between text-base font-semibold">
                <span>{t("transactions.confirmation.total_deducted")}</span>
                <span className="text-primary font-mono">
                  {currency} {total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex sm:justify-between gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setStatus("idle")}>
              {t("transactions.confirmation.cancel")}
            </Button>
            <Button className="flex-1" onClick={handleConfirm}>
              {t("transactions.confirmation.confirm")}
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
          <h2 className="text-xl font-medium mt-8">{t("transactions.processing.title")}</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {t("transactions.processing.description")}
          </p>
        </div>
      )}

      <TransactionPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onVerified={handlePinVerified}
        title={t("transactions.authorize.title")}
        description={t("transactions.authorize.description", {
          currency,
          amount: parseFloat(amount || "0").toLocaleString(),
          identifier,
        })}
        amount={parseFloat(amount || "0")}
      />
    </div>
  );
}

// ==========================================
// SPLIT PANEL COMPONENT
// ==========================================
function SplitPanel() {
  const { t } = useTranslation();
  const { currency, refetch: refetchBalance } = useWalletBalance();
  const { profile } = useProfile();
  const currentUser = profile as any;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form states
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [splitMethod, setSplitMethod] = useState<"equal" | "custom">("equal");
  const [includeCreator, setIncludeCreator] = useState(true);
  const [participants, setParticipants] = useState<
    {
      id: string;
      first_name: string;
      last_name: string;
      kyc_tag: string;
      profile_photo_url?: string;
    }[]
  >([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [creatorCustomAmount, setCreatorCustomAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Active splits lists
  const [splitsOwed, setSplitsOwed] = useState<any[]>([]);
  const [splitsCreated, setSplitsCreated] = useState<any[]>([]);
  const [loadingSplits, setLoadingSplits] = useState(true);

  // Payment states
  const [selectedMemberIdToPay, setSelectedMemberIdToPay] = useState<string | null>(null);
  const [selectedSplitAmount, setSelectedSplitAmount] = useState(0);
  const [selectedSplitTitle, setSelectedSplitTitle] = useState("");
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [splitToCancel, setSplitToCancel] = useState<string | null>(null);

  // Categories helper
  const categories = [
    {
      id: "food",
      label: "Food & Drinks",
      icon: Utensils,
      color: "text-primary bg-primary/10 border-primary/20",
    },
    {
      id: "rent",
      label: "Rent & Stay",
      icon: Home,
      color: "text-secondary-foreground bg-secondary border-secondary/20",
    },
    {
      id: "shopping",
      label: "Shopping",
      icon: ShoppingBag,
      color: "text-accent-foreground bg-accent/20 border-accent/20",
    },
    {
      id: "utilities",
      label: "Utilities",
      icon: Zap,
      color: "text-primary bg-primary/10 border-primary/20",
    },
    {
      id: "entertainment",
      label: "Entertainment",
      icon: Tv,
      color: "text-secondary-foreground bg-secondary border-secondary/20",
    },
    {
      id: "other",
      label: "Other",
      icon: Tag,
      color: "text-muted-foreground bg-muted border-border/20",
    },
  ];

  // Fetch splits function
  const fetchSplits = async () => {
    // Robustly get user ID - fallback to session if profile signal is lagging
    let userId = currentUser?.id;
    if (!userId) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }

    if (!userId) return;

    try {
      // 1. Fetch splits you owe
      const { data: memberRecords, error: errOwed } = await supabase
        .from("bill_split_members")
        .select(
          `
          id,
          amount,
          status,
          paid_at,
          transaction_id,
          bill_splits (
            id,
            title,
            category,
            created_at,
            creator_id,
            profiles!creator_id (
              first_name,
              last_name,
              kyc_tag
            )
          )
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (errOwed) throw errOwed;
      setSplitsOwed(memberRecords || []);

      // 2. Fetch splits you created
      const { data: splitsData, error: errCreated } = await supabase
        .from("bill_splits")
        .select(
          `
          id,
          title,
          total_amount,
          amount_per_person,
          category,
          status,
          created_at,
          bill_split_members (
            id,
            user_id,
            amount,
            status,
            paid_at,
            profiles!user_id (
              first_name,
              last_name,
              kyc_tag
            )
          )
        `,
        )
        .eq("creator_id", userId)
        .order("created_at", { ascending: false });

      if (errCreated) throw errCreated;
      setSplitsCreated(splitsData || []);
    } catch (error) {
      console.error("Error fetching splits:", error);
      toast.error("Failed to load active bill splits");
    } finally {
      setLoadingSplits(false);
    }
  };

  // Setup real-time replication listener
  useEffect(() => {
    fetchSplits();

    const channel = supabase
      .channel("realtime-bill-splits")
      .on("postgres_changes", { event: "*", schema: "public", table: "bill_splits" }, () => {
        fetchSplits();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "bill_split_members" }, () => {
        fetchSplits();
        refetchBalance();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Handle participant search
  useEffect(() => {
    const searchUser = async () => {
      const query = searchQuery.trim().toLowerCase();
      if (query.length >= 2) {
        setIsSearching(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, kyc_tag, profile_photo_url")
          .or(`first_name.ilike.%${query}%,kyc_tag.ilike.%${query}%`)
          .neq("id", currentUser?.id)
          .limit(5);

        if (data) {
          setSearchResults(data);
          setShowSuggestions(true);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
      }
    };

    const timer = setTimeout(searchUser, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Calculations
  const shareCount = participants.length + (includeCreator ? 1 : 0);
  const equalShare = shareCount > 0 && totalAmount ? parseFloat(totalAmount) / shareCount : 0;

  // Custom split totals
  const friendsCustomTotal = useMemo(() => {
    let total = 0;
    Object.values(customAmounts).forEach((val) => {
      total += parseFloat(val || "0");
    });
    return total;
  }, [customAmounts]);

  // The creator's share is now automatically whatever is left
  const autoCalculatedCreatorShare = useMemo(() => {
    const total = parseFloat(totalAmount || "0");
    return Math.max(0, total - friendsCustomTotal);
  }, [totalAmount, friendsCustomTotal]);

  const remainingToSplit =
    parseFloat(totalAmount || "0") -
    friendsCustomTotal -
    (includeCreator ? autoCalculatedCreatorShare : 0);

  // Sync custom amounts with equal split if method is changed
  useEffect(() => {
    if (splitMethod === "equal") {
      const newCustoms: Record<string, string> = {};
      participants.forEach((p) => {
        newCustoms[p.id] = equalShare.toFixed(2);
      });
      setCustomAmounts(newCustoms);
      setCreatorCustomAmount(equalShare.toFixed(2));
    } else if (splitMethod === "custom" && includeCreator) {
      // Initialize creator amount with remaining if switching to custom
      setCreatorCustomAmount(autoCalculatedCreatorShare.toFixed(2));
    }
  }, [splitMethod, equalShare, participants.length]);

  // Update creator amount whenever dependencies change
  useEffect(() => {
    if (splitMethod === "custom" && includeCreator) {
      setCreatorCustomAmount(autoCalculatedCreatorShare.toFixed(2));
    }
  }, [autoCalculatedCreatorShare, includeCreator, splitMethod]);

  const handleCustomAmountChange = (id: string, value: string) => {
    setCustomAmounts((prev) => ({ ...prev, [id]: value }));
  };

  // Click outside listener for suggestions
  useEffect(() => {
    const closeSuggestions = () => setShowSuggestions(false);
    window.addEventListener("click", closeSuggestions);
    return () => window.removeEventListener("click", closeSuggestions);
  }, []);

  const handleAddParticipant = (u: any) => {
    if (participants.some((p) => p.id === u.id)) {
      toast.error("User already added to split");
      return;
    }
    const newParticipants = [...participants, u];
    setParticipants(newParticipants);

    // Initialize custom amount for new participant
    if (splitMethod === "custom") {
      setCustomAmounts((prev) => ({ ...prev, [u.id]: "0" }));
    }

    setSearchQuery("");
    setShowSuggestions(false);
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
    const newCustoms = { ...customAmounts };
    delete newCustoms[id];
    setCustomAmounts(newCustoms);
  };

  // Create Split Bill Request
  const handleCreateSplit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title for the bill");
      return;
    }
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (participants.length === 0) {
      toast.error("Please add at least one participant");
      return;
    }

    // Validation for custom split
    const currentTotal = friendsCustomTotal + (includeCreator ? autoCalculatedCreatorShare : 0);
    if (splitMethod === "custom" && Math.abs(currentTotal - parseFloat(totalAmount)) > 0.01) {
      toast.error(
        `Amounts must sum to exactly ${currency} ${totalAmount}. Currently ${currency} ${currentTotal.toFixed(2)}.`,
      );
      return;
    }

    setIsCreating(true);
    try {
      const membersPayload =
        splitMethod === "equal"
          ? participants.map((p) => ({
              user_id: p.id,
              amount: equalShare,
            }))
          : participants.map((p) => ({
              user_id: p.id,
              amount: parseFloat(customAmounts[p.id] || "0"),
            }));

      const creatorAmount =
        splitMethod === "equal"
          ? includeCreator
            ? equalShare
            : 0
          : includeCreator
            ? parseFloat(creatorCustomAmount || "0")
            : 0;

      const { error } = await supabase.rpc("create_bill_split_v3", {
        p_title: title.trim(),
        p_total_amount: parseFloat(totalAmount),
        p_category: category,
        p_members: membersPayload,
        p_creator_amount: creatorAmount,
      });

      if (error) throw error;

      toast.success("Bill split request created successfully!");
      setTitle("");
      setTotalAmount("");
      setParticipants([]);
      setCustomAmounts({});
      setCreatorCustomAmount("");
      fetchSplits();
    } catch (error: any) {
      console.error("Error creating split:", error);
      toast.error(error.message || "Failed to create split request");
    } finally {
      setIsCreating(false);
    }
  };

  // Cancel Split
  const handleCancelSplit = (splitId: string) => {
    setSplitToCancel(splitId);
  };

  const confirmCancelSplit = async () => {
    if (!splitToCancel) return;

    try {
      const { error } = await supabase.rpc("cancel_bill_split", {
        p_split_id: splitToCancel,
      });

      if (error) throw error;

      toast.success("Split request cancelled successfully");
      fetchSplits();
    } catch (error: any) {
      console.error("Error cancelling split:", error);
      toast.error(error.message || "Failed to cancel split request");
    } finally {
      setSplitToCancel(null);
    }
  };

  const handlePinVerified = () => {
    handlePaySplitShare();
  };

  // Pay share
  const handlePaySplitShare = async () => {
    if (!selectedMemberIdToPay) return;
    setIsPaying(true);
    try {
      const { data, error } = await supabase.rpc("pay_bill_split", {
        p_member_id: selectedMemberIdToPay,
        p_idempotency_key: idempotencyKey,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to pay split");
      }

      toast.success(result?.message || "Split paid successfully!");
      fetchSplits();
      refetchBalance();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "An error occurred during payment");
    } finally {
      setIsPaying(false);
      setSelectedMemberIdToPay(null);
    }
  };

  const getCategoryIcon = (catId: string) => {
    const match = categories.find((c) => c.id === catId);
    return match ? match.icon : Tag;
  };

  const getCategoryColor = (catId: string) => {
    const match = categories.find((c) => c.id === catId);
    return match ? match.color : "text-slate-500 bg-slate-500/10";
  };

  return (
    <div className="space-y-12">
      {/* 1. Creating Split Section */}
      <div className="space-y-6">
        <h3 className="text-xl font-light tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Split a New Bill
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 bg-card/30 border border-border/50 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
          {/* Left Side: Configuration */}
          <div className="lg:col-span-2 space-y-8">
            {/* Section 1: Bill Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 w-fit px-2.5 py-1 rounded-md border border-primary/10">
                <Tag className="w-3 h-3" /> 1. Bill Details
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="split-title" className="text-xs font-semibold">
                    Bill Description
                  </Label>
                  <Input
                    id="split-title"
                    placeholder="e.g. Dinner at Mama's"
                    className="bg-background/40 h-12 border-border/60 focus:border-primary/50 transition-all"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="split-amount" className="text-xs font-semibold">
                    Total Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">
                      {currency}
                    </span>
                    <Input
                      id="split-amount"
                      type="number"
                      placeholder="0.00"
                      className="bg-background/40 h-12 pl-12 border-border/60 text-lg font-bold"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Select Category
                </Label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
                  {categories.map((c) => {
                    const Icon = c.icon;
                    const isSelected = category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCategory(c.id);
                          if (c.id === "other") setTitle("");
                          else setTitle(c.label);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center gap-2 group",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border/40 bg-background/20 text-muted-foreground hover:bg-background/40 hover:text-foreground hover:border-border/60",
                        )}
                      >
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                            isSelected ? "bg-primary text-white" : "bg-muted/30",
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-tight">
                          {c.label.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 2: Participants */}
            <div className="space-y-4 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 w-fit px-2.5 py-1 rounded-md border border-primary/10">
                <Users className="w-3 h-3" /> 2. Who's involved?
              </div>

              <div className="space-y-2 relative" onClick={(e) => e.stopPropagation()}>
                <Label className="text-xs font-semibold">Add Friends (Vault Users)</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by first name or @tag..."
                    className="pl-11 bg-background/40 h-12 border-border/60 rounded-xl focus:ring-1 focus:ring-primary/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowSuggestions(true);
                    }}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary/60" />
                  )}
                </div>

                {showSuggestions && searchResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-1.5">
                      {searchResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="flex items-center gap-3.5 w-full p-3 rounded-xl hover:bg-primary/10 text-left transition-all group"
                          onClick={() => handleAddParticipant(u)}
                        >
                          <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
                            <AvatarImage src={u.profile_photo_url} />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                              {u.first_name[0]}
                              {u.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                              {u.first_name} {u.last_name}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono tracking-tight">
                              {u.kyc_tag}
                            </div>
                          </div>
                          <Plus className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-all group-hover:rotate-90" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* List of selected participants */}
              <div className="min-h-[60px] p-3 rounded-2xl bg-background/20 border border-dashed border-border/60">
                {participants.length > 0 || includeCreator ? (
                  <div className="space-y-3">
                    {/* Creator Row (if included) */}
                    {includeCreator && (
                      <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-2.5 rounded-xl animate-in zoom-in duration-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="w-8 h-8 border border-background">
                            <AvatarImage src={currentUser?.profile_photo_url} />
                            <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                              ME
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-primary uppercase tracking-tighter leading-none">
                              You (Creator)
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {mounted
                                ? `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`
                                : " "}
                            </div>
                          </div>
                        </div>
                        {splitMethod === "custom" ? (
                          <div className="flex items-center gap-2 ml-4">
                            <span className="text-[10px] font-bold text-primary">{currency}</span>
                            <Input
                              type="number"
                              className="h-8 w-24 bg-background/60 border-primary/30 text-xs font-mono font-bold text-primary"
                              value={creatorCustomAmount}
                              onChange={(e) => setCreatorCustomAmount(e.target.value)}
                            />
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-primary font-mono bg-primary/10 px-2 py-1 rounded-md">
                            {currency}{" "}
                            {equalShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Participant Rows */}
                    <div className="flex flex-col gap-2">
                      {participants.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between bg-background border border-border/40 p-2.5 rounded-xl shadow-sm animate-in zoom-in duration-200"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="w-8 h-8 border border-background shadow-xs">
                              <AvatarImage src={p.profile_photo_url} />
                              <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                                {p.first_name[0]}
                                {p.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold text-foreground leading-none">
                                {p.first_name} {p.last_name}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono truncate">
                                {p.kyc_tag}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {splitMethod === "custom" ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground">
                                  {currency}
                                </span>
                                <Input
                                  type="number"
                                  className="h-8 w-24 bg-background/60 border-border/60 text-xs font-mono font-bold"
                                  value={customAmounts[p.id] || "0"}
                                  onChange={(e) => handleCustomAmountChange(p.id, e.target.value)}
                                />
                              </div>
                            ) : (
                              <div className="text-xs font-bold text-foreground font-mono bg-muted/30 px-2 py-1 rounded-md">
                                {currency}{" "}
                                {equalShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveParticipant(p.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-muted/40 text-muted-foreground hover:bg-destructive hover:text-white transition-all"
                            >
                              <Plus className="w-4 h-4 rotate-45" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center py-6 text-xs text-muted-foreground/40 font-medium italic">
                    Search above to add friends to this split...
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Split Method */}
            <div className="space-y-4 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 w-fit px-2.5 py-1 rounded-md border border-primary/10">
                <Smartphone className="w-3 h-3" /> 3. Split Method
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={() => setSplitMethod("equal")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all font-semibold",
                    splitMethod === "equal"
                      ? "border-primary bg-primary/10 text-primary shadow-inner"
                      : "border-border/40 bg-background/20 text-muted-foreground hover:bg-background/40",
                  )}
                >
                  <Users className="w-5 h-5" />
                  Split Equally
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMethod("custom")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl border transition-all font-semibold",
                    splitMethod === "custom"
                      ? "border-primary bg-primary/10 text-primary shadow-inner"
                      : "border-border/40 bg-background/20 text-muted-foreground hover:bg-background/40",
                  )}
                >
                  <Plus className="w-5 h-5" />
                  Custom Amount
                </button>
              </div>
            </div>
          </div>

          {/* Right Summary Block: "The Receipt" style */}
          <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-border/40 pt-8 lg:pt-0 lg:pl-8">
            <div className="flex-1 space-y-6">
              <div className="text-center space-y-1">
                <div className="text-[10px] uppercase tracking-[0.3em] font-black text-primary/60">
                  Final Breakdown
                </div>
                <div className="text-2xl font-bold font-mono tracking-tighter">PREVIEW</div>
              </div>

              <div className="rounded-3xl bg-primary/5 border border-primary/10 p-6 space-y-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl -mr-12 -mt-12 transition-all group-hover:bg-primary/20" />

                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Total Bill
                    </span>
                    <span className="text-lg font-black text-foreground font-mono">
                      {currency}{" "}
                      {parseFloat(totalAmount || "0").toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  <div className="h-px bg-border/40 border-dashed border-t" />

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground font-medium">Split with me</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIncludeCreator(!includeCreator)}
                        className={cn(
                          "w-10 h-6 rounded-full p-1 transition-all duration-300 focus:outline-none ring-offset-background focus:ring-2 focus:ring-primary/20",
                          includeCreator ? "bg-primary shadow-sm" : "bg-muted",
                        )}
                      >
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300",
                            includeCreator ? "translate-x-4" : "translate-x-0",
                          )}
                        />
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground font-medium">Participants</span>
                      </div>
                      <span className="font-bold text-foreground bg-primary/10 px-2.5 py-0.5 rounded-full text-xs">
                        {shareCount} total
                      </span>
                    </div>

                    {splitMethod === "custom" && (
                      <div className="flex justify-between items-center text-[11px]">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              Math.abs(remainingToSplit) < 0.01 ? "bg-primary" : "bg-rose-500",
                            )}
                          />
                          <span className="text-muted-foreground">Status</span>
                        </div>
                        <span
                          className={cn(
                            "font-bold uppercase tracking-tighter",
                            Math.abs(remainingToSplit) < 0.01 ? "text-primary" : "text-destructive",
                          )}
                        >
                          {Math.abs(remainingToSplit) < 0.01
                            ? "Fully Allocated"
                            : "Allocation Pending"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-2">
                    <div className="bg-white/40 dark:bg-black/20 rounded-2xl p-4 border border-white/60 dark:border-white/5 shadow-sm">
                      <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1 text-center">
                        {splitMethod === "equal" ? "Cost Per Person" : "Your Contribution"}
                      </div>
                      <div className="text-3xl font-black text-primary text-center font-mono tracking-tighter">
                        {currency}{" "}
                        {splitMethod === "equal"
                          ? equalShare.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : parseFloat(creatorCustomAmount || "0").toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-center text-muted-foreground/60 font-medium italic px-4 leading-tight">
                {splitMethod === "equal"
                  ? "Vault Split automatically handles penny rounding to ensure exact settlement."
                  : "Ensure all custom shares sum up to the total bill amount before proceeding."}
              </div>
            </div>

            <Button
              className="w-full h-16 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 mt-8 transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={handleCreateSplit}
              disabled={isCreating || participants.length === 0}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Finalizing...
                </>
              ) : (
                <>
                  Send Split Requests <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Active Splits Dashboard */}
      <div className="space-y-6">
        <h3 className="text-xl font-light tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Active Split Requests
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section: Incoming splits (Splits You Owe) */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-destructive" />
              Splits You Owe (Incoming Requests)
            </h4>

            <div className="rounded-2xl border border-border/40 bg-card/30 p-4 space-y-3 min-h-[180px]">
              {loadingSplits ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
                  <span className="text-xs">Loading requests...</span>
                </div>
              ) : splitsOwed.filter((m) => m.status === "pending").length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-primary/20 mb-2" />
                  <span className="text-sm font-medium text-muted-foreground">
                    You are all clear!
                  </span>
                  <span className="text-xs text-muted-foreground/60 mt-0.5">
                    No pending splits to pay.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {splitsOwed
                    .filter((m) => m.status === "pending")
                    .map((m) => {
                      if (!m.bill_splits) {
                        return (
                          <div
                            key={m.id}
                            className="p-4 rounded-xl bg-destructive/10 border border-rose-500/20 text-[10px] text-destructive flex flex-col gap-1"
                          >
                            <div className="font-bold flex items-center gap-1.5 uppercase tracking-wider">
                              <AlertCircle className="w-3 h-3" /> Security Policy Restriction
                            </div>
                            <p className="opacity-80">
                              Found your pending split share of {currency}{" "}
                              {m.amount.toLocaleString()}, but the database is restricting access to
                              the bill details.
                            </p>
                            <div className="mt-1 font-mono text-[8px] opacity-50">ID: {m.id}</div>
                          </div>
                        );
                      }

                      const CatIcon = getCategoryIcon(m.bill_splits.category);
                      const catColor = getCategoryColor(m.bill_splits.category);
                      const creatorName = m.bill_splits.profiles
                        ? `${m.bill_splits.profiles.first_name} ${m.bill_splits.profiles.last_name || ""}`.trim()
                        : "Vault User";
                      const creatorTag = m.bill_splits.profiles?.kyc_tag || "";

                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-background/40 hover:bg-background/60 border border-border/40 transition-colors group animate-in fade-in duration-200"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                                catColor,
                              )}
                            >
                              <CatIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {m.bill_splits.title}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                Requested by {creatorName}{" "}
                                <span className="font-mono text-primary/80">{creatorTag}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-sm font-semibold text-destructive font-mono">
                                -{currency}{" "}
                                {m.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[8px] text-muted-foreground/60 mt-0.5 font-mono">
                                {format(new Date(m.bill_splits.created_at), "MMM dd, h:mm a")}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="h-8 font-medium px-4 text-xs shadow-sm shadow-primary/10"
                              onClick={() => {
                                setSelectedMemberIdToPay(m.id);
                                setSelectedSplitAmount(m.amount);
                                setSelectedSplitTitle(m.bill_splits.title);
                                setIdempotencyKey(crypto.randomUUID());
                                setIsPinModalOpen(true);
                              }}
                              disabled={profile?.is_frozen}
                            >
                              {profile?.is_frozen ? "Frozen" : "Pay"}
                            </Button>

                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Already Paid Splits (History) */}
              {splitsOwed.filter((m) => m.status === "paid" && m.bill_splits).length > 0 && (
                <div className="pt-4 border-t border-border/40 mt-4 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    Recently Settled
                  </div>
                  {splitsOwed
                    .filter((m) => m.status === "paid" && m.bill_splits)
                    .slice(0, 3)
                    .map((m) => {
                      const CatIcon = getCategoryIcon(m.bill_splits.category);
                      const catColor = getCategoryColor(m.bill_splits.category);
                      const creatorName = m.bill_splits.profiles
                        ? `${m.bill_splits.profiles.first_name} ${m.bill_splits.profiles.last_name || ""}`.trim()
                        : "Vault User";

                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-background/20 border border-border/20 opacity-70"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                                catColor,
                              )}
                            >
                              <CatIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 text-xs">
                              <div className="font-medium text-foreground truncate">
                                {m.bill_splits.title}
                              </div>
                              <div className="text-[9px] text-muted-foreground truncate mt-0.5">
                                Paid to {creatorName}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-right text-xs shrink-0">
                            <div className="text-right">
                              <div className="font-semibold text-primary font-mono flex items-center justify-end gap-1">
                                <Check className="w-3.5 h-3.5" /> {currency}{" "}
                                {m.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[8px] text-muted-foreground/60 mt-0.5 font-mono">
                                {m.paid_at ? format(new Date(m.paid_at), "MMM dd, h:mm a") : ""}
                              </div>
                            </div>
                            {m.transaction_id && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                asChild
                              >
                                <Link to="/help" search={{ receiptId: m.transaction_id }}>
                                  <CreditCard className="w-3.5 h-3.5" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Section: Outgoing splits (Splits You Created) */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-primary" />
              Splits You Created (Outgoing Tracker)
            </h4>

            <div className="rounded-2xl border border-border/40 bg-card/30 p-4 space-y-3 min-h-[180px]">
              {loadingSplits ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
                  <span className="text-xs">Loading splits...</span>
                </div>
              ) : splitsCreated.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Users className="w-8 h-8 text-primary/25 mb-2" />
                  <span className="text-sm font-medium text-muted-foreground">
                    No active splits
                  </span>
                  <span className="text-xs text-muted-foreground/60 mt-0.5">
                    Create a split request above.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {splitsCreated.map((s) => {
                    const CatIcon = getCategoryIcon(s.category);
                    const catColor = getCategoryColor(s.category);
                    const paidMembers = s.bill_split_members.filter(
                      (m: any) => m.status === "paid",
                    );
                    const totalMembers = s.bill_split_members.length;
                    const progressPercentage =
                      totalMembers > 0 ? (paidMembers.length / totalMembers) * 100 : 100;

                    return (
                      <div
                        key={s.id}
                        className="p-4 rounded-xl bg-background/40 border border-border/40 space-y-3 animate-in fade-in duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border relative",
                                catColor,
                              )}
                            >
                              <CatIcon className="w-5 h-5" />
                              <div
                                className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse border border-background"
                                title="Live tracking active"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {s.title}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                Total: {currency}{" "}
                                {s.total_amount.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}{" "}
                                ·{" "}
                                {s.bill_split_members.every(
                                  (m: any) => m.amount === s.bill_split_members[0].amount,
                                )
                                  ? `${currency} ${s.bill_split_members[0]?.amount.toLocaleString()} each`
                                  : "Custom shares"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-right shrink-0">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase",
                                s.status === "completed"
                                  ? "bg-primary/10 text-primary border border-primary/25"
                                  : "bg-primary/10 text-primary border border-primary/25",
                              )}
                            >
                              {s.status}
                            </span>
                            {s.status === "active" && paidMembers.length === 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors gap-1.5"
                                onClick={() => handleCancelSplit(s.id)}
                              >
                                <span className="text-[10px] font-medium">Cancel</span>
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                            <span>Settled Progress</span>
                            <span>
                              {paidMembers.length} of {totalMembers} paid (
                              {Math.round(progressPercentage)}
                              %)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden border border-border/20">
                            <div
                              className="h-full bg-primary transition-all duration-500 ease-out"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* List of members detail */}
                        <div className="pt-2 border-t border-border/30 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {s.bill_split_members.map((m: any) => {
                            const name = m.profiles
                              ? `${m.profiles.first_name} ${m.profiles.last_name || ""}`.trim()
                              : "Vault User";
                            const isPaid = m.status === "paid";

                            return (
                              <div
                                key={m.id}
                                className="flex items-center justify-between p-1.5 rounded-lg bg-background/25"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="w-4 h-4">
                                    <AvatarImage src={m.profiles?.profile_photo_url} />
                                    <AvatarFallback className="text-[6px] bg-primary/20 text-primary font-bold">
                                      {m.profiles?.first_name?.[0]}
                                      {m.profiles?.last_name?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col min-w-0">
                                    <span className="truncate text-[9px] font-bold leading-none">
                                      {name}
                                    </span>
                                    <span className="text-[8px] text-muted-foreground mt-0.5">
                                      {currency} {m.amount.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={cn(
                                    "flex items-center gap-1 font-semibold text-[8px] uppercase shrink-0",
                                    isPaid ? "text-primary" : "text-muted-foreground/60",
                                  )}
                                >
                                  {isPaid ? (
                                    <>
                                      <Check className="w-2.5 h-2.5" /> Paid
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-2.5 h-2.5" /> Pending
                                    </>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <TransactionPinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setSelectedMemberIdToPay(null);
        }}
        onVerified={handlePinVerified}
        title="Authorize Bill Split Payment"
        description={`Securely authorize payment of ${currency} ${selectedSplitAmount.toLocaleString()} for "${selectedSplitTitle}".`}
        amount={selectedSplitAmount}
      />

      {isPaying && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 animate-pulse" />
            <Loader2 className="w-24 h-24 text-primary animate-spin absolute inset-0" />
          </div>
          <h2 className="text-xl font-medium mt-8">Processing settlement...</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Transferring funds securely via Vault Ledger rails.
          </p>
        </div>
      )}

      {/* Sweet Alert Style Cancellation Dialog */}
      <AlertDialog open={!!splitToCancel} onOpenChange={(open) => !open && setSplitToCancel(null)}>
        <AlertDialogContent className="max-w-[380px] rounded-3xl border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden p-0">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-destructive to-transparent opacity-50" />

          <div className="p-8 text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center relative group">
              <div className="absolute inset-0 rounded-full bg-destructive/5 animate-ping group-hover:animate-none" />
              <div className="w-10 h-10 rounded-full bg-destructive/20 border-2 border-destructive/40 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]" />
            </div>

            <div className="space-y-2">
              <AlertDialogTitle className="text-xl font-bold tracking-tight">
                Are you sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed px-4">
                Are you sure you want to cancel this split request? This will remove it for all
                participants.
              </AlertDialogDescription>
            </div>
          </div>

          <AlertDialogFooter className="flex flex-row sm:flex-row p-4 pt-0 gap-3">
            <AlertDialogCancel className="flex-1 h-12 rounded-2xl border-border/40 bg-background/50 text-sm font-semibold hover:bg-muted transition-all">
              No, keep it
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelSplit}
              className="flex-1 h-12 rounded-2xl bg-destructive text-white hover:bg-destructive/90 transition-all font-semibold shadow-lg shadow-destructive/20 border-0"
            >
              Yes, cancel it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TransactionHistory() {
  const { t } = useTranslation();
  const { balance, currency, loading: balanceLoading } = useWalletBalance();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "transfer" | "deposit" | "withdrawal">(
    "all",
  );
  const [page, setPage] = useState(0);

  const {
    transactions,
    loading: txLoading,
    totalCount,
    hasMore,
  } = useTransactions(!balanceLoading, {
    page,
    pageSize: 10,
    search,
    type: typeFilter,
  });

  const { profile } = useProfile();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0); // Reset to first page on search
  };

  const handleFilterChange = (type: any) => {
    setTypeFilter(type);
    setPage(0); // Reset to first page on filter change
  };

  const loadMore = () => {
    if (hasMore && !txLoading) {
      setPage((prev) => prev + 1);
    }
  };

  const getTransactionDetails = (t_data: any) => {
    const isSender = t_data.sender_id === (profile as any)?.id;
    const userName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ""}`.trim()
      : profile?.email?.split("@")[0] || t("common.vault_user");
    const symbol = currency === "USD" ? "$" : currency + " ";

    const categoryIcons: Record<string, any> = {
      dining: Utensils,
      shopping: ShoppingBag,
      transport: Smartphone,
      utilities: Zap,
      entertainment: Tv,
      healthcare: HeartPulse,
      groceries: ShoppingCart,
      personal: User,
      income: ArrowDownLeft,
      transfer: ArrowRight,
    };

    const categoryColors: Record<string, string> = {
      dining: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      shopping: "bg-pink-500/10 text-pink-500 border-pink-500/20",
      transport: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      utilities: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      entertainment: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      healthcare: "bg-red-500/10 text-red-500 border-red-500/20",
      groceries: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      income: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    };

    const txCategory = (t_data.category || "").toLowerCase();
    const CategoryIcon = categoryIcons[txCategory] || null;
    const categoryColorClass = categoryColors[txCategory] || "bg-primary/10 text-primary border-primary/20";

    // Method-specific logo helper
    const getMethodLogo = (method: string, description: string) => {
      const desc = (description || "").toLowerCase();
      const meth = (method || "").toLowerCase();

      // Mobile money services
      if (desc.includes("mpesa") || desc.includes("m-pesa") || meth.includes("mpesa"))
        return "/logos/mpesa.svg";
      if (desc.includes("airtel") || meth.includes("airtel")) return "/logos/airtel.svg";
      if (desc.includes("t-kash") || desc.includes("tkash") || meth.includes("tkash"))
        return "/logos/tkash.svg";

      // Banks
      if (desc.includes("kcb") || meth.includes("kcb")) return "/logos/kcb.svg";
      if (desc.includes("co-operative") || desc.includes("coop") || meth.includes("coop"))
        return "/logos/coop.svg";
      if (desc.includes("ncba") || meth.includes("ncba")) return "/logos/ncba.svg";
      if (desc.includes("absa") || meth.includes("absa")) return "/logos/absa.svg";
      if (desc.includes("standard chartered") || meth.includes("standard"))
        return "/logos/standard-chartered.svg";
      if (desc.includes("stanbic") || meth.includes("stanbic")) return "/logos/stanbic.svg";
      if (desc.includes("i&m") || desc.includes("im bank") || meth.includes("im bank"))
        return "/logos/im-bank.svg";
      if (desc.includes("dtb") || desc.includes("diamond trust") || meth.includes("dtb"))
        return "/logos/dtb.svg";
      if (desc.includes("family bank") || meth.includes("family")) return "/logos/family-bank.svg";
      if (desc.includes("chase bank") || meth.includes("chase")) return "/logos/chase.svg";
      if (desc.includes("bank of america") || meth.includes("america"))
        return "/logos/bank-of-america.svg";

      // Fallback for generic bank method
      if (meth === "bank" || meth === "mpesa" || meth === "airtel") return "/logos/bank.svg";
      return null; // Fallback to initials
    };

    if (t_data.type === "transfer") {
      if (isSender) {
        const desc = (t_data.description || "").toLowerCase();
        const logo = getMethodLogo(t_data.method || "", t_data.description || "");
        const useLogo = Boolean(logo);

        let titleText = t_data.description;
        if (!titleText) {
          const receiverName = t_data.receiver?.kyc_tag
            ? `@${t_data.receiver.kyc_tag}`
            : `${t_data.receiver?.first_name || t("common.user")} ${t_data.receiver?.last_name || ""}`.trim();
          titleText = t("transactions.history.transfer_to", { receiverName });
        }

        return {
          title: titleText,
          amount: `-${symbol}${t_data.amount.toLocaleString()}`,
          positive: false,
          icon: useLogo ? null : t_data.receiver?.first_name?.[0] || "V",
          logo: logo || t_data.receiver?.profile_photo_url,
          avatarUrl: t_data.receiver?.profile_photo_url,
          color: "bg-primary/20 text-primary",
          CategoryIcon,
          categoryColorClass,
        };
      } else {
        let senderName = t_data.sender?.kyc_tag
          ? `@${t_data.sender.kyc_tag}`
          : `${t_data.sender?.first_name || t("common.user")} ${t_data.sender?.last_name || ""}`.trim();
        const titleText =
          t_data.description || t("transactions.history.received_from", { senderName });

        return {
          title: titleText,
          amount: `+${symbol}${t_data.amount.toLocaleString()}`,
          positive: true,
          icon: t_data.sender?.first_name?.[0] || "V",
          logo: t_data.sender?.profile_photo_url,
          avatarUrl: t_data.sender?.profile_photo_url,
          color: "bg-primary/20 text-primary",
          CategoryIcon,
          categoryColorClass,
        };
      }
    } else if (t_data.type === "deposit") {
      const logo = getMethodLogo(t_data.method, t_data.description);
      const bankName =
        t_data.method === "mpesa"
          ? "M-Pesa"
          : t_data.description?.includes("Ref:")
            ? t("transactions.history.bank_simple")
            : t_data.method;
      const initials = (bankName || "").substring(0, 2).toUpperCase();
      return {
        title: t_data.description || t("transactions.history.deposit_to", { bankName, userName }),
        amount: `+${symbol}${t_data.amount.toLocaleString()}`,
        positive: true,
        icon: logo ? null : initials,
        logo: logo,
        avatarUrl: profile?.profile_photo_url || null,
        color: "bg-primary/20 text-primary",
        CategoryIcon,
        categoryColorClass,
      };
    } else if (t_data.type === "withdrawal") {
      const logo = getMethodLogo(t_data.method, t_data.description);
      const bankName =
        t_data.method === "mpesa"
          ? "M-Pesa"
          : t_data.description?.includes("Ref:")
            ? t("transactions.history.bank_simple")
            : t_data.method;
      const initials = (bankName || "").substring(0, 2).toUpperCase();
      return {
        title: t_data.description || t("transactions.history.withdrawal_to", { bankName }),
        amount: `-${symbol}${t_data.amount.toLocaleString()}`,
        positive: false,
        icon: logo ? null : initials,
        logo: logo,
        avatarUrl: profile?.profile_photo_url || null,
        color: "bg-destructive/20 text-destructive",
        CategoryIcon,
        categoryColorClass,
      };
    }
    return {
      title: t_data.description,
      amount: `${symbol}${t_data.amount.toLocaleString()}`,
      positive: true,
      icon: "?",
      logo: null,
      avatarUrl: null,
      color: "bg-secondary text-secondary-foreground",
      CategoryIcon,
      categoryColorClass,
    };
  };

  const currencySymbol = currency === "USD" ? "$" : currency + " ";

  return (
    <div className="mt-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-light tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          {t("transactions.history.title")}
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
            <Input
              placeholder={t("transactions.history.search_placeholder")}
              className="h-8 pl-8 w-48 bg-card/40 text-xs border-border/40 focus:border-primary/50 transition-all"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/40">
            {t("transactions.history.total_records", { totalCount })}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: "all", label: t("transactions.history.filters.all") },
          { id: "transfer", label: t("transactions.history.filters.transfers") },
          { id: "deposit", label: t("transactions.history.filters.deposits") },
          { id: "withdrawal", label: t("transactions.history.filters.withdrawals") },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => handleFilterChange(f.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-medium transition-all border",
              typeFilter === f.id
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card/40 text-muted-foreground border-border/40 hover:border-border",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-card/30 border border-border/40 p-4 sm:p-6 backdrop-blur-sm shadow-inner">
        {txLoading && page === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
            <p className="text-xs text-muted-foreground animate-pulse">
              {t("transactions.history.syncing")}
            </p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {t("transactions.history.no_activity")}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/40">
              <div className="text-xs text-muted-foreground font-medium">
                <RefreshCw className="w-3 h-3 inline mr-1" />
                {t("transactions.history.data_synced", { minutes: Math.floor(Math.random() * 60) })}
              </div>
            </div>
            <ul className="space-y-2">
              {transactions.map((t_item) => {
                const details = getTransactionDetails(t_item);
                const typeLabel =
                  t_item.type === "transfer"
                    ? t("dashboard.ledger.transaction.p2p")
                    : t_item.type === "deposit"
                      ? t("dashboard.ledger.transaction.deposit").substring(0, 3).toUpperCase()
                      : t_item.type === "withdrawal"
                        ? t("dashboard.ledger.transaction.withdraw").substring(0, 3).toUpperCase()
                        : t_item.type.substring(0, 3).toUpperCase();

                return (
                  <li
                    key={t_item.id}
                    className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={cn("w-12 h-12 shrink-0 rounded-lg flex items-center justify-center border", details.categoryColorClass)}>
                        {details.CategoryIcon ? <details.CategoryIcon className="w-6 h-6" /> : (
                          <span className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
                            {typeLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {details.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground/60">
                            {format(new Date(t_item.created_at), "EEEE, MMM dd, yyyy · h:mm a")}
                          </span>
                          {t_item.category && (
                            <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border", details.categoryColorClass)}>
                              {t_item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                      <div
                        className={`text-sm font-semibold font-mono ${
                          details.positive ? "text-primary" : "text-destructive"
                        }`}
                      >
                        {details.amount}
                      </div>
                      <div className="text-[10px] text-muted-foreground/50 font-mono">
                        {t("dashboard.balance_label")} {currencySymbol}
                        {t_item.balance_after?.toLocaleString() || balance?.toLocaleString()}
                      </div>
                    </div>
                  </li>
                );
              })}

              {hasMore && (
                <div className="pt-6 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={loadMore}
                    disabled={txLoading}
                  >
                    {txLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-2" />
                    )}
                    {t("transactions.history.load_more")}
                  </Button>
                </div>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function TransactionsPage() {
  const { t } = useTranslation();
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [mode, setMode] = useState<Mode>(initialMode || "send");
  const [globalSearch, setGlobalSearch] = useState("");

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
    { id: "send", label: t("transactions.modes.send") },
    { id: "deposit", label: t("transactions.modes.deposit") },
    { id: "withdraw", label: t("transactions.modes.withdraw") },
    { id: "split", label: t("transactions.modes.split") || "Split Bill" },
  ];

  const titles: Record<Mode, string> = {
    send: t("transactions.modes.send"),
    deposit: t("transactions.modes.deposit"),
    withdraw: t("transactions.modes.withdraw"),
    split: t("transactions.modes.split") || "Split Bill",
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
            {t("common.back")}
          </Link>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-full border border-border/50 bg-card/40 p-1 backdrop-blur-sm">
            {tabs.map((t_tab) => (
              <button
                key={t_tab.id}
                onClick={() => handleModeChange(t_tab.id)}
                className={`px-5 py-2 rounded-full text-sm transition-colors ${
                  mode === t_tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t_tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <h1 className="text-3xl font-light tracking-tight">{titles[mode]}</h1>
          {mode === "send" && (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("transactions.recipients.search_placeholder")}
                className="pl-9 bg-card/40"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>
          )}
        </div>

        {mode === "send" && <SendPanel searchFilter={globalSearch} />}
        {mode === "deposit" && <DepositPanel />}
        {mode === "withdraw" && <WithdrawPanel />}
        {mode === "split" && <SplitPanel />}

        {/* Detailed Transaction History */}
        <TransactionHistory />
      </main>
    </AppShell>
  );
}
