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
  ShieldAlert,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { useTransactions, type Transaction } from "@/hooks/use-transactions";
import { useLedger, type LedgerEntry } from "@/hooks/use-ledger";
import { usePortfolioSummary } from "@/hooks/use-portfolio-summary";
import { useProfile } from "@/hooks/use-profile";
import { useNotifications } from "@/hooks/use-notifications";
import { supabase } from "@/api/supabase";
import { format, formatDistanceToNow, startOfWeek, startOfMonth, subDays } from "date-fns";
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
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>) => {
    return search as { session_id?: string };
  },
  head: () => {
    const t = i18n.t;
    return {
      meta: [
        { title: t("dashboard.page_title") },
        {
          name: "description",
          content: t("dashboard.page_description"),
        },
      ],
    };
  },
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
  const { t: translate } = useTranslation();
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card/60 border border-border/50 p-6 backdrop-blur-sm transition-all hover:bg-card/80 hover:border-primary/30">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-3xl transition-all group-hover:bg-primary/10" />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              {icon}
            </div>
            <div className="min-w-0">
              <div className="text-base font-medium tracking-tight truncate">{name}</div>
              <div className="text-xs text-muted-foreground/80 flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                <span className="truncate">{type}</span>
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
          <div
            className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 opacity-60"
            suppressHydrationWarning
          >
            {translate("dashboard.available_balance")}
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
  loading = false,
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
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card/40 border border-border/40 p-5 backdrop-blur-sm transition-all hover:border-border/60",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground/80">
          {title}
        </div>
        <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
      </div>
      <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-muted/50 animate-pulse" />
                <div className="h-2 w-8 bg-muted/50 rounded-full animate-pulse" />
              </div>
            ))}
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

