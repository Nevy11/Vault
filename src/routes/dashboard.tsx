import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  UserPlus,
  Lock as LockIcon,
  MoreVertical,
  Plus,
  Settings,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
  Shield,
  Loader2,
  ArrowRight,
  TrendingUp,
  Landmark,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { useTransactions, type Transaction } from "@/hooks/use-transactions";
import { useLedger, type LedgerEntry } from "@/hooks/use-ledger";
import { useProfileSignal } from "@/lib/profile-signal";
import { useNotifications } from "@/hooks/use-notifications";
import { supabase } from "@/api/supabase";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { FinancialHealthReport } from "@/components/financial-health-report";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>) => {
    return search as { session_id?: string };
  },
  head: () => ({
    meta: [
      { title: "Dashboard — Vault OS" },
      {
        name: "description",
        content: "Unified portfolio balance and transactions across your finance accounts.",
      },
    ],
  }),
  component: DashboardPage,
});

function AccountBadge({
  icon,
  name,
  type,
  amount,
  updated,
  primary,
}: {
  icon: React.ReactNode;
  name: string;
  type: string;
  amount: string;
  updated?: string;
  primary?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card/60 border border-border/50 p-6 backdrop-blur-sm transition-all hover:bg-card/80 hover:border-primary/30">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-3xl transition-all group-hover:bg-primary/10" />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              {icon}
            </div>
            <div>
              <div className="text-base font-medium tracking-tight">{name}</div>
              <div className="text-xs text-muted-foreground/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                {type}
              </div>
            </div>
          </div>
          {primary ? (
            <div className="h-8 w-8 rounded-full hover:bg-muted/50 flex items-center justify-center transition-colors cursor-pointer">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          ) : (
            <LockIcon className="w-4 h-4 text-muted-foreground/60" />
          )}
        </div>

        <div className="mt-6">
          <div className="text-3xl font-semibold tracking-tight text-primary">{amount}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
            Available Balance
          </div>
        </div>

        {primary ? (
          <div className="mt-6 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 h-9 rounded-xl font-medium shadow-sm active:scale-95 transition-transform"
              asChild
            >
              <Link to="/transactions" search={{ mode: "send" }}>
                Send
              </Link>
            </Button>
            <Button
              size="sm"
              className="flex-1 h-9 rounded-xl font-medium shadow-md active:scale-95 transition-transform"
              asChild
            >
              <Link to="/transactions" search={{ mode: "deposit" }}>
                Deposit
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 rounded-xl font-medium border-border/60 hover:bg-muted/50 active:scale-95 transition-transform"
              asChild
            >
              <Link to="/transactions" search={{ mode: "withdraw" }}>
                Withdraw
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 pt-4 border-t border-border/20 text-[10px] text-muted-foreground/60 flex items-center justify-end gap-1">
            <RefreshCw className="w-2.5 h-2.5" />
            {updated}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickSend({
  avatars,
  withAdd,
  onAvatarClick,
  title = "Quick Send (P2P)",
  className,
}: {
  avatars: {
    id?: string;
    initial: string;
    color: string;
    name: string;
    tag?: string;
    avatarUrl?: string | null;
  }[];
  withAdd?: boolean;
  onAvatarClick?: (tag: string) => void;
  title?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-card/40 border border-border/40 p-5 backdrop-blur-sm transition-all hover:border-border/60", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground/80">
          {title}
        </div>
        <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
      </div>
      <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide">
        {withAdd && (
          <button className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all">
            <Plus className="w-5 h-5" />
          </button>
        )}
        {avatars.map((a, index) => (
          <div
            key={a.id ?? `${a.name}-${index}`}
            className="flex flex-col items-center gap-2 group cursor-pointer flex-shrink-0"
            onClick={() => a.tag && onAvatarClick?.(a.tag)}
          >
            <div className="relative">
              {a.avatarUrl ? (
                <img
                  src={a.avatarUrl}
                  alt={a.name}
                  className="w-12 h-12 rounded-full object-cover shadow-lg transition-transform group-hover:scale-105 group-active:scale-95"
                />
              ) : (
                <div
                  className={`w-12 h-12 rounded-full ${a.color} flex items-center justify-center text-white font-semibold shadow-lg transition-transform group-hover:scale-105 group-active:scale-95`}
                >
                  {a.initial}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card shadow-sm" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {a.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NetWorthChart({
  entries,
  currencySymbol,
  currentBalance,
}: {
  entries: LedgerEntry[];
  currencySymbol: string;
  currentBalance: number;
}) {
  const [viewMode, setViewMode] = useState<"daily" | "transaction">("transaction");

  const chartData = useMemo(() => {
    if (!entries || entries.length === 0) {
      return [
        {
          name: "Now",
          fullDate: "Current Balance",
          value: currentBalance,
          created_at: new Date().toISOString(),
        },
      ];
    }

    // Sort entries chronologically (oldest first)
    const sorted = [...entries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    let runningSum = 0;
    const history = sorted.map((entry) => {
      runningSum += Number(entry.amount);
      return {
        name: format(new Date(entry.created_at), "MMM dd"),
        fullDate: format(new Date(entry.created_at), "PPP p"),
        value: runningSum,
        created_at: entry.created_at,
      };
    });

    // Add final "Now" point to match the wallets table exactly
    history.push({
      name: "Now",
      fullDate: "Current Balance",
      value: currentBalance,
      created_at: new Date().toISOString(),
    });

    if (viewMode === "transaction") {
      return history;
    } else {
      const dailyMap: Record<string, any> = {};
      history.forEach((point) => {
        const day = format(new Date(point.created_at), "yyyy-MM-dd");
        dailyMap[day] = point;
      });

      return Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([_, point]) => ({
          name: point.name === "Now" ? point.name : format(new Date(point.created_at), "MMM dd"),
          fullDate:
            point.name === "Now" ? "Current Balance" : format(new Date(point.created_at), "PPP"),
          value: point.value,
        }));
    }
  }, [entries, viewMode, currentBalance]);

  const minValue = Math.min(...chartData.map((d) => d.value || 0));
  const maxValue = Math.max(...chartData.map((d) => d.value || 0));
  const isPositive =
    chartData.length > 1 ? chartData[chartData.length - 1].value >= chartData[0].value : true;

  return (
    <div className="rounded-2xl bg-card/40 border border-border/40 p-5 backdrop-blur-sm h-full flex flex-col transition-all hover:border-border/60">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
            Net Worth Growth
            <TrendingUp
              className={`w-3 h-3 ${isPositive ? "text-emerald-500" : "text-destructive"}`}
            />
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">
            Latest: {currencySymbol}
            {currentBalance.toLocaleString()}
          </div>
        </div>
        <div className="flex bg-muted/30 rounded-lg p-0.5 border border-border/20">
          <button
            onClick={() => setViewMode("transaction")}
            className={`px-2 py-1 text-[9px] font-black rounded-md transition-all ${
              viewMode === "transaction"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            TX
          </button>
          <button
            onClick={() => setViewMode("daily")}
            className={`px-2 py-1 text-[9px] font-black rounded-md transition-all ${
              viewMode === "daily"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            DAY
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-[120px] mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
              opacity={0.1}
            />
            <XAxis dataKey="name" hide />
            <YAxis hide domain={[minValue * 0.9, maxValue * 1.1]} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl bg-card/95 border border-border/40 p-3 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">
                        {payload[0].payload.fullDate}
                      </p>
                      <p className="text-sm font-black text-primary">
                        {currencySymbol}
                        {payload[0].value?.toLocaleString()}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-border/10 flex justify-between items-center">
        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
          {chartData.length} data points
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-muted-foreground uppercase font-black">Low</span>
            <span className="text-[10px] font-black">
              {currencySymbol}
              {minValue.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-muted-foreground uppercase font-black">High</span>
            <span className="text-[10px] font-black text-emerald-500">
              {currencySymbol}
              {maxValue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityStatus() {
  const openReceipts = () => console.log("Open receipts placeholder");
  
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card/60 border border-border/50 p-6 backdrop-blur-sm flex flex-col justify-between h-full transition-all hover:bg-card/80 hover:border-primary/30">
      <div className="absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-primary/5 blur-3xl transition-all group-hover:bg-primary/10" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-medium tracking-tight">Security Shield</span>
            <div className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM SECURE
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: "End-to-End Encryption", val: "AES-256", status: "active" },
            { label: "Identity Protection", val: "ENHANCED", status: "active" },
            { label: "Device Integrity", val: "VERIFIED", status: "active" },
          ].map((item) => (
            <div key={item.label} className="group/item">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground/80 group-hover/item:text-foreground transition-colors">
                  {item.label}
                </span>
                <span className="text-[10px] font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                  {item.val}
                </span>
              </div>
              <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden">
                <div className="h-full bg-primary/40 rounded-full w-full group-hover:bg-primary/60 transition-all duration-700" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="relative z-10 mt-8 w-full text-xs gap-2 h-9 rounded-xl border border-border/40 hover:bg-muted/50 hover:border-border transition-all"
        onClick={openReceipts}
      >
        <Shield className="w-3 h-3" /> Security Transaction Logs
      </Button>
    </div>
  );
}

function AIInsightsWidget({ profileId }: { profileId?: string }) {
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!profileId) return;
    
    // Check DB first for latest insight
    async function loadLatestInsight() {
      const { data } = await supabase
        .from("financial_insights")
        .select("*")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (data) setInsight(data);
    }
    
    loadLatestInsight();
  }, [profileId]);

  const generateNewInsight = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("financial-health-check", {
        body: { userId: profileId },
      });
      
      if (error) {
        let errorMessage = error.message;
        try {
          // Attempt to extract the JSON error message from the Edge Function response
          if (error.context && typeof error.context.json === "function") {
            const errorBody = await error.context.json();
            if (errorBody?.error) errorMessage = errorBody.error;
          }
        } catch (e) {
          // Ignore parsing errors
        }
        throw new Error(errorMessage);
      }
      
      if (data?.insight) {
        setInsight(data.insight);
      }
    } catch (err: any) {
      console.error("Failed to generate insight:", err);
      toast.error(`AI Insight Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted || !profileId) {
    return (
      <div className="rounded-3xl bg-muted/20 border border-border/40 p-8 mb-8 animate-pulse h-[160px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40">Initializing AI Advisor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-primary/5 border border-primary/20 p-6 sm:p-8 backdrop-blur-sm transition-all hover:bg-primary/10 mb-8 shadow-lg">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition-all group-hover:bg-primary/20" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex flex-shrink-0 items-center justify-center text-primary-foreground shadow-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">AI Financial Insight</h3>
            {insight ? (
              <div className="mt-2 space-y-1">
                <div className="text-sm font-semibold text-primary">{insight.title || insight.content}</div>
                {insight.title && <div className="text-xs text-muted-foreground leading-relaxed">{insight.content}</div>}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Click generate to analyze your spending and get AI predictions.</p>
            )}
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={generateNewInsight} 
          disabled={loading}
          className="shrink-0 rounded-2xl h-10 border-primary/30 text-primary hover:bg-primary/10 shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {insight ? "Update Analysis" : "Generate Insight"}
        </Button>
      </div>
    </div>
  );
}

const filters = ["All", "Send", "Received", "Deposit", "Withdraw"];

function DashboardPage() {
  const navigate = useNavigate();
  const { balance, currency, loading: balanceLoading, error: balanceError } = useWalletBalance();
  const { transactions, loading: txLoading, error: txError, refetch: refetchTransactions } = useTransactions(!balanceLoading);
  const { entries: ledgerEntries, loading: ledgerLoading } = useLedger(!balanceLoading, currency);
  const { notifications, markAsRead } = useNotifications();
  const [activeFilter, setActiveFilter] = useState("All");
  const [showReport, setShowReport] = useState(false);
  const [profile] = useProfileSignal();
  const [balanceHistory, setBalanceHistory] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);

  // Fetch suggested users from profiles table
  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, kyc_tag, profile_photo_url")
          .neq("id", user.id)
          .limit(8);

        if (error) throw error;

        if (data) {
          const colors = ["bg-emerald-500", "bg-blue-500", "bg-pink-500", "bg-amber-500", "bg-indigo-500", "bg-violet-500"];
          const mapped = data.map((u, i) => ({
            id: u.id,
            initial: u.first_name?.[0] || "V",
            color: colors[i % colors.length],
            name: `${u.first_name} ${u.last_name?.[0] || ""}`.trim(),
            tag: u.kyc_tag,
            avatarUrl: u.profile_photo_url,
          }));
          setSuggestedUsers(mapped);
        }
      } catch (err) {
        console.error("Error fetching suggested users:", err);
      }
    };

    fetchSuggestedUsers();
  }, []);

  // Find unread warning notifications (like sharp drops from AI)
  const warningNotifications = useMemo(() => 
    notifications.filter(n => !n.is_read && n.type === "warning"),
  [notifications]);

  useEffect(() => {
    const fetchBalanceHistory = async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('balance_history')
        .select('*')
        .order('recorded_at', { ascending: false });
      setBalanceHistory(data || []);
    };
    fetchBalanceHistory();
  }, [profile?.id, transactions]); // Refetch when transactions change

  const frequentRecipients = useMemo(() => {
    const seenIds = new Set();
    const uniqueRecipients: {
      id: string;
      initial: string;
      color: string;
      name: string;
      tag?: string;
      avatarUrl?: string | null;
    }[] = [];
    const currentUserId = (profile as any)?.id;

    if (!currentUserId) return [];

    for (const tx of transactions) {
      if (
        tx.type === "transfer" &&
        tx.sender_id === currentUserId &&
        tx.receiver &&
        tx.receiver_id
      ) {
        if (!seenIds.has(tx.receiver_id)) {
          seenIds.add(tx.receiver_id);
          uniqueRecipients.push({
            id: tx.receiver_id,
            initial: tx.receiver?.first_name?.[0] ?? "V",
            color: "bg-emerald-500",
            name: `${tx.receiver?.first_name ?? "Vault"} ${tx.receiver?.last_name ?? ""}`.trim(),
            tag: tx.receiver?.kyc_tag,
            avatarUrl: tx.receiver?.profile_photo_url,
          });
        }
      }
      if (uniqueRecipients.length >= 4) break;
    }
    return uniqueRecipients;
  }, [transactions, profile]);

  const handleQuickSend = (tag: string) => {
    navigate({
      to: "/transactions",
      search: { mode: "send", to: tag.replace("@", "") },
    });
  };

  const syncTime = useMemo(() => {
    if (txLoading) return "Syncing...";
    if (transactions.length === 0) return "Just now";
    const lastActivity = new Date(transactions[0].created_at);
    return `Data Synced ${formatDistanceToNow(lastActivity, { addSuffix: true })}`;
  }, [transactions, txLoading]);

  const filteredTransactions = useMemo(() => {
    if (activeFilter === "All") return transactions;
    const filter = activeFilter.toLowerCase();

    if (filter === "send")
      return transactions.filter(
        (t: any) => t.type === "transfer" && t.sender_id === (profile as any)?.id,
      );
    if (filter === "received")
      return transactions.filter(
        (t: any) =>
          (t.type === "transfer" && t.receiver_id === (profile as any)?.id) || t.type === "deposit",
      );
    if (filter === "deposit") return transactions.filter((t: any) => t.type === "deposit");
    if (filter === "withdraw") return transactions.filter((t: any) => t.type === "withdrawal");

    return transactions;
  }, [transactions, activeFilter, profile]);

  const getTransactionDetails = (t: any) => {
    const isSender = t.sender_id === (profile as any)?.id;
    const userName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ""}`.trim()
      : profile?.email?.split("@")[0] || "Vault User";
    const symbol = currency === "USD" ? "$" : currency + " ";
    
    // Method-specific logo helper - enhanced with all banks
    const getMethodLogo = (method: string, description: string) => {
      const desc = (description || '').toLowerCase();
      const meth = (method || '').toLowerCase();
      
      // Mobile money services
      if (desc.includes('mpesa') || desc.includes('m-pesa') || meth.includes('mpesa')) return '/logos/mpesa.svg';
      if (desc.includes('airtel') || meth.includes('airtel')) return '/logos/airtel.svg';
      if (desc.includes('t-kash') || desc.includes('tkash') || meth.includes('tkash')) return '/logos/tkash.svg';
      
      // Banks
      if (desc.includes('kcb') || meth.includes('kcb')) return '/logos/kcb.svg';
      if (desc.includes('co-operative') || desc.includes('coop') || meth.includes('coop')) return '/logos/coop.svg';
      if (desc.includes('ncba') || meth.includes('ncba')) return '/logos/ncba.svg';
      if (desc.includes('absa') || meth.includes('absa')) return '/logos/absa.svg';
      if (desc.includes('standard chartered') || meth.includes('standard')) return '/logos/standard-chartered.svg';
      if (desc.includes('stanbic') || meth.includes('stanbic')) return '/logos/stanbic.svg';
      if (desc.includes('i&m') || desc.includes('im bank') || meth.includes('im bank')) return '/logos/im-bank.svg';
      if (desc.includes('dtb') || desc.includes('diamond trust') || meth.includes('dtb')) return '/logos/dtb.svg';
      if (desc.includes('family bank') || meth.includes('family')) return '/logos/family-bank.svg';
      if (desc.includes('chase bank') || meth.includes('chase')) return '/logos/chase.svg';
      if (desc.includes('bank of america') || meth.includes('america')) return '/logos/bank-of-america.svg';
      
      // Fallback for generic bank method
      if (meth === 'bank' || meth === 'mpesa' || meth === 'airtel') return '/logos/bank.svg';
      return null; // Fallback to initials
    };

    if (t.type === "transfer") {
      if (t.description === "Transferred to savings") {
        return {
          title: "Transferred to savings",
          amount: `-${symbol}${t.amount.toLocaleString()}`,
          positive: false,
          icon: "S",
          logo: null,
          color: "bg-primary/20 text-primary",
        };
      }
      if (isSender) {
        // Check if this is a transfer to a mobile/bank service
        const desc = (t.description || '').toLowerCase();
        const logo = getMethodLogo(t.method || '', t.description || '');
        const hasMobileOrBank = logo && desc.includes('transfer to');
        
        return {
          title: t.description || `Transfer to ${t.receiver?.first_name || "User"}`,
          amount: `-${symbol}${t.amount.toLocaleString()}`,
          positive: false,
          icon: hasMobileOrBank ? null : (t.receiver?.first_name?.[0] || "T"),
          logo: hasMobileOrBank ? logo : (t.receiver?.profile_photo_url || null),
          color: "bg-primary/20 text-primary",
        };
      } else {
        return {
          title: `Received from ${t.sender?.first_name || "User"}`,
          amount: `+${symbol}${t.amount.toLocaleString()}`,
          positive: true,
          icon: t.sender?.first_name?.[0] || "R",
          logo: t.sender?.profile_photo_url || null,
          color: "bg-emerald-500/20 text-emerald-500",
        };
      }
    } else if (t.type === "deposit") {
      const logo = getMethodLogo(t.method, t.description);
      return {
        title: t.description,
        amount: `+${symbol}${t.amount.toLocaleString()}`,
        positive: true,
        icon: logo ? null : 'D',
        logo: logo,
        color: "bg-emerald-500/20 text-emerald-500",
      };
    } else if (t.type === "withdrawal") {
      const logo = getMethodLogo(t.method, t.description);
      return {
        title: t.description,
        amount: `-${symbol}${t.amount.toLocaleString()}`,
        positive: false,
        icon: logo ? null : 'W',
        logo: logo,
        color: "bg-destructive/20 text-destructive",
      };
    }
    return {
      title: t.description,
      amount: `${symbol}${t.amount.toLocaleString()}`,
      positive: true,
      icon: "?",
      logo: null,
      color: "bg-secondary text-secondary-foreground",
    };
  };

  const currencySymbol = currency === "USD" ? "$" : currency + " ";

  return (
    <AppShell>
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Unified Portfolio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time aggregate of your Vault financial ecosystem.
          </p>
        </div>

        {/* AI Financial Insights Widget */}
        <AIInsightsWidget profileId={profile?.id} />

        {/* Warning Notifications */}
        {warningNotifications.length > 0 && (
          <div className="mb-8 space-y-3">
            {warningNotifications.map((n) => (
              <Alert key={n.id} variant="destructive" className="bg-destructive/10 border-destructive/30 rounded-2xl animate-in slide-in-from-top-4 duration-500">
                <Shield className="h-4 w-4" />
                <AlertTitle className="font-bold">{n.title}</AlertTitle>
                <AlertDescription className="flex items-center justify-between gap-4">
                  <span>{n.message}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] uppercase font-bold hover:bg-destructive/20"
                    onClick={() => markAsRead(n.id)}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {(balanceError || txError) && (
          <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {balanceError ? `Balance error: ${balanceError}` : null}
            {balanceError && txError ? " " : null}
            {txError ? `Transaction error: ${txError}` : null}
          </div>
        )}

        {/* Total net worth */}
        <div className="group relative overflow-hidden rounded-3xl bg-card/40 border border-border/40 p-8 sm:p-10 mb-8 backdrop-blur-md transition-all hover:bg-card/50 hover:border-primary/20 shadow-xl">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, var(--primary) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/5 blur-[100px] transition-all group-hover:bg-primary/10" />
          <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-primary/5 blur-[80px] transition-all group-hover:bg-primary/10" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
                  Total Unified Net Worth
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4">
                {balanceLoading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xl text-muted-foreground font-light">
                      Analyzing portfolio...
                    </span>
                  </div>
                ) : balanceError ? (
                  <span className="text-5xl sm:text-6xl font-light text-destructive">Error</span>
                ) : (
                  <>
                    <span className="text-5xl sm:text-6xl font-bold tracking-tight">
                      {currencySymbol}
                      {balance?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-semibold">
                      <TrendingUp className="w-3.5 h-3.5" />+ 5.25%
                    </div>
                  </>
                )}
              </div>
              <p className="mt-4 text-xs text-muted-foreground/60 max-w-sm leading-relaxed">
                Your portfolio is currently outperforming 84% of similar Vault accounts this month.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="h-12 px-6 rounded-2xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 bg-primary"
                onClick={() =>
                  toast.info("Vault Connect", {
                    description: "External account linking is currently in maintenance mode.",
                  })
                }
              >
                <UserPlus className="w-4 h-4 mr-2" /> Add External Account
              </Button>
              <Button
                variant="outline"
                className="h-12 px-6 rounded-2xl font-semibold border-border/60 backdrop-blur-md hover:bg-muted/50 transition-all active:scale-95"
                onClick={() => setShowReport(true)}
              >
                Detailed Report
              </Button>
            </div>
          </div>
        </div>

        {/* Report Modal */}
        <FinancialHealthReport
          open={showReport}
          onOpenChange={setShowReport}
          currencySymbol={currencySymbol}
        />

        {/* Accounts grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2">
            <AccountBadge
              primary
              icon={
                <svg width="16" height="16" viewBox="0 0 32 32">
                  <path
                    d="M6 6 L16 26 L26 6"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              }
              name="Vault: Digital Wallet OS"
              type="Verified Account"
              amount={
                balanceLoading
                  ? "Loading..."
                  : balanceError
                    ? "Error"
                    : `${currencySymbol}${balance?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
            />
          </div>
          <div className="md:col-span-1">
            <SecurityStatus />
          </div>
        </div>

        {/* Quick actions + Finance Hub */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <Link
            to="/finance-hub"
            className="col-span-1 group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/25 p-6 sm:p-7 lg:p-8 backdrop-blur-md transition-all duration-300 hover:from-primary/20 hover:via-primary/10 hover:border-primary/40 hover:shadow-xl shadow-md min-h-[240px] flex flex-col justify-center"
          >
            {/* Decorative blur elements */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/8 rounded-full blur-3xl group-hover:bg-primary/12 transition-all duration-300" />
            <div className="absolute -left-8 bottom-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/8 transition-all duration-300" />
            
            {/* Header with label and icon */}
            <div className="relative flex items-center justify-between mb-6 sm:mb-8">
              <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary/70 group-hover:text-primary transition-colors">
                Finance & Credit
              </div>
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
            
            {/* Main content */}
            <div className="relative flex items-center gap-4 sm:gap-5">
              {/* Icon container */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                  <Landmark className="w-8 h-8" />
                </div>
              </div>
              
              {/* Text content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight mb-1.5">Savings & Loans</h3>
                <p className="text-sm text-muted-foreground/85 leading-relaxed">Unlock 2% rewards & instant credit</p>
              </div>
            </div>
          </Link>
          <QuickSend
            className="col-span-1"
            onAvatarClick={handleQuickSend}
            avatars={
              frequentRecipients.length > 0
                ? frequentRecipients
                : suggestedUsers.length > 0
                  ? suggestedUsers
                  : [
                      { initial: "M", color: "bg-emerald-500", name: "Maria C", tag: "@maria" },
                      { initial: "J", color: "bg-blue-500", name: "John L", tag: "@john" },
                      { initial: "L", color: "bg-pink-500", name: "Lisa M", tag: "@lisa" },
                      { initial: "A", color: "bg-red-500", name: "Ben A", tag: "@ben" },
                    ]
            }
          />
          <div className="hidden sm:block col-span-1">
            <NetWorthChart
              entries={ledgerEntries}
              currencySymbol={currencySymbol}
              currentBalance={balance || 0}
            />
          </div>
        </div>

        {/* Recent Transactions Heading */}
        <div className="mb-4">
          <h2 className="text-lg font-light tracking-tight text-foreground/90">
            Recent transactions
          </h2>
        </div>

        {/* Transactions list */}
        <div className="rounded-2xl bg-card/30 border border-border/40 p-4 sm:p-5 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    activeFilter === f
                      ? "border-primary text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button 
              onClick={() => refetchTransactions()}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-primary transition-colors group/sync"
              disabled={txLoading}
            >
              <RefreshCw className={cn("w-3 h-3 transition-transform group-hover/sync:rotate-180 duration-500", txLoading && "animate-spin")} /> 
              {syncTime}
            </button>
          </div>

          <ul className="divide-y divide-border/40">
            {txLoading || ledgerLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No transactions found.
              </div>
            ) : (
              filteredTransactions.map((t) => {
                const details = getTransactionDetails(t);
                
                // Trust the balance_after provided by the useTransactions hook
                // This value is already the 'Ultimate Truth' (combined DB snapshots + anchored calculation)
                const displayBalance = t.balance_after || balance || 0;

                return (
                  <li
                    key={t.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] uppercase w-9 text-center text-muted-foreground shrink-0">
                        {t.type === "transfer" ? "P2P" : t.type.substring(0, 3)}
                      </span>
                      <Avatar className="w-9 h-9 border border-border/40 shrink-0">
                        <AvatarImage src={details.logo || details.avatarUrl || undefined} />
                        <AvatarFallback className={cn("text-sm font-semibold", details.color)}>
                          {details.icon}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm truncate">{details.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(t.created_at), "h:mm a")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right sm:text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto ml-13 sm:ml-0">
                      <div
                        className={`text-sm font-medium ${details.positive ? "text-primary" : "text-destructive"}`}
                      >
                        {details.amount}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Balance: {currencySymbol}{displayBalance.toLocaleString()}
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </main>
    </AppShell>
  );
}
