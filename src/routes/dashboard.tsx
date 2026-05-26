import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { UserPlus, Lock as LockIcon, MoreVertical, Plus, Settings, HelpCircle, RefreshCw, ShieldCheck, Shield, Loader2, ArrowRight, TrendingUp, Landmark } from "lucide-react";
import { supabase } from "@/api/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppShell } from "@/components/app-shell";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { useTransactions, type Transaction } from "@/hooks/use-transactions";
import { useProfileSignal } from "@/lib/profile-signal";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
      {/* Decorative background element */}
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
          <div className="text-3xl font-semibold tracking-tight text-primary">
            {amount}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
            Available Balance
          </div>
        </div>

        {primary ? (
          <div className="mt-6 flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1 h-9 rounded-xl font-medium shadow-sm active:scale-95 transition-transform" asChild>
              <Link to="/transactions" search={{ mode: "send" }}>
                Send
              </Link>
            </Button>
            <Button size="sm" className="flex-1 h-9 rounded-xl font-medium shadow-md active:scale-95 transition-transform" asChild>
              <Link to="/transactions" search={{ mode: "deposit" }}>
                Deposit
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-9 rounded-xl font-medium border-border/60 hover:bg-muted/50 active:scale-95 transition-transform" asChild>
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
  title = "Quick Send (P2P)"
}: {
  avatars: { id?: string; initial: string; color: string; name: string }[];
  withAdd?: boolean;
  title?: string;
}) {
  return (
    <div className="rounded-2xl bg-card/40 border border-border/40 p-5 backdrop-blur-sm transition-all hover:border-border/60">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground/80">{title}</div>
        <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
      </div>
      <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide">
        {withAdd && (
          <button className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all">
            <Plus className="w-5 h-5" />
          </button>
        )}
        {avatars.map((a, index) => (
          <div key={a.id ?? `${a.name}-${index}`} className="flex flex-col items-center gap-2 group cursor-pointer flex-shrink-0">
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-full ${a.color} flex items-center justify-center text-white font-semibold shadow-lg transition-transform group-hover:scale-105 group-active:scale-95`}
              >
                {a.initial}
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card shadow-sm" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{a.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NetWorthChart() {
  return (
    <div className="rounded-2xl bg-card/40 border border-border/40 p-5 backdrop-blur-sm h-full flex flex-col transition-all hover:border-border/60">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground/80">Net Worth Growth</div>
        <TrendingUp className="w-3 h-3 text-emerald-500" />
      </div>
      <div className="relative flex-1 min-h-[100px] mt-2">
        <div className="absolute left-0 top-0 text-[10px] text-muted-foreground/40 font-mono">35K</div>
        <div className="absolute left-0 bottom-6 text-[10px] text-muted-foreground/40 font-mono">0</div>
        <svg
          viewBox="0 0 300 100"
          className="absolute inset-0 w-full h-full pr-2"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path
            d="M0,80 L40,70 L80,75 L120,55 L160,45 L200,35 L240,25 L300,10 L300,100 L0,100 Z"
            fill="url(#chartFill)"
          />
          <path
            d="M0,80 L40,70 L80,75 L120,55 L160,45 L200,35 L240,25 L300,10"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{ filter: "drop-shadow(0 0 4px var(--primary-foreground))" }}
          />
        </svg>
        <div className="absolute bottom-0 left-6 right-0 flex justify-between text-[10px] text-muted-foreground/60 font-medium pt-2 border-t border-border/10">
          <span>JAN</span>
          <span>FEB</span>
          <span>MAR</span>
          <span>APR</span>
        </div>
      </div>
    </div>
  );
}

function SecurityStatus() {
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
                <span className="text-xs text-muted-foreground/80 group-hover/item:text-foreground transition-colors">{item.label}</span>
                <span className="text-[10px] font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">{item.val}</span>
              </div>
              <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden">
                <div className="h-full bg-primary/40 rounded-full w-full group-hover:bg-primary/60 transition-all duration-700" />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <Button variant="ghost" size="sm" className="relative z-10 mt-8 w-full text-xs gap-2 h-9 rounded-xl border border-border/40 hover:bg-muted/50 hover:border-border transition-all">
        <Shield className="w-3 h-3" /> Security Settings
      </Button>
    </div>
  );
}

const filters = ["All", "Send", "Received", "Deposit", "Withdraw"];

function DashboardPage() {
  const { balance, currency, loading: balanceLoading, error: balanceError } = useWalletBalance();
  const { transactions, loading: txLoading, error: txError } = useTransactions(!balanceLoading);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showReport, setShowReport] = useState(false);
  const [profile] = useProfileSignal();

  const reportMetrics = useMemo(() => {
    if (!transactions.length) return null;

    const totalInflow = transactions.reduce((sum, tx) => {
      if (tx.type === "deposit") return sum + Number(tx.amount);
      if (tx.type === "transfer" && tx.receiver_id === (profile as any)?.id) return sum + Number(tx.amount);
      return sum;
    }, 0);

    const totalOutflow = transactions.reduce((sum, tx) => {
      if (tx.type === "withdrawal") return sum + Number(tx.amount);
      if (tx.type === "transfer" && tx.sender_id === (profile as any)?.id) return sum + Number(tx.amount);
      return sum;
    }, 0);

    return {
      totalInflow,
      totalOutflow,
      netChange: totalInflow - totalOutflow,
      count: transactions.length,
    };
  }, [transactions, profile]);

  const handleDownloadReport = () => {
    if (!transactions.length) return;

    const csvRows = [
      ["Date", "Type", "Amount", "Balance After", "Description"],
      ...transactions.map((tx) => [
        format(new Date(tx.created_at), "yyyy-MM-dd HH:mm:ss"),
        tx.type,
        tx.amount,
        tx.balance_after ?? "",
        tx.description ?? "",
      ]),
    ];

    const csvContent = csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vault-financial-report.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const frequentRecipients = useMemo(() => {
    const seenIds = new Set();
    const uniqueRecipients: { id: string; initial: string; color: string; name: string }[] = [];
    const currentUserId = (profile as any)?.id;

    if (!currentUserId) return [];

    for (const tx of transactions) {
      // Only care about transfers where the current user is the SENDER
      if (tx.type === "transfer" && tx.sender_id === currentUserId && tx.receiver && tx.receiver_id) {
        if (!seenIds.has(tx.receiver_id)) {
          seenIds.add(tx.receiver_id);
          uniqueRecipients.push({
            id: tx.receiver_id,
            initial: tx.receiver?.first_name?.[0] ?? "V",
            color: "bg-emerald-500",
            name: `${tx.receiver?.first_name ?? "Vault"} ${tx.receiver?.last_name ?? ""}`.trim(),
          });
        }
      }
      if (uniqueRecipients.length >= 4) break;
    }
    return uniqueRecipients;
  }, [transactions, profile]);

  const syncTime = useMemo(() => {
    if (txLoading) return "Syncing...";
    if (transactions.length === 0) return "Just now";
    const lastActivity = new Date(transactions[0].created_at);
    return `Data Synced ${formatDistanceToNow(lastActivity, { addSuffix: true })}`;
  }, [transactions, txLoading]);

  const filteredTransactions = useMemo(() => {
    if (activeFilter === "All") return transactions;
    if (activeFilter === "Send") return transactions.filter(t => t.type === 'transfer' && t.sender_id === (profile as any)?.id);
    if (activeFilter === "Received") return transactions.filter(t => 
      (t.type === 'transfer' && t.receiver_id === (profile as any)?.id) || 
      t.type === 'deposit'
    );
    if (activeFilter === "Deposit") return transactions.filter(t => t.type === 'deposit');
    if (activeFilter === "Withdraw") return transactions.filter(t => t.type === 'withdrawal');
    return transactions;
  }, [transactions, activeFilter, profile]);

  const getTransactionDetails = (t: any) => {
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
      return {
        title: `${bankName} to ${userName}`,
        amount: `+${symbol}${t.amount.toLocaleString()}`,
        positive: true,
        icon: initials,
        avatarUrl: null,
        color: "bg-emerald-500/20 text-emerald-500",
      };
    } else if (t.type === 'withdrawal') {
      const bankName = t.method === 'mpesa' ? 'M-Pesa' : (t.description?.includes('Ref:') ? 'Bank' : t.method);
      return {
        title: `Withdrawal to ${bankName}`,
        amount: `-${symbol}${t.amount.toLocaleString()}`,
        positive: false,
        icon: bankName.substring(0, 2).toUpperCase(),
        avatarUrl: null,
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
    <AppShell>
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Unified Portfolio Balance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Integrates a renew Accounts of multiple finance accounts.
          </p>
        </div>

        {(balanceError || txError) && (
          <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {balanceError ? `Balance error: ${balanceError}` : null}
            {balanceError && txError ? " " : null}
            {txError ? `Transaction error: ${txError}` : null}
          </div>
        )}

        {/* Total net worth */}
        <div className="group relative overflow-hidden rounded-3xl bg-card/40 border border-border/40 p-8 sm:p-10 mb-8 backdrop-blur-md transition-all hover:bg-card/50 hover:border-primary/20 shadow-xl">
          {/* Large decorative background pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--primary) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
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
                    <span className="text-xl text-muted-foreground font-light">Analyzing portfolio...</span>
                  </div>
                ) : balanceError ? (
                  <span className="text-5xl sm:text-6xl font-light text-destructive">Error</span>
                ) : (
                  <>
                    <span className="text-5xl sm:text-6xl font-bold tracking-tight">
                      {currencySymbol}{balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-semibold">
                      <TrendingUp className="w-3.5 h-3.5" />
                      + 5.25%
                    </div>
                  </>
                )}
              </div>
              <p className="mt-4 text-xs text-muted-foreground/60 max-w-sm leading-relaxed">
                Your portfolio is currently outperforming 84% of similar Vault accounts this month.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="h-12 px-6 rounded-2xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95">
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
        <Dialog open={showReport} onOpenChange={setShowReport}>
          <DialogContent className="sm:max-w-xl bg-card/95 backdrop-blur-2xl border-border/40">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Financial Health Report</DialogTitle>
              <DialogDescription>
                A comprehensive breakdown of your Vault OS ledger activity.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 space-y-6">
              {reportMetrics ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total Inflow</div>
                    <div className="text-xl font-semibold text-emerald-500">
                      +{currencySymbol}{reportMetrics.totalInflow.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total Outflow</div>
                    <div className="text-xl font-semibold text-destructive">
                      -{currencySymbol}{reportMetrics.totalOutflow.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Net Position</div>
                    <div className={cn(
                      "text-xl font-semibold",
                      reportMetrics.netChange >= 0 ? "text-primary" : "text-destructive"
                    )}>
                      {reportMetrics.netChange >= 0 ? '+' : ''}{currencySymbol}{reportMetrics.netChange.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Activity Volume</div>
                    <div className="text-xl font-semibold text-foreground">
                      {reportMetrics.count} <span className="text-xs font-normal text-muted-foreground">Transactions</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground italic">
                  No transaction history available to generate report.
                </div>
              )}

              <div className="rounded-2xl border border-border/40 bg-muted/30 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2">Ledger Insights</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your current balance of {currencySymbol}{balance?.toLocaleString()} is derived from {reportMetrics?.count || 0} cryptographically signed ledger entries. 
                  Vault OS maintains a zero-trust immutable record of every fractional change.
                </p>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button variant="ghost" onClick={() => setShowReport(false)} className="flex-1">
                Close
              </Button>
              <Button 
                onClick={handleDownloadReport} 
                disabled={!transactions.length}
                className="flex-1 gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Download CSV Statement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Accounts grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
              amount={balanceLoading ? "Loading..." : balanceError ? "Error" : `${currencySymbol}${balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </div>
          <div className="md:col-span-1">
            <SecurityStatus />
          </div>
        </div>

        {/* Quick actions + Finance Hub */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Link 
            to="/finance-hub"
            className="lg:col-span-2 group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 backdrop-blur-sm transition-all hover:bg-primary/20 hover:border-primary/40 shadow-lg"
          >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Finance & Credit</div>
              <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Savings & Loans</h3>
                <p className="text-xs text-muted-foreground">Unlock 2% rewards & instant credit</p>
              </div>
            </div>
          </Link>
          <QuickSend
            avatars={frequentRecipients.length > 0 ? frequentRecipients : [
              { initial: "M", color: "bg-emerald-500", name: "Maria C" },
              { initial: "J", color: "bg-blue-500", name: "John L" },
              { initial: "L", color: "bg-pink-500", name: "Lisa M" },
              { initial: "A", color: "bg-red-500", name: "Ben A" },
            ]}
          />
          <div className="hidden lg:block lg:col-span-1">
            <NetWorthChart />
          </div>
        </div>

        {/* Recent Transactions Heading */}
        <div className="mb-4">
          <h2 className="text-lg font-light tracking-tight text-foreground/90">Recent transactions</h2>
        </div>

        {/* Transactions */}
        <div className="rounded-2xl bg-card/30 border border-border/40 p-4 sm:p-5 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex flex-wrap gap-2">
              {filters.map((f, i) => (
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
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className={`w-3 h-3 ${txLoading ? 'animate-spin' : ''}`} /> {syncTime}
            </div>
          </div>

          <ul className="divide-y divide-border/40">
            {txLoading ? (
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
                return (
                  <li key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] uppercase w-9 text-center text-muted-foreground shrink-0">
                        {t.type === 'transfer' ? 'P2P' : t.type.substring(0, 3)}
                      </span>
                      <Avatar className="w-9 h-9 border border-border/40 shrink-0">
                        <AvatarImage src={details.avatarUrl} />
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
                        Balance: {currencySymbol}{t.balance_after?.toLocaleString() || balance?.toLocaleString()}
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