function NetWorthChart({
  entries,
  currencySymbol,
  currentBalance,
}: {
  entries: any[];
  currencySymbol: string;
  currentBalance: number;
}) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<"transaction" | "daily" | "weekly" | "monthly">(
    "transaction",
  );

  const chartData = useMemo(() => {
    const safeBalance = typeof currentBalance === "number" ? currentBalance : 0;

    if (!entries || entries.length === 0) {
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);

      // If no entries, show a slight trend from 0 to current balance to avoid a flat line
      return [
        {
          name: format(thirtyDaysAgo, "MMM dd"),
          fullDate: "Starting Point",
          value: 0,
          created_at: thirtyDaysAgo.toISOString(),
        },
        {
          name: "Now",
          fullDate: "Current Balance",
          value: safeBalance,
          created_at: now.toISOString(),
        },
      ];
    }

    // Sort entries chronologically (oldest first)
    const sorted = [...entries].sort((a, b) => {
      const dateA = new Date(a.created_at || a.recorded_at).getTime();
      const dateB = new Date(b.created_at || b.recorded_at).getTime();
      return dateA - dateB;
    });

    // Determine if we are using balance history snapshots or ledger entries
    const isHistorySnapshots = sorted.length > 0 && "recorded_balance" in sorted[0];

    let fullHistory: any[] = [];

    if (isHistorySnapshots) {
      // If using snapshots, we just map them directly
      fullHistory = sorted.map((entry) => ({
        name: format(new Date(entry.recorded_at), "MMM dd"),
        fullDate: format(new Date(entry.recorded_at), "PPP p"),
        value: Number(entry.recorded_balance),
        created_at: entry.recorded_at,
      }));
    } else {
      // If using ledger entries, calculate the running balance backwards from current
      const totalChange = sorted.reduce((sum, e) => sum + Number(e.amount), 0);
      const openingBalance = safeBalance - totalChange;
      let runningBalance = openingBalance;

      const historyWithBalances = sorted.map((entry) => {
        runningBalance += Number(entry.amount);
        return {
          name: format(new Date(entry.created_at), "MMM dd"),
          fullDate: format(new Date(entry.created_at), "PPP p"),
          value: runningBalance,
          created_at: entry.created_at,
        };
      });

      // Anchor the graph with the opening balance point
      const firstEntryDate = new Date(sorted[0].created_at);
      const anchorPoint = {
        name: format(subDays(firstEntryDate, 1), "MMM dd"),
        fullDate: "Opening Balance",
        value: openingBalance,
        created_at: subDays(firstEntryDate, 1).toISOString(),
      };

      fullHistory = [anchorPoint, ...historyWithBalances];
    }

    // Add current point if it's not already represented
    const lastPoint = fullHistory[fullHistory.length - 1];
    const now = new Date();
    if (!lastPoint || now.getTime() - new Date(lastPoint.created_at).getTime() > 1000 * 60 * 60) {
      fullHistory.push({
        name: "Now",
        fullDate: "Current Balance",
        value: safeBalance,
        created_at: now.toISOString(),
      });
    }

    if (viewMode === "transaction") {
      return fullHistory;
    }

    // Aggregation logic for different time periods
    const aggregatedMap: Record<string, any> = {};

    fullHistory.forEach((point) => {
      let key = "";
      let label = "";
      const date = new Date(point.created_at);

      if (viewMode === "daily") {
        key = format(date, "yyyy-MM-dd");
        label = point.name === "Now" ? "Now" : format(date, "MMM dd");
      } else if (viewMode === "weekly") {
        key = format(startOfWeek(date), "yyyy-ww");
        label = `W${format(date, "w, yy")}`;
      } else if (viewMode === "monthly") {
        key = format(startOfMonth(date), "yyyy-MM");
        label = format(date, "MMM yy");
      }

      // Always take the LATEST balance for the period to show growth accurately
      aggregatedMap[key] = {
        ...point,
        name: label,
      };
    });

    return Object.keys(aggregatedMap)
      .sort()
      .map((key) => aggregatedMap[key]);
  }, [entries, viewMode, currentBalance]);

  const values = chartData.map((d) => d.value).filter((v) => typeof v === "number" && !isNaN(v));
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 0;

  // Domain calculation for visualization stability
  const domainMin =
    minValue === maxValue ? minValue - (minValue === 0 ? 100 : minValue * 0.1) : minValue * 0.98;
  const domainMax =
    minValue === maxValue ? maxValue + (maxValue === 0 ? 100 : maxValue * 0.1) : maxValue * 1.02;

  const isPositive =
    chartData.length > 1 ? chartData[chartData.length - 1].value >= chartData[0].value : true;

  return (
    <div className="rounded-2xl bg-card/40 border border-border/40 p-5 backdrop-blur-sm h-[280px] flex flex-col transition-all hover:border-border/60 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
            {t("dashboard.portfolio.growth")}
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
          {[
            { id: "transaction", label: "TX" },
            { id: "daily", label: "DAY" },
            { id: "weekly", label: "WK" },
            { id: "monthly", label: "MO" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as any)}
              className={`px-2 py-1 text-[8px] font-bold rounded-md transition-all ${
                viewMode === mode.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode.label}
            </button>
          ))}
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
            <YAxis hide domain={[domainMin, domainMax]} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl bg-card/95 border border-border/40 p-3 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 tracking-widest">
                        {payload[0].payload.fullDate}
                      </p>
                      <p className="text-sm font-bold text-primary">
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
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {t("dashboard.data_points", { count: chartData.length })}
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-muted-foreground uppercase font-bold">
              {t("dashboard.low")}
            </span>
            <span className="text-[10px] font-bold">
              {currencySymbol}
              {minValue.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-muted-foreground uppercase font-bold">
              {t("dashboard.high")}
            </span>
            <span className="text-[10px] font-bold text-emerald-500">
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
  const { t } = useTranslation();
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
            <span className="text-base font-medium tracking-tight">
              {t("dashboard.security_shield")}
            </span>
            <div className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              {t("dashboard.security.system_secure")}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {[
            {
              label: t("dashboard.security.encryption"),
              val: "AES-256",
              status: "active",
            },
            {
              label: t("dashboard.security.id_protection"),
              val: t("dashboard.security.enhanced"),
              status: "active",
            },
            {
              label: t("dashboard.security.device_integrity"),
              val: t("dashboard.security.verified"),
              status: "active",
            },
          ].map((item) => (
            <div key={item.label} className="group/item min-w-0">
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-xs text-muted-foreground/80 group-hover/item:text-foreground transition-colors truncate">
                  {item.label}
                </span>
                <span className="text-[10px] font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 shrink-0">
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
  const { t } = useTranslation();
  const { profile } = useProfile();
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
        body: {
          userId: profileId,
          language: profile?.language || "en",
        },
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
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40">
            {t("ai_insights.initializing")}
          </span>
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
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v4" />
              <path d="M12 18v4" />
              <path d="M4.93 4.93l2.83 2.83" />
              <path d="M16.24 16.24l2.83 2.83" />
              <path d="M2 12h4" />
              <path d="M18 12h4" />
              <path d="M4.93 19.07l2.83-2.83" />
              <path d="M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground truncate">{t("ai_insights.title")}</h3>
            {insight ? (
              <div className="mt-2 space-y-1">
                <div className="text-sm font-semibold text-primary truncate">
                  {insight.title || insight.content}
                </div>
                {insight.title && (
                  <div className="text-xs text-muted-foreground leading-relaxed break-words line-clamp-2 sm:line-clamp-none">
                    {insight.content}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">{t("ai_insights.placeholder")}</p>
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
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {insight ? t("ai_insights.update") : t("ai_insights.generate")}
        </Button>
      </div>
    </div>
  );
}

const filters = [
  { key: "All", labelKey: "dashboard.ledger.filters.all" },
  { key: "Send", labelKey: "dashboard.ledger.filters.send" },
  { key: "Received", labelKey: "dashboard.ledger.filters.received" },
  { key: "Deposit", labelKey: "dashboard.ledger.filters.deposit" },
  { key: "Withdraw", labelKey: "dashboard.ledger.filters.withdraw" },
];

function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
<<<<<<< HEAD
  const [profile] = useProfileSignal();

  // Guard against unauthenticated/loading state
  if (!profile) {
    return <div className="p-8 text-center">Loading...</div>;
  }
=======
  const { profile } = useProfile();
>>>>>>> 64a7ebf35aaeb41fe4a449a1a3e8b2f63ede57ca

  const { balance, currency, loading: balanceLoading, error: balanceError } = useWalletBalance();

  const {
    transactions,
    loading: txLoading,
    error: txError,
    refetch: refetchTransactions,
  } = useTransactions();

  const { entries: ledgerEntries, loading: ledgerLoading } = useLedger(currency);
  const { notifications, markAsRead } = useNotifications();
  const portfolioSummary = usePortfolioSummary(profile?.id);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showReport, setShowReport] = useState(false);
  const [balanceHistory, setBalanceHistory] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loadingSuggestedUsers, setLoadingSuggestedUsers] = useState(true);

  // Fetch suggested users from profiles table
  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      setLoadingSuggestedUsers(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoadingSuggestedUsers(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, kyc_tag, profile_photo_url")
          .neq("id", user.id)
          .limit(8);

        if (error) throw error;

        if (data) {
          const colors = [
            "bg-emerald-500",
            "bg-blue-500",
            "bg-pink-500",
            "bg-amber-500",
            "bg-indigo-500",
            "bg-violet-500",
          ];
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
      } finally {
        setLoadingSuggestedUsers(false);
      }
    };

    fetchSuggestedUsers();
  }, [profile?.id]);

  // Find unread warning notifications (like sharp drops from AI)
  const warningNotifications = useMemo(
    () => notifications.filter((n) => !n.is_read && n.type === "warning"),
    [notifications],
  );

  useEffect(() => {
    const fetchBalanceHistory = async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from("balance_history")
        .select("*")
        .order("recorded_at", { ascending: false });
      setBalanceHistory(data || []);
    };
    fetchBalanceHistory();
  }, [profile?.id, transactions]); // Refetch when transactions change

  const frequentRecipients = useMemo(() => {
    const currentUserId = (profile as any)?.id;
    if (!currentUserId || !transactions) return [];

    // 1. Count occurrences per receiver
    const counts: Record<string, number> = {};
    const recipientDetails: Record<string, any> = {};

    for (const tx of transactions) {
      if (tx.type === "transfer" && tx.sender_id === currentUserId && tx.receiver_id) {
        counts[tx.receiver_id] = (counts[tx.receiver_id] || 0) + 1;
        recipientDetails[tx.receiver_id] = {
          id: tx.receiver_id,
          initial: tx.receiver?.first_name?.[0] ?? "V",
          color: "bg-emerald-500",
          name: `${tx.receiver?.first_name ?? "Vault"} ${tx.receiver?.last_name ?? ""}`.trim(),
          tag: tx.receiver?.kyc_tag,
          avatarUrl: tx.receiver?.profile_photo_url,
        };
      }
    }

    // 2. Sort by count descending and take top 5
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => recipientDetails[id]);
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

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse font-medium">
            {t("common.loading_secure_vault")}
          </p>
        </div>
      </div>
    );
  }

  const getTransactionDetails = (tx: any) => {
    const isSender = tx.sender_id === (profile as any)?.id;
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

    const txCategory = (tx.category || "").toLowerCase();
    const CategoryIcon = categoryIcons[txCategory] || null;
    const categoryColorClass =
      categoryColors[txCategory] || "bg-primary/10 text-primary border-primary/20";

    // Method-specific logo helper - enhanced with all banks
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
      if (desc.includes("equity") || meth.includes("equity")) return "/logos/equity.svg";
      if (desc.includes("stripe") || meth.includes("stripe")) return "/logos/stripe.svg";

      // Fallback for generic bank method
      if (meth === "bank" || meth === "mpesa" || meth === "airtel") return "/logos/bank.svg";
      return null; // Fallback to initials
    };

    if (tx.type === "transfer") {
      if (tx.description === "Transferred to savings") {
        return {
          title: t("dashboard.ledger.transaction.savings"),
          amount: `-${symbol}${tx.amount.toLocaleString()}`,
          positive: false,
          icon: "S",
          logo: null,
          color: "bg-primary/20 text-primary",
        };
      }
      if (isSender) {
        // Check if this is a transfer to a mobile/bank service
        const desc = (tx.description || "").toLowerCase();
        const logo = getMethodLogo(tx.method || "", tx.description || "");
        const hasMobileOrBank = logo && desc.includes("transfer to");
        const isVaultTransfer = tx.method === "vault" || (tx.description || "").includes("Vault Transfer Ref:");

        let titleText = isVaultTransfer ? "P2P Transfer" : tx.description;
        if (!titleText) {
          const receiverName = tx.receiver?.first_name || t("common.user");
          titleText = t("transactions.history.transfer_to", { receiverName });
        }

        return {
          title: titleText,
          subtitle: tx.description,
          amount: `-${symbol}${tx.amount.toLocaleString()}`,
          positive: false,
          icon: hasMobileOrBank ? null : tx.receiver?.first_name?.[0] || "T",
          logo: hasMobileOrBank ? logo : tx.receiver?.profile_photo_url || null,
          avatarUrl: tx.receiver?.profile_photo_url || null,
          color: "bg-primary/20 text-primary",
          CategoryIcon,
          categoryColorClass,
        };
      } else {
<<<<<<< HEAD
        const senderName = tx.sender?.first_name || t("common.user");
        const isVaultTransfer = tx.method === "vault" || (tx.description || "").includes("Vault Transfer Ref:");
        const titleText = isVaultTransfer ? "P2P Transfer" : (tx.description || t("transactions.history.received_from", { senderName }));
        
=======
        let senderName = tx.sender?.first_name || t("common.user");
        const titleText = tx.description || t("transactions.history.received_from", { senderName });
>>>>>>> 64a7ebf35aaeb41fe4a449a1a3e8b2f63ede57ca
        return {
          title: titleText,
          subtitle: tx.description,
          amount: `+${symbol}${tx.amount.toLocaleString()}`,
          positive: true,
          icon: tx.sender?.first_name?.[0] || "R",
          logo: tx.sender?.profile_photo_url || null,
          avatarUrl: tx.sender?.profile_photo_url || null,
          color: "bg-emerald-500/20 text-emerald-500",
          CategoryIcon,
          categoryColorClass,
        };
      }
    } else if (tx.type === "deposit") {
      const logo = getMethodLogo(tx.method, tx.description);
      return {
        title: tx.description,
        amount: `+${symbol}${tx.amount.toLocaleString()}`,
        positive: true,
        icon: logo ? null : "D",
        logo: logo,
        color: "bg-emerald-500/20 text-emerald-500",
        CategoryIcon,
        categoryColorClass,
      };
    } else if (tx.type === "withdrawal") {
      const logo = getMethodLogo(tx.method, tx.description);
      return {
        title: tx.description,
        amount: `-${symbol}${tx.amount.toLocaleString()}`,
        positive: false,
        icon: logo ? null : "W",
        logo: logo,
        color: "bg-destructive/20 text-destructive",
        CategoryIcon,
        categoryColorClass,
      };
    }
    return {
      title: tx.description,
      amount: `${symbol}${tx.amount.toLocaleString()}`,
      positive: true,
      icon: "?",
      logo: null,
      color: "bg-secondary text-secondary-foreground",
      CategoryIcon,
      categoryColorClass,
    };
  };

  const currencySymbol = currency === "USD" ? "$" : currency + " ";

  return (
    <AppShell>
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {profile?.is_suspended && (
          <div className="mb-8 p-4 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-lg shadow-destructive/5 backdrop-blur-sm">
            <div className="w-14 h-14 rounded-2xl bg-destructive/20 flex items-center justify-center text-destructive shrink-0 shadow-inner ring-1 ring-destructive/30">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-bold text-destructive uppercase tracking-widest leading-none mb-1">
                Account Suspended
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                Your account is currently locked. Reason: {profile.suspended_reason || "Security concerns"}.
                You can self-restore your account in settings via email verification.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl h-10 px-6 font-bold uppercase tracking-wider text-[10px] transition-all active:scale-95"
              onClick={() => navigate({ to: "/settings" })}
            >
              Go to Settings
            </Button>
          </div>
        )}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white"
            suppressHydrationWarning
          >
            {t("dashboard.unified_portfolio")}
          </h1>
          <p
            className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium leading-relaxed"
            suppressHydrationWarning
          >
            {t("dashboard.portfolio_desc")}
          </p>
        </div>

        {/* AI Financial Insights Widget */}
        <AIInsightsWidget profileId={profile?.id} />

        {/* Warning Notifications */}
        {warningNotifications.length > 0 && (
          <div className="mb-8 space-y-3">
            {warningNotifications.map((n) => (
              <Alert
                key={n.id}
                variant="destructive"
                className="bg-destructive/10 border-destructive/30 rounded-2xl animate-in slide-in-from-top-4 duration-500"
              >
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
            {balanceError ? `${t("common.error")}: ${balanceError}` : null}
            {balanceError && txError ? " " : null}
            {txError ? `${t("common.error")}: ${txError}` : null}
          </div>
        )}

        {/* Total net worth */}
        <div className="group relative overflow-hidden rounded-3xl bg-card/40 border border-border/40 p-6 sm:p-8 mb-8 backdrop-blur-md transition-all hover:bg-card/50 hover:border-primary/20 shadow-lg">
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

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <div
                  className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80"
                  suppressHydrationWarning
                >
                  {t("dashboard.total_portfolio")}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-3">
                {balanceLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-lg text-muted-foreground font-light">
                      {t("dashboard.analyzing")}
                    </span>
                  </div>
                ) : balanceError ? (
                  <span className="text-3xl sm:text-4xl font-light text-destructive">
                    {t("common.error")}
                  </span>
                ) : (
                  <>
                    <span className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums">
                      {currencySymbol}
                      {balance?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-semibold">
                      <TrendingUp className="w-3 h-3" />+ 5.25%
                    </div>
                  </>
                )}
              </div>
              <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed font-medium">
                {portfolioSummary.loading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t("dashboard.analyzing_portfolio")}
                  </span>
                ) : (
                  portfolioSummary.message
                )}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button className="h-10 px-5 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all">
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> {t("dashboard.add_external")}
              </Button>
              <Button
                variant="outline"
                className="h-10 px-5 rounded-xl text-xs font-bold border-border/40 backdrop-blur-md hover:bg-muted/50 transition-all active:scale-95"
                onClick={() => setShowReport(true)}
              >
                {t("dashboard.detailed_report")}
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
              name={t("dashboard.vault_account_name")}
              type={t("dashboard.verified_account")}
              amount={
                balanceLoading
                  ? t("common.loading")
                  : balanceError
                    ? t("common.error")
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
                {t("dashboard.finance_credit")}
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
                <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight mb-1.5">
                  {t("dashboard.savings_loans")}
                </h3>
                <p className="text-sm text-muted-foreground/85 leading-relaxed">
                  {t("dashboard.savings_loans_desc")}
                </p>
              </div>
            </div>
          </Link>
          <QuickSend
            className="col-span-1"
            onAvatarClick={handleQuickSend}
            loading={txLoading && frequentRecipients.length === 0}
            avatars={frequentRecipients}
          />
          <div className="col-span-1">
            <NetWorthChart
              entries={balanceHistory.length > 0 ? balanceHistory : (ledgerEntries as any)}
              currencySymbol={currencySymbol}
              currentBalance={balance || 0}
            />
          </div>
        </div>

        {/* Recent Transactions Heading */}
        <div className="mb-4">
          <h2 className="text-lg font-light tracking-tight text-foreground/90">
            {t("dashboard.ledger.title")}
          </h2>
        </div>

        {/* Transactions list */}
        <div className="rounded-2xl bg-card/30 border border-border/40 p-4 sm:p-5 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    activeFilter === f.key
                      ? "border-primary text-primary"
                      : "border-border/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
            <button
              onClick={() => refetchTransactions()}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-primary transition-colors group/sync"
              disabled={txLoading}
            >
              <RefreshCw
                className={cn(
                  "w-3 h-3 transition-transform group-hover/sync:rotate-180 duration-500",
                  txLoading && "animate-spin",
                )}
              />
              {txLoading ? t("dashboard.syncing") : syncTime}
            </button>
          </div>

          <ul className="divide-y divide-border/40">
            {txLoading || ledgerLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("dashboard.no_transactions")}
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const details = getTransactionDetails(tx);

                // Trust the balance_after provided by the useTransactions hook
                // This value is already the 'Ultimate Truth' (combined DB snapshots + anchored calculation)
                const displayBalance = tx.balance_after || balance || 0;

                const typeLabel =
                  tx.type === "transfer"
                    ? t("dashboard.ledger.transaction.p2p")
                    : tx.type === "deposit"
                      ? t("dashboard.ledger.transaction.deposit").substring(0, 3).toUpperCase()
                      : tx.type === "withdrawal"
                        ? t("dashboard.ledger.transaction.withdraw").substring(0, 3).toUpperCase()
                        : tx.type.substring(0, 3).toUpperCase();

                return (
                  <li
                    key={tx.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3 group"
                  >
                    <div className="flex items-center gap-4">
<<<<<<< HEAD
                      <div className="relative shrink-0">
                        <Avatar className="w-10 h-10 border border-border/40 shadow-sm rounded-xl">
                          <AvatarImage
                            src={details.logo || (details as any).avatarUrl || undefined}
                            className="object-cover"
                          />
                          <AvatarFallback className={cn("text-xs font-bold rounded-xl", details.color)}>
                            {details.icon}
                          </AvatarFallback>
                        </Avatar>
                      </div>
=======
                      <span className="text-[10px] uppercase w-9 text-center text-muted-foreground shrink-0">
                        {typeLabel}
                      </span>
                      <Avatar className="w-9 h-9 border border-border/40 shrink-0">
                        <AvatarImage
                          src={details.logo || (details as any).avatarUrl || undefined}
                        />
                        <AvatarFallback className={cn("text-sm font-semibold", details.color)}>
                          {details.icon}
                        </AvatarFallback>
                      </Avatar>
>>>>>>> 64a7ebf35aaeb41fe4a449a1a3e8b2f63ede57ca
                      <div className="min-w-0">
                        <div className="text-sm truncate font-medium">{details.title}</div>
                        {(details as any).subtitle && (
                          <div className="text-[10px] text-primary/80 font-mono truncate">
                            {(details as any).subtitle}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground/60 mt-1 font-medium">
                          {format(new Date(tx.created_at), "EEEE, MMM d · h:mm a")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto ml-14 sm:ml-0">
                      <div
                        className={`text-sm font-medium ${details.positive ? "text-primary" : "text-destructive"}`}
                      >
                        {details.amount}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("dashboard.balance_label")} {currencySymbol}
                        {displayBalance.toLocaleString()}
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          {!txLoading && filteredTransactions.length > 0 && (
            <div className="mt-6 pt-2 flex justify-center border-t border-border/20">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-all group"
              >
                <Link to="/transactions">
                  {t("dashboard.view_all_transactions")}
                  <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
