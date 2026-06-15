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
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
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
import { useProfileSignal } from "@/lib/profile-signal";
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
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
  const [bank, setBank] = useState("");
  const [provider, setProvider] = useState("M-Pesa");
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "confirming" | "processing" | "success">("idle");
  const [refCode, setRefCode] = useState("");

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

      if (method === "vault" && query.length >= 2) {
        setIsSearching(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Search by first_name or kyc_tag (which starts with @)
        const { data } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, kyc_tag, profile_photo_url")
          .or(`first_name.ilike.%${query}%,kyc_tag.ilike.%${query}%`)
          .neq("id", user?.id)
          .limit(5);

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
                      // Strip @ if method is vault
                      setIdentifier(method === "vault" ? val.replace("@", "") : val);
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
            </div>

            <div className="space-y-5 flex flex-col justify-end">
              <Button
                size="lg"
                className="w-full h-14 text-base font-medium shadow-lg shadow-primary/20"
                onClick={handleSendClick}
                disabled={method === "vault" && !recipient}
              >
                {t("transactions.form.send_money_btn")} <ArrowRight className="ml-2 w-5 h-5" />
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
  const [profile] = useProfileSignal();
  const currentUser = profile as any;

  // Form states
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [includeCreator, setIncludeCreator] = useState(true);
  const [participants, setParticipants] = useState<{ id: string; first_name: string; last_name: string; kyc_tag: string; profile_photo_url?: string }[]>([]);
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
  const [isPaying, setIsPaying] = useState(false);

  // Categories helper
  const categories = [
    { id: "food", label: "Food & Drinks", icon: Utensils, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    { id: "rent", label: "Rent & Stay", icon: Home, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
    { id: "shopping", label: "Shopping", icon: ShoppingBag, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { id: "utilities", label: "Utilities", icon: Zap, color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
    { id: "entertainment", label: "Entertainment", icon: Tv, color: "text-pink-500 bg-pink-500/10 border-pink-500/20" },
    { id: "other", label: "Other", icon: Tag, color: "text-slate-500 bg-slate-500/10 border-slate-500/20" }
  ];

  // Fetch splits function
  const fetchSplits = async () => {
    if (!currentUser?.id) return;
    try {
      // 1. Fetch splits you owe
      const { data: memberRecords, error: errOwed } = await supabase
        .from("bill_split_members")
        .select(`
          id,
          amount,
          status,
          paid_at,
          bill_splits (
            id,
            title,
            category,
            created_at,
            creator_id,
            profiles:creator_id (
              first_name,
              last_name,
              kyc_tag
            )
          )
        `)
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (errOwed) throw errOwed;
      setSplitsOwed(memberRecords || []);

      // 2. Fetch splits you created
      const { data: splitsData, error: errCreated } = await supabase
        .from("bill_splits")
        .select(`
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
            profiles:user_id (
              first_name,
              last_name,
              kyc_tag
            )
          )
        `)
        .eq("creator_id", currentUser.id)
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bill_splits" },
        () => {
          fetchSplits();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bill_split_members" },
        () => {
          fetchSplits();
          refetchBalance();
        }
      )
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
  const calculatedShare = shareCount > 0 && totalAmount ? (parseFloat(totalAmount) / shareCount) : 0;

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
    setParticipants([...participants, u]);
    setSearchQuery("");
    setShowSuggestions(false);
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
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

    setIsCreating(true);
    try {
      // 1. Create the base split request
      const { data: split, error: splitError } = await supabase
        .from("bill_splits")
        .insert({
          creator_id: currentUser.id,
          title: title.trim(),
          total_amount: parseFloat(totalAmount),
          amount_per_person: calculatedShare,
          category,
          status: "active"
        })
        .select()
        .single();

      if (splitError) throw splitError;

      // 2. Add members
      const membersPayload = participants.map((p) => ({
        bill_split_id: split.id,
        user_id: p.id,
        creator_id: currentUser.id,
        amount: calculatedShare,
        status: "pending"
      }));

      const { error: membersError } = await supabase
        .from("bill_split_members")
        .insert(membersPayload);

      if (membersError) throw membersError;

      toast.success("Bill split request created successfully!");
      setTitle("");
      setTotalAmount("");
      setParticipants([]);
      fetchSplits();
    } catch (error: any) {
      console.error("Error creating split:", error);
      toast.error(error.message || "Failed to create split request");
    } finally {
      setIsCreating(false);
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
        p_member_id: selectedMemberIdToPay
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
          {/* Bill Form details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="split-title">Bill Description / Title</Label>
                <Input
                  id="split-title"
                  placeholder="e.g. Rent, Grocery shopping, Lunch"
                  className="bg-background/40 h-12 border-border/60"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="split-amount">Total Amount ({currency})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    {currency}
                  </span>
                  <Input
                    id="split-amount"
                    type="number"
                    placeholder="0.00"
                    className="bg-background/40 h-12 pl-12 border-border/60 text-lg font-medium"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Category Select */}
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {categories.map((c) => {
                  const Icon = c.icon;
                  const isSelected = category === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-1.5",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border/40 bg-background/20 text-muted-foreground hover:bg-background/40 hover:text-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium">{c.label.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search Participant */}
            <div className="space-y-2 relative" onClick={(e) => e.stopPropagation()}>
              <Label>Add Friends (Vault Users)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by first name or KYC tag..."
                  className="pl-10 bg-background/40 h-12 border-border/60"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSuggestions(true);
                  }}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Autocomplete suggestions dropdown */}
              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-1">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="flex items-center gap-3 w-full p-2.5 rounded-lg hover:bg-primary/5 text-left transition-colors group"
                        onClick={() => handleAddParticipant(u)}
                      >
                        <Avatar className="w-8 h-8 border border-border/40">
                          <AvatarImage src={u.profile_photo_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                            {u.first_name[0]}{u.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {u.first_name} {u.last_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">{u.kyc_tag}</div>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* List of selected participants */}
            {participants.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Friends</Label>
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 bg-background/50 border border-border/60 pl-2 pr-1.5 py-1 rounded-full text-xs font-medium animate-in scale-in duration-200"
                    >
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={p.profile_photo_url} />
                        <AvatarFallback className="text-[8px] bg-primary/20 text-primary font-bold">
                          {p.first_name[0]}{p.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>{p.first_name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(p.id)}
                        className="w-4 h-4 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Summary Block */}
          <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-border/40 pt-6 lg:pt-0 lg:pl-8 space-y-6">
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Split Breakdown</div>

              <div className="rounded-2xl bg-background/25 border border-border/40 p-4 space-y-3.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold text-foreground">{currency} {parseFloat(totalAmount || "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Include Me in Split</span>
                  <button
                    type="button"
                    onClick={() => setIncludeCreator(!includeCreator)}
                    className={cn(
                      "w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none",
                      includeCreator ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn("w-4 h-4 rounded-full bg-white transition-transform", includeCreator ? "translate-x-4" : "translate-x-0")} />
                  </button>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Participants</span>
                  <span className="font-medium text-foreground">{shareCount} people</span>
                </div>

                <div className="border-t border-border/40 pt-3 flex justify-between items-end">
                  <div className="text-xs text-muted-foreground font-medium">Individual Share</div>
                  <div className="text-xl font-semibold text-primary font-mono">
                    {currency} {calculatedShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-12 shadow-md shadow-primary/10"
              onClick={handleCreateSplit}
              disabled={isCreating || participants.length === 0}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating splits...
                </>
              ) : (
                <>
                  Create Split Request <Plus className="ml-2 w-4 h-4" />
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
              <ArrowDownLeft className="w-4 h-4 text-rose-500" />
              Splits You Owe (Incoming Requests)
            </h4>

            <div className="rounded-2xl border border-border/40 bg-card/30 p-4 space-y-3 min-h-[180px]">
              {loadingSplits ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
                  <span className="text-xs">Loading requests...</span>
                </div>
              ) : splitsOwed.filter(m => m.status === "pending").length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/20 mb-2" />
                  <span className="text-sm font-medium text-muted-foreground">You are all clear!</span>
                  <span className="text-xs text-muted-foreground/60 mt-0.5">No pending splits to pay.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {splitsOwed.filter(m => m.status === "pending").map((m) => {
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
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", catColor)}>
                            <CatIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{m.bill_splits.title}</div>
                            <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                              Requested by {creatorName} <span className="font-mono text-primary/80">{creatorTag}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-rose-500 font-mono">
                              -{currency} {m.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                              setIsPinModalOpen(true);
                            }}
                          >
                            Pay
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Already Paid Splits (History) */}
              {splitsOwed.filter(m => m.status === "paid").length > 0 && (
                <div className="pt-4 border-t border-border/40 mt-4 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Recently Settled</div>
                  {splitsOwed.filter(m => m.status === "paid").slice(0, 3).map((m) => {
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
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", catColor)}>
                            <CatIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 text-xs">
                            <div className="font-medium text-foreground truncate">{m.bill_splits.title}</div>
                            <div className="text-[9px] text-muted-foreground truncate mt-0.5">Paid to {creatorName}</div>
                          </div>
                        </div>
                        <div className="text-right text-xs shrink-0">
                          <div className="font-semibold text-emerald-500 font-mono flex items-center justify-end gap-1">
                            <Check className="w-3.5 h-3.5" /> {currency} {m.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
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
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
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
                  <span className="text-sm font-medium text-muted-foreground">No active splits</span>
                  <span className="text-xs text-muted-foreground/60 mt-0.5">Create a split request above.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {splitsCreated.map((s) => {
                    const CatIcon = getCategoryIcon(s.category);
                    const catColor = getCategoryColor(s.category);
                    const paidMembers = s.bill_split_members.filter((m: any) => m.status === "paid");
                    const totalMembers = s.bill_split_members.length;
                    const progressPercentage = totalMembers > 0 ? (paidMembers.length / totalMembers) * 100 : 100;

                    return (
                      <div
                        key={s.id}
                        className="p-4 rounded-xl bg-background/40 border border-border/40 space-y-3 animate-in fade-in duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", catColor)}>
                              <CatIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">{s.title}</div>
                              <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                Total: {currency} {s.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} · {currency} {s.amount_per_person.toLocaleString(undefined, { minimumFractionDigits: 2 })} each
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase",
                              s.status === "completed" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/25" : "bg-primary/10 text-primary border border-primary/25"
                            )}>
                              {s.status}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                            <span>Settled Progress</span>
                            <span>{paidMembers.length} of {totalMembers} paid ({Math.round(progressPercentage)}%)</span>
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
                              <div key={m.id} className="flex items-center justify-between p-1.5 rounded-lg bg-background/25">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="w-4 h-4">
                                    <AvatarImage src={m.profiles?.profile_photo_url} />
                                    <AvatarFallback className="text-[6px] bg-primary/20 text-primary font-bold">
                                      {m.profiles?.first_name?.[0]}{m.profiles?.last_name?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate text-[10px] font-medium">{name}</span>
                                </div>
                                <span className={cn(
                                  "flex items-center gap-1 font-semibold text-[9px] uppercase",
                                  isPaid ? "text-emerald-500" : "text-muted-foreground/60"
                                )}>
                                  {isPaid ? (
                                    <>
                                      <Check className="w-3 h-3" /> Paid
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3 h-3" /> Pending
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
      />

      {isPaying && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex flex-col items-center justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 animate-pulse" />
            <Loader2 className="w-24 h-24 text-primary animate-spin absolute inset-0" />
          </div>
          <h2 className="text-xl font-medium mt-8">Processing settlement...</h2>
          <p className="text-sm text-muted-foreground mt-2">Transferring funds securely via Vault Ledger rails.</p>
        </div>
      )}
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

  const [profile] = useProfileSignal();

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

    // Method-specific logo helper - enhanced with all banks and mobile services
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
          color: "bg-emerald-500/20 text-emerald-500",
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
        color: "bg-emerald-500/20 text-emerald-500",
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
                      <div className="flex items-center justify-center w-12 h-12 shrink-0 rounded-lg bg-input/40 border border-border/40">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground/70 tracking-wider">
                          {typeLabel}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {details.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 mt-1">
                          {format(new Date(t_item.created_at), "EEEE, MMM dd, yyyy · h:mm a")}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                      <div
                        className={`text-sm font-semibold font-mono ${
                          details.positive ? "text-emerald-500" : "text-red-500"
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
