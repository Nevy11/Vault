import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { UserPlus, Lock, MoreVertical, Plus, Settings, HelpCircle, RefreshCw, ShieldCheck, Shield, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppShell } from "@/components/app-shell";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { useTransactions } from "@/hooks/use-transactions";
import { useProfileSignal } from "@/lib/profile-signal";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
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
    <div className="rounded-2xl bg-card/60 border border-border/50 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-primary">
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium">{name}</div>
            <div className="text-xs text-muted-foreground">{type}</div>
          </div>
        </div>
        {primary ? (
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Lock className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="mt-4 text-3xl font-semibold text-primary">{amount}</div>
      {primary ? (
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" asChild>
            <Link to="/transactions" search={{ mode: "send" }}>
              Send
            </Link>
          </Button>
          <Button size="sm" className="flex-1" asChild>
            <Link to="/transactions" search={{ mode: "deposit" }}>
              Deposit
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to="/transactions" search={{ mode: "withdraw" }}>
              Withdraw
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 text-xs text-muted-foreground text-right">{updated}</div>
      )}
    </div>
  );
}

function QuickSend({
  avatars,
  withAdd,
}: {
  avatars: { initial: string; color: string; name: string }[];
  withAdd?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card/40 border border-border/40 p-4">
      <div className="text-sm text-muted-foreground mb-3">Quick Send (P2P)</div>
      <div className="flex items-center gap-4">
        {withAdd && (
          <button className="w-11 h-11 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
            <Plus className="w-4 h-4" />
          </button>
        )}
        {avatars.map((a) => (
          <div key={a.name} className="flex flex-col items-center gap-1">
            <div className="relative">
              <div
                className={`w-11 h-11 rounded-full ${a.color} flex items-center justify-center text-white font-medium`}
              >
                {a.initial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary border-2 border-card" />
            </div>
            <span className="text-xs text-muted-foreground">{a.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NetWorthChart() {
  return (
    <div className="rounded-2xl bg-card/40 border border-border/40 p-4">
      <div className="text-sm font-medium mb-3">Net Worth Over Time</div>
      <div className="relative h-28">
        <div className="absolute left-0 top-0 text-[10px] text-muted-foreground">35K</div>
        <div className="absolute left-0 bottom-4 text-[10px] text-muted-foreground">0</div>
        <svg
          viewBox="0 0 300 100"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.82 0.16 165)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="oklch(0.82 0.16 165)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,80 L40,70 L80,75 L120,55 L160,45 L200,35 L240,25 L300,10 L300,100 L0,100 Z"
            fill="url(#chartFill)"
          />
          <path
            d="M0,80 L40,70 L80,75 L120,55 L160,45 L200,35 L240,25 L300,10"
            stroke="oklch(0.82 0.16 165)"
            strokeWidth="2"
            fill="none"
          />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground px-6">
          <span>Jan</span>
          <span>Feb</span>
          <span>Mar</span>
          <span>Apr</span>
        </div>
      </div>
    </div>
  );
}

function SecurityStatus() {
  return (
    <div className="rounded-2xl bg-card/60 border border-border/50 p-5 backdrop-blur-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">Vault Security</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Encryption</span>
            <span className="text-xs font-mono text-primary">AES-256</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Privacy Mode</span>
            <span className="text-xs text-primary">Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Biometrics</span>
            <span className="text-xs text-primary">Verified</span>
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="mt-4 w-full text-xs gap-2">
        <Shield className="w-3 h-3" /> Manage Security
      </Button>
    </div>
  );
}

const filters = ["All", "Send", "Received", "Deposit", "Withdraw"];

function DashboardPage() {
  const { balance, currency, loading: balanceLoading, error: balanceError } = useWalletBalance();
  const { transactions, loading: txLoading, error: txError } = useTransactions();
  const [activeFilter, setActiveFilter] = useState("All");
  const [profile] = useProfileSignal();

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
    const userName = `${profile?.first_name} ${profile?.last_name}`;
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
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight">Unified Portfolio Balance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Integrates a renew Accounts of multiple finance accounts.
          </p>
        </div>

        {/* Total net worth */}
        <div className="rounded-2xl bg-card/30 border border-border/40 p-5 sm:p-6 mb-4 backdrop-blur-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Total Net Worth
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-3">
              {balanceLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : balanceError ? (
                <span className="text-4xl sm:text-5xl font-light text-destructive">Error</span>
              ) : (
                <>
                  <span className="text-4xl sm:text-5xl font-light">
                    {currencySymbol}{balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs w-fit px-2 py-1 rounded-full bg-primary/15 text-primary">
                    + 5.25%
                  </span>
                </>
              )}
            </div>
          </div>
          <Button className="gap-2 w-full sm:w-auto justify-center">
            <UserPlus className="w-4 h-4" /> Add External Account
          </Button>
        </div>

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

        {/* Quick send + chart */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <QuickSend
            avatars={[
              { initial: "M", color: "bg-emerald-500", name: "Maria C" },
              { initial: "J", color: "bg-blue-500", name: "John L" },
              { initial: "L", color: "bg-pink-500", name: "Lisa M" },
              { initial: "A", color: "bg-red-500", name: "Ben A" },
            ]}
          />
          <QuickSend
            withAdd
            avatars={[
              { initial: "M", color: "bg-emerald-500", name: "Maria C" },
              { initial: "J", color: "bg-blue-500", name: "John L" },
            ]}
          />
          <div className="sm:col-span-2 lg:col-span-1">
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
