import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Target,
  Wallet,
  History,
  AlertCircle,
  Lock as LockIcon,
  PiggyBank,
  Landmark,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

import { useSavings } from "@/hooks/use-savings";

export const Route = createFileRoute("/finance-hub")({
  component: FinanceHubPage,
});

function FinanceHubPage() {
  const { goals, loading } = useSavings();
  const savingsTab = !loading && goals.length > 0 ? "overview" : "setup";
  const buttonText = loading ? "Loading..." : goals.length > 0 ? "View Savings" : "Setup Savings";

  return (
    <AppShell>
      <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden">
        {/* Full-Bleed Background Image */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-fixed"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=2070&auto=format&fit=crop")',
            opacity: 0.35,
          }}
        />
        <div className="absolute inset-0 z-0 bg-slate-950/20" />

        <main className="relative z-10 max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-700">
          {/* Unified Finance Header */}
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <h1 className="text-3xl font-extrabold tracking-tight mb-2 drop-shadow-md text-slate-950 dark:text-white">
              Finance Hub
            </h1>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              Manage your long-term wealth and access instant liquidity. Vault's automated ledger
              rules ensure your growth is rewarded and credit is always available.
            </p>
          </div>

          {/* Unified Side-by-Side Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 items-stretch">
            {/* SAVINGS SECTION */}
            <div className="flex flex-col h-full rounded-2xl border border-white/20 bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl overflow-hidden shadow-xl transition-all group">
              <div className="h-32 w-full relative overflow-hidden bg-emerald-50/50 dark:bg-slate-950/50">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent z-10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center z-20">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-10 animate-pulse" />
                      <PiggyBank className="w-10 h-10 text-emerald-600 relative group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="mt-1.5 flex flex-col items-center">
                      <span className="text-emerald-700 dark:text-emerald-500 font-bold text-[9px] tracking-[0.3em] uppercase">
                        Wealth Vault
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h2 className="text-xl font-bold mb-3 text-slate-950 dark:text-white">
                  Target Savings
                </h2>
                <div className="space-y-4 flex-1">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    Set financial goals and enjoy a{" "}
                    <span className="text-primary font-semibold">2% interest reward</span> for
                    hitting your targets on time.
                  </p>
                  <ul className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Target, text: "Goal Deadlines" },
                      { icon: LockIcon, text: "Fund Locking" },
                      { icon: TrendingUp, text: "2% Reward" },
                      { icon: Wallet, text: "Auto Funding" },
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-[10px] font-semibold text-slate-800 dark:text-slate-200"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/10">
                          <item.icon className="w-3 h-3 text-primary" />
                        </div>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6">
                  <Button
                    size="sm"
                    asChild
                    className="w-full rounded-xl h-10 text-xs font-bold shadow-md bg-primary hover:bg-primary/90 transition-all active:scale-95"
                  >
                    <Link to="/savings" search={{ tab: savingsTab }}>
                      {buttonText} <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* LOANS SECTION */}
            <div className="flex flex-col h-full rounded-2xl border border-white/20 bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl overflow-hidden shadow-xl transition-all group">
              <div className="h-32 w-full bg-emerald-50/50 dark:bg-slate-950/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent z-10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center z-20">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-10 animate-pulse" />
                      <Landmark className="w-10 h-10 text-emerald-600 relative group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="mt-1.5 flex flex-col items-center">
                      <span className="text-emerald-700 dark:text-emerald-500 font-bold text-[9px] tracking-[0.3em] uppercase">
                        Credit Line
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h2 className="text-xl font-bold mb-3 text-slate-950 dark:text-white">
                  Instant Credit
                </h2>
                <div className="space-y-4 flex-1">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    Access credit limits up to{" "}
                    <span className="text-emerald-500 font-semibold">50% of your balance</span>. No
                    paperwork, instant disbursement based on history.
                  </p>
                  <ul className="grid grid-cols-2 gap-2">
                    {[
                      { icon: ShieldCheck, text: "Verified Eligibility" },
                      { icon: Wallet, text: "Instant Limits" },
                      { icon: TrendingUp, text: "Limit Growth" },
                      { icon: History, text: "Repayment Tracker" },
                    ].map((item, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-[10px] font-semibold text-slate-800 dark:text-slate-200"
                      >
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                          <item.icon className="w-3 h-3 text-emerald-600" />
                        </div>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6">
                  <Button
                    size="sm"
                    asChild
                    className="w-full rounded-xl h-10 text-xs font-bold shadow-md bg-emerald-600 text-white hover:bg-emerald-700 transition-all active:scale-95"
                  >
                    <Link to="/loans">
                      Request Credit <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Policies Section */}
          <div className="rounded-2xl border border-white/20 bg-white/90 dark:bg-slate-950/70 p-6 sm:p-8 backdrop-blur-xl shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">Core Policies</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Interest
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  2% bonus credited achieving targets on time. Verified by core engine.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Locking
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Funds cryptographically locked until deadline to protect discipline.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Lending
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Requires integrity verification. Strictly capped at 50% of frequent balance.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppShell>
  );
}
